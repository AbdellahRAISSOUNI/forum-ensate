import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Room } from '@/models/Room';
import { Company } from '@/models/Company';
import { User } from '@/models/User';
import { Interview } from '@/models/Interview';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (!['admin', 'committee'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    await connectToDatabase();

    // Get all rooms with associated data
    const rooms = await Room.find({})
      .populate('company', 'name sector')
      .populate('committeeMembers', 'name email')
      .sort({ name: 1 })
      .lean();

    // Check current status for each room
    const roomsWithStatus = await Promise.all(
      rooms.map(async (room) => {
        const currentInterview = await Interview.findOne({
          status: 'IN_PROGRESS'
        }).populate('company', '_id');

        const isOccupied = currentInterview && 
          room.company && 
          currentInterview.company && 
          (currentInterview.company as unknown as { _id: string })._id.toString() === (room.company as unknown as { _id: string })._id.toString();

        return {
          ...room,
          currentStatus: isOccupied ? 'occupied' : 'free'
        };
      })
    );

    return NextResponse.json({
      rooms: roomsWithStatus
    });

  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des salles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - réservé aux administrateurs' }, { status: 403 });
    }

    const body = await request.json();
    const { name, location, capacity, assignedCompanyId, committeeMembers } = body;

    if (!name || !location) {
      return NextResponse.json({ error: 'Nom et emplacement sont requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if room name already exists
    const existingRoom = await Room.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingRoom) {
      return NextResponse.json({ error: 'Une salle avec ce nom existe déjà' }, { status: 400 });
    }

    // Validate company if provided
    if (assignedCompanyId) {
      const company = await Company.findById(assignedCompanyId);
      if (!company) {
        return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 400 });
      }

      // Check if company is already assigned to another room
      const companyAssigned = await Room.findOne({ company: assignedCompanyId });
      if (companyAssigned) {
        return NextResponse.json({ 
          error: 'Cette entreprise est déjà assignée à une autre salle' 
        }, { status: 400 });
      }
    }

    // Validate committee members if provided
    if (committeeMembers && committeeMembers.length > 0) {
      const members = await User.find({
        _id: { $in: committeeMembers },
        role: 'committee'
      });
      if (members.length !== committeeMembers.length) {
        return NextResponse.json({ 
          error: 'Certains membres du comité sont introuvables' 
        }, { status: 400 });
      }
    }

    const roomData = {
      name: name.trim(),
      location: location.trim(),
      capacity: capacity || 10,
      company: assignedCompanyId || undefined,
      committeeMembers: committeeMembers || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const room = new Room(roomData);
    await room.save();

    // Update company's room reference if assigned
    if (assignedCompanyId) {
      await Company.findByIdAndUpdate(assignedCompanyId, { room: room._id });
    }

    // Sync committee members -> user.assignedRooms
    if (room.committeeMembers && room.committeeMembers.length > 0) {
      await User.updateMany(
        { _id: { $in: room.committeeMembers } },
        { $addToSet: { assignedRooms: room._id } }
      );
    }

    // Populate the data for response
    await room.populate('company', 'name sector');
    await room.populate('committeeMembers', 'name email');

    return NextResponse.json({
      message: 'Salle créée avec succès',
      room
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la salle' },
      { status: 500 }
    );
  }
}

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
    const { roomId, name, location, capacity, assignedCompanyId, committeeMembers } = body;

    if (!roomId || !name || !location) {
      return NextResponse.json({ error: 'ID de salle, nom et emplacement sont requis' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return NextResponse.json({ error: 'Salle introuvable' }, { status: 404 });
    }

    // Check if room name already exists (excluding current room)
    const existingRoom = await Room.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: roomId }
    });
    if (existingRoom) {
      return NextResponse.json({ error: 'Une salle avec ce nom existe déjà' }, { status: 400 });
    }

    // Handle company assignment changes
    const oldCompanyId = room.company?.toString();
    if (oldCompanyId !== assignedCompanyId) {
      // Remove room reference from old company
      if (oldCompanyId) {
        await Company.findByIdAndUpdate(oldCompanyId, { $unset: { room: 1 } });
      }

      // Validate new company if provided
      if (assignedCompanyId) {
        const company = await Company.findById(assignedCompanyId);
        if (!company) {
          return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 400 });
        }

        // Check if company is already assigned to another room
        const companyAssigned = await Room.findOne({ 
          company: assignedCompanyId,
          _id: { $ne: roomId }
        });
        if (companyAssigned) {
          return NextResponse.json({ 
            error: 'Cette entreprise est déjà assignée à une autre salle' 
          }, { status: 400 });
        }

        // Assign room to new company
        await Company.findByIdAndUpdate(assignedCompanyId, { room: roomId });
      }
    }

    // Validate committee members if provided
    if (committeeMembers && committeeMembers.length > 0) {
      const members = await User.find({
        _id: { $in: committeeMembers },
        role: 'committee'
      });
      if (members.length !== committeeMembers.length) {
        return NextResponse.json({ 
          error: 'Certains membres du comité sont introuvables' 
        }, { status: 400 });
      }
    }

    // Capture old committee members before update for sync
    const previousCommitteeMembers = (room.committeeMembers || []).map(id => id.toString());

    // Update room
    const updateData = {
      name: name.trim(),
      location: location.trim(),
      capacity: capacity || 10,
      company: assignedCompanyId || undefined,
      committeeMembers: committeeMembers || [],
      updatedAt: new Date()
    };

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      updateData,
      { new: true }
    )
    .populate('assignedCompany', 'name sector')
    .populate('committeeMembers', 'name email');

    // Sync users.assignedRooms according to changes
    if (updatedRoom) {
      const newCommitteeMembers = (updatedRoom.committeeMembers || []).map((m: unknown) => (m as { _id?: unknown })._id ? ((m as { _id: { toString(): string } })._id.toString()) : (m as { toString(): string }).toString());

      const addedMembers = newCommitteeMembers.filter(id => !previousCommitteeMembers.includes(id));
      const removedMembers = previousCommitteeMembers.filter(id => !newCommitteeMembers.includes(id));

      if (addedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: addedMembers } },
          { $addToSet: { assignedRooms: updatedRoom._id } }
        );
      }

      if (removedMembers.length > 0) {
        await User.updateMany(
          { _id: { $in: removedMembers } },
          { $pull: { assignedRooms: updatedRoom._id } }
        );
      }
    }

    return NextResponse.json({
      message: 'Salle mise à jour avec succès',
      room: updatedRoom
    });

  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la salle' },
      { status: 500 }
    );
  }
}
