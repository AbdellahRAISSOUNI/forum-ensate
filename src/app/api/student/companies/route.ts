import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Company } from '@/models/Company';
import { Interview } from '@/models/Interview';
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'student') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux étudiants' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all active companies
    const companies = await Company.find({ isActive: true })
      .populate('room')
      .lean();

    // Get student's current interviews to check which companies are already selected
    const studentInterviews = await Interview.find({
      student: session.user.id,
      status: { $in: ['WAITING', 'IN_PROGRESS'] }
    }).lean();

    const selectedCompanyIds = studentInterviews.map(interview => 
      interview.company.toString()
    );

    // Process companies to add queue information
    const processedCompanies = await Promise.all(
      companies.map(async (company) => {
        // Calculate current queue length
        const queueLength = await Interview.countDocuments({
          company: company._id,
          status: { $in: ['WAITING', 'IN_PROGRESS'] }
        });

        const roomData = company.room && typeof company.room === 'object' && 'name' in company.room && 'location' in company.room ? {
          name: (company.room as unknown as { name: string; location: string }).name,
          location: (company.room as unknown as { name: string; location: string }).location
        } : null;

        return {
          _id: company._id,
          name: company.name,
          sector: company.sector,
          logo: company.logo,
          website: company.website,
          estimatedInterviewDuration: company.estimatedInterviewDuration || 30,
          room: roomData,
          queueLength,
          isSelected: selectedCompanyIds.includes(company._id.toString())
        };
      })
    );

    return NextResponse.json({ companies: processedCompanies });

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entreprises' },
      { status: 500 }
    );
  }
}
