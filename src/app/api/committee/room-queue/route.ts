import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRoomQueue } from '@/lib/interviewManager';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'committee') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux membres du comité' }, { status: 403 });
    }

    const result = await getRoomQueue(session.user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ room: result.room });

  } catch (error) {
    console.error('Error fetching room queue:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la file d\'attente' },
      { status: 500 }
    );
  }
}
