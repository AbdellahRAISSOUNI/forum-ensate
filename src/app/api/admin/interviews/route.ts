import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
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

    const interviews = await Interview.find({})
      .populate('student', 'name email status opportunityType')
      .populate({
        path: 'company',
        select: 'name sector',
        populate: {
          path: 'room',
          select: 'name location'
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      interviews: interviews.map(interview => {
        const company = interview.company as unknown as { _id: string; name: string; sector: string; room?: { _id: string; name: string; location: string } };
        return {
          _id: interview._id,
          student: interview.student,
          company: {
            _id: company._id,
            name: company.name,
            sector: company.sector
          },
          room: company.room || null,
          status: interview.status,
          queuePosition: interview.queuePosition,
          priority: interview.priority,
          scheduledTime: interview.scheduledTime,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
        };
      })
    });

  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entretiens' },
      { status: 500 }
    );
  }
}
