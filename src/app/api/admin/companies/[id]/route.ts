import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Company } from '@/models/Company';
import { Room } from '@/models/Room';
import { Interview } from '@/models/Interview';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: companyId } = await params;

    if (!name || !sector) {
      return NextResponse.json({ error: 'Nom et secteur sont requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    // Check if company name already exists (excluding current company)
    const existingCompany = await Company.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: companyId }
    });
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
        _id: { $ne: companyId }
      });
      if (roomAssigned) {
        return NextResponse.json({ 
          error: 'Cette salle est déjà assignée à une autre entreprise active' 
        }, { status: 400 });
      }
    }

    // Update company
    const updateData = {
      name: name.trim(),
      sector: sector.trim(),
      website: website?.trim() || undefined,
      estimatedInterviewDuration: Math.max(10, Math.min(120, estimatedInterviewDuration || 30)),
      room: roomId || undefined,
      isActive: isActive !== false,
      updatedAt: new Date()
    };

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      updateData,
      { new: true }
    ).populate('room', 'name location');

    return NextResponse.json({
      message: 'Entreprise mise à jour avec succès',
      company: updatedCompany
    });

  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entreprise' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    const { id: companyId } = await params;

    await connectToDatabase();

    // Check if company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    // Check if company has active interviews
    const activeInterviews = await Interview.countDocuments({
      company: companyId,
      status: { $in: ['WAITING', 'IN_PROGRESS'] }
    });

    if (activeInterviews > 0) {
      return NextResponse.json({ 
        error: 'Impossible de supprimer une entreprise avec des entretiens actifs' 
      }, { status: 400 });
    }

    // Delete the company
    await Company.findByIdAndDelete(companyId);

    return NextResponse.json({
      message: 'Entreprise supprimée avec succès'
    });

  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'entreprise' },
      { status: 500 }
    );
  }
}
