import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Room } from '@/models/Room';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

interface ImportMember {
  name: string;
  email: string;
  assignedRoomIds?: string[];
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
    const { members }: { members: ImportMember[] } = body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: 'Données membres requises' }, { status: 400 });
    }

    await connectToDatabase();

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    };

    for (const memberData of members) {
      try {
        const { name, email, assignedRoomIds } = memberData;

        // Validate required fields
        if (!name?.trim() || !email?.trim()) {
          results.errors.push(`Nom et email requis pour ${email || 'membre inconnu'}`);
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          results.errors.push(`Format d'email invalide: ${email}`);
          continue;
        }

        // Validate rooms if provided
        let validatedRoomIds: string[] = [];
        if (assignedRoomIds && assignedRoomIds.length > 0) {
          const rooms = await Room.find({ _id: { $in: assignedRoomIds } });
          validatedRoomIds = rooms.map(room => (room._id as { toString(): string }).toString());
          
          if (validatedRoomIds.length !== assignedRoomIds.length) {
            results.errors.push(`Certaines salles assignées sont introuvables pour ${email}`);
          }
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
          // Update existing user to committee role
          existingUser.role = 'committee';
          existingUser.name = name.trim();
          existingUser.isCommittee = true;
          existingUser.assignedRooms = validatedRoomIds.map(id => new mongoose.Types.ObjectId(id));
          existingUser.updatedAt = new Date();
          
          await existingUser.save();
          
          // Update room assignments
          if (validatedRoomIds.length > 0) {
            await Room.updateMany(
              { _id: { $in: validatedRoomIds } },
              { $addToSet: { committeeMembers: existingUser._id } }
            );
          }
          
          results.updated++;
        } else {
          // Generate a temporary password (user should change it)
          const tempPassword = 'Forum2024!';
          const hashedPassword = await bcrypt.hash(tempPassword, 10);

          // Create new committee member
          const newUser = new User({
            name: name.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'committee',
            status: 'ENSA', // Default status
            opportunityType: 'PFA', // Default opportunity type
            isCommittee: true,
            assignedRooms: validatedRoomIds.map(id => new mongoose.Types.ObjectId(id)),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });

          await newUser.save();

          // Update room assignments
          if (validatedRoomIds.length > 0) {
            await Room.updateMany(
              { _id: { $in: validatedRoomIds } },
              { $addToSet: { committeeMembers: newUser._id } }
            );
          }

          results.created++;
        }

      } catch (memberError) {
        console.error(`Error processing member ${memberData.email}:`, memberError);
        results.errors.push(`Erreur lors du traitement de ${memberData.email || 'membre'}`);
      }
    }

    let message = '';
    if (results.created > 0) {
      message += `${results.created} membre(s) créé(s). `;
    }
    if (results.updated > 0) {
      message += `${results.updated} membre(s) mis à jour. `;
    }
    if (results.errors.length > 0) {
      message += `${results.errors.length} erreur(s).`;
    }

    return NextResponse.json({
      message: message.trim(),
      results
    }, { status: 201 });

  } catch (error) {
    console.error('Error importing committee members:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'importation des membres du comité' },
      { status: 500 }
    );
  }
}
