import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Room } from '@/models/Room';

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
    const { memberIds, roomId } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: 'IDs des membres requis' }, { status: 400 });
    }

    if (!roomId) {
      return NextResponse.json({ error: 'ID de la salle requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Validate room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Salle introuvable' }, { status: 404 });
    }

    // Validate all members exist and are committee members
    const members = await User.find({
      _id: { $in: memberIds },
      role: 'committee'
    });

    if (members.length !== memberIds.length) {
      return NextResponse.json({ 
        error: 'Certains membres sont introuvables ou ne sont pas membres du comité' 
      }, { status: 400 });
    }

    // Add room to each member's assigned rooms (if not already assigned)
    const updateResults = await Promise.all(
      memberIds.map(async (memberId: string) => {
        const user = await User.findById(memberId);
        if (user) {
          const assignedRooms = user.assignedRooms || [];
          if (!assignedRooms.includes(roomId)) {
            user.assignedRooms = [...assignedRooms, roomId];
            user.updatedAt = new Date();
            await user.save();
            return true;
          }
        }
        return false;
      })
    );

    // Add members to room's committee members (if not already assigned)
    const currentCommitteeMembers = room.committeeMembers || [];
    const newCommitteeMembers = memberIds.filter(
      (memberId: string) => !currentCommitteeMembers.some(
        (existingId: unknown) => (existingId as { toString(): string }).toString() === memberId
      )
    );

    if (newCommitteeMembers.length > 0) {
      room.committeeMembers = [...currentCommitteeMembers, ...newCommitteeMembers];
      room.updatedAt = new Date();
      await room.save();
    }

    const assignedCount = updateResults.filter(Boolean).length;

    return NextResponse.json({
      message: `${assignedCount} membre(s) assigné(s) à la salle ${room.name}`,
      assignedCount,
      totalRequested: memberIds.length
    });

  } catch (error) {
    console.error('Error assigning room to committee members:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'assignation de la salle' },
      { status: 500 }
    );
  }
}
