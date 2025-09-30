import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Company } from '@/models/Company';
import { Room } from '@/models/Room';
import { Interview } from '@/models/Interview';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all companies with populated room data and interview counts
    const companies = await Company.find({})
      .populate('room', 'name location')
      .sort({ name: 1 })
      .lean();

    // Get interview counts for each company
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const totalInterviews = await Interview.countDocuments({ company: company._id });
        return {
          ...company,
          totalInterviews
        };
      })
    );

    return NextResponse.json({
      companies: companiesWithCounts
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entreprises' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { name, sector, website, estimatedInterviewDuration, roomId, isActive } = body;

    if (!name || !sector) {
      return NextResponse.json({ error: 'Nom et secteur sont requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if company name already exists
    const existingCompany = await Company.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCompany) {
      return NextResponse.json({ error: 'Une entreprise avec ce nom existe déjà' }, { status: 400 });
    }

    // Validate room if provided
    if (roomId) {
      const room = await Room.findById(roomId);
      if (!room) {
        return NextResponse.json({ error: 'Salle introuvable' }, { status: 400 });
      }

      // Check if room is already assigned to another active company
      const roomAssigned = await Company.findOne({ 
        room: roomId, 
        isActive: true,
        _id: { $ne: null }
      });
      if (roomAssigned) {
        return NextResponse.json({ 
          error: 'Cette salle est déjà assignée à une autre entreprise active' 
        }, { status: 400 });
      }
    }

    const companyData = {
      name: name.trim(),
      sector: sector.trim(),
      website: website?.trim() || undefined,
      estimatedInterviewDuration: Math.max(10, Math.min(120, estimatedInterviewDuration || 30)),
      room: roomId || undefined,
      isActive: isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const company = new Company(companyData);
    await company.save();

    // Populate the room data for response
    await company.populate('room', 'name location');

    return NextResponse.json({
      message: 'Entreprise créée avec succès',
      company
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entreprise' },
      { status: 500 }
    );
  }
}
