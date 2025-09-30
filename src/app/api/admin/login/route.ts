import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { Admin } from '@/models/Admin';

const SESSION_COOKIE = 'admin_session';
const SESSION_TTL_DAYS = 7;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body ?? {};

        if (!email || !password) {
            return NextResponse.json({ message: 'Email and password are required' }, { status: 400 });
        }

        await connectToDatabase();

        const admin = await Admin.findOne({ email }).lean();
        if (!admin) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) {
            return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
        }

        const cookieStore = await cookies();
        const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
        cookieStore.set(SESSION_COOKIE, String(admin._id), {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            expires,
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        return NextResponse.json({ message: 'Unexpected error' }, { status: 500 });
    }
}


