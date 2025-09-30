import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, role } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'IDs des utilisateurs requis' }, { status: 400 });
    }

    if (!role || !['student', 'committee', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    await connectToDatabase();

    // Update multiple users
    const updateData: { role: string; isCommittee?: boolean } = { role };
    if (role === 'committee') {
      updateData.isCommittee = true;
    } else if (role === 'student') {
      updateData.isCommittee = false;
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );

    return NextResponse.json({
      message: `${result.modifiedCount} utilisateur(s) mis à jour avec succès`,
      modifiedCount: result.modifiedCount,
      totalRequested: userIds.length
    });

  } catch (error) {
    console.error('Error bulk updating user roles:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour en lot des rôles' },
      { status: 500 }
    );
  }
}
