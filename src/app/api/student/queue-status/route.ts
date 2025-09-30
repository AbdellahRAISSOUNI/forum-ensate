import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Interview } from '@/models/Interview';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectToDatabase();

    const interviews = await Interview.find({ student: session.user.id })
      .populate('company')
      .lean();

    const positions = interviews
      .filter((i) => {
        const ii = i as unknown as { status: string };
        return ['WAITING','IN_PROGRESS'].includes(ii.status);
      })
      .map((i) => {
        const ii = i as unknown as {
          _id: string;
          status: string;
          queuePosition: number;
          company?: { _id?: string; name?: string };
        };
        return {
          interviewId: String(ii._id),
          companyId: String(ii.company?._id || ''),
          companyName: ii.company?.name || '',
          status: ii.status,
          queuePosition: ii.queuePosition,
        };
      });

    return NextResponse.json({ positions });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}


