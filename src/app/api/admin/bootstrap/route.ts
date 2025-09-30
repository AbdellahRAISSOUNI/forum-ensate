import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { Admin } from '@/models/Admin';

// One-time bootstrap route to create an initial admin user.
// Protect by requiring a secret token in query (?token=...)

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');
        if (!token || token !== process.env.NEXTAUTH_SECRET) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const email = body.email ?? 'admin@forum-ensa.tet';
        const name = body.name ?? 'Administrator';
        const password = body.password ?? 'ChangeMe123!';

        await connectToDatabase();

        const exists = await Admin.findOne({ email });
        if (exists) {
            return NextResponse.json({ message: 'Admin already exists' }, { status: 409 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        await Admin.create({ email, name, passwordHash });

        return NextResponse.json({ ok: true, email });
    } catch (error) {
        return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
    }
}


