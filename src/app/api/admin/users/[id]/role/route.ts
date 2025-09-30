import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Admin } from '@/models/Admin';

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

    const { id: userId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !['student', 'committee', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user exists in User model
    const user = await User.findById(userId);
    if (user) {
      // Update role in User model
      user.role = role;
      if (role === 'committee') {
        user.isCommittee = true;
      } else if (role === 'student') {
        user.isCommittee = false;
      }
      await user.save();

      return NextResponse.json({
        message: 'Rôle mis à jour avec succès',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // Check if user exists in Admin model
    const admin = await Admin.findById(userId);
    if (admin) {
      // Cannot change admin role through this endpoint for security
      return NextResponse.json({ 
        error: 'Impossible de modifier le rôle d\'un administrateur via cette interface' 
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du rôle' },
      { status: 500 }
    );
  }
}
