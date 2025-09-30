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
      .sort({ createdAt: -1 })
      .lean();

    const data = interviews.map((i) => {
      const ii = i as unknown as {
        _id: string;
        status: string;
        queuePosition: number;
        priority: number;
        scheduledTime?: Date;
        startedAt?: Date;
        completedAt?: Date;
        company?: { _id: string; name: string; sector: string; estimatedInterviewDuration?: number };
      };
      return {
        _id: String(ii._id),
        status: ii.status,
        queuePosition: ii.queuePosition,
        priority: ii.priority,
        scheduledTime: ii.scheduledTime,
        startedAt: ii.startedAt,
        completedAt: ii.completedAt,
        company: ii.company ? {
          _id: String(ii.company._id),
          name: ii.company.name,
          sector: ii.company.sector,
          estimatedInterviewDuration: ii.company.estimatedInterviewDuration,
        } : null,
      };
    });

    return NextResponse.json({ interviews: data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch interviews' }, { status: 500 });
  }
}


