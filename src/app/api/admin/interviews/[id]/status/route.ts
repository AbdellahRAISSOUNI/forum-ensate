import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
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

    const { id: interviewId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    await connectToDatabase();

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return NextResponse.json({ error: 'Entretien introuvable' }, { status: 404 });
    }

    // Update interview status with appropriate timestamps
    interview.status = status;
    
    if (status === 'IN_PROGRESS' && !interview.startedAt) {
      interview.startedAt = new Date();
    } else if (status === 'COMPLETED' && !interview.completedAt) {
      interview.completedAt = new Date();
    } else if (status === 'WAITING') {
      // Reset timestamps if moving back to waiting
      interview.startedAt = undefined;
      interview.completedAt = undefined;
    }

    await interview.save();

    return NextResponse.json({
      message: 'Statut de l\'entretien mis à jour avec succès',
      interview: {
        id: interview._id,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt
      }
    });

  } catch (error) {
    console.error('Error updating interview status:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut' },
      { status: 500 }
    );
  }
}
