import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { startInterview } from '@/lib/interviewManager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux membres du comité' }, { status: 403 });
    }

    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'ID d\'entretien manquant' }, { status: 400 });
    }

    const result = await startInterview(interviewId, session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Entretien démarré avec succès' });

  } catch (error) {
    console.error('Error starting interview:', error);
    return NextResponse.json(
      { error: 'Erreur lors du démarrage de l\'entretien' },
      { status: 500 }
    );
  }
}
