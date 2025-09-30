import { NextRequest, NextResponse } from 'next/server';
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

    // Allow both student and committee to access their interviews
    if (!['student', 'committee'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès refusé - réservé aux étudiants et membres du comité' }, { status: 403 });
    }

    await connectToDatabase();

    const interviews = await Interview.find({ student: session.user.id })
      .populate({
        path: 'company',
        select: 'name sector logo',
        populate: {
          path: 'room',
          select: 'name location'
        }
      })
      .sort({ queuePosition: 1 })
      .lean();

    return NextResponse.json({
      interviews: interviews.map(interview => {
        const company = interview.company as unknown as { _id: string; name: string; sector: string; logo?: string; room?: { _id: string; name: string; location: string } };
        return {
          _id: interview._id,
          company: {
            _id: company._id,
            name: company.name,
            sector: company.sector,
            logo: company.logo
          },
          room: company.room || null,
          status: interview.status,
          queuePosition: interview.queuePosition,
          priority: interview.priority,
          scheduledTime: interview.scheduledTime,
          startedAt: interview.startedAt,
          completedAt: interview.completedAt,
          createdAt: interview.createdAt,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Allow both student and committee to modify their interviews
    if (!['student', 'committee'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Accès refusé - réservé aux étudiants et membres du comité' }, { status: 403 });
    }

    const body = await request.json();
    const { interviewId, action } = body;

    if (!interviewId || !action) {
      return NextResponse.json({ error: 'ID de l\'entretien et action requis' }, { status: 400 });
    }

    await connectToDatabase();

    const interview = await Interview.findOne({ 
      _id: interviewId, 
      student: session.user.id 
    });

    if (!interview) {
      return NextResponse.json({ error: 'Entretien introuvable' }, { status: 404 });
    }

    switch (action) {
      case 'cancel':
        if (interview.status !== 'WAITING') {
          return NextResponse.json({ error: 'Seuls les entretiens en attente peuvent être annulés' }, { status: 400 });
        }
        interview.status = 'CANCELLED';
        break;
      
      case 'reschedule':
        if (interview.status !== 'WAITING') {
          return NextResponse.json({ error: 'Seuls les entretiens en attente peuvent être reportés' }, { status: 400 });
        }
        // For now, just update the timestamp - could be enhanced with specific scheduling logic
        interview.updatedAt = new Date();
        break;
      
      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
    }

    await interview.save();

    return NextResponse.json({
      message: 'Entretien mis à jour avec succès',
      interview: {
        id: interview._id,
        status: interview.status,
        updatedAt: interview.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating interview:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'entretien' },
      { status: 500 }
    );
  }
}