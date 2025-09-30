import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/mongodb';
import { User, StudentStatus, OpportunityType } from '@/models/User';

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  status: z.enum(['ENSA', 'EXTERNE'] as const).optional(),
  opportunityType: z.enum(['PFA', 'PFE', 'STAGE_OBSERVATION', 'EMPLOI'] as const).optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.format();
      return NextResponse.json({ errors }, { status: 400 });
    }
    
    const { name, email, password, status, opportunityType } = result.data;
    
    await connectToDatabase();
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cette adresse e-mail existe déjà' },
        { status: 409 }
      );
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'student', // Default role
      status,
      opportunityType,
      isCommittee: false, // Default value
    });
    
    // Return success without sensitive data
    return NextResponse.json({
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'inscription' },
      { status: 500 }
    );
  }
}

