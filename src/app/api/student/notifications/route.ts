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

    // Upcoming interviews where position <= 3
    const upcoming = await Interview.find({
      student: session.user.id,
      status: { $in: ['WAITING','IN_PROGRESS'] },
      queuePosition: { $gt: 0, $lte: 4 }
    })
      .populate('company')
      .lean();

    const upcomingPayload = upcoming.map((i) => {
      const ii = i as unknown as {
        _id: string;
        queuePosition: number;
        status: string;
        company?: { name?: string; room?: { name?: string; location?: string } };
      };
      return {
        interviewId: String(ii._id),
        companyName: ii.company?.name || '',
        queuePosition: ii.queuePosition,
        room: ii.company?.room || null,
        status: ii.status,
      };
    });

    // For simplicity, status changes since last check not persisted; extend in future
    const statusChanges: unknown[] = [];

    // Marks could be set here if you add a Notification model; omitted per brief
    return NextResponse.json({ upcoming: upcomingPayload, statusChanges });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}


