import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole, StudentStatus } from '@/models/User';

const SESSION_COOKIE = 'admin_session';

// Middleware to check admin authentication
async function checkAdminAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  
  if (!session?.value) {
    return false;
  }
  
  return true;
}

interface QueryParams {
  role?: UserRole;
  status?: StudentStatus;
}

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const isAuth = await checkAdminAuth();
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Support pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const query: QueryParams = {};
    const role = searchParams.get('role') as UserRole | null;
    if (role) query.role = role;
    
    const status = searchParams.get('status') as StudentStatus | null;
    if (status) query.status = status;
    
    // Get users with pagination
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const total = await User.countDocuments(query);
    
    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/users/:id/toggle-committee - Toggle committee status
export async function POST(request: NextRequest) {
  try {
    const isAuth = await checkAdminAuth();
    if (!isAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'toggle-committee') {
      const body = await request.json();
      const { userId } = body;
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }
      
      await connectToDatabase();
      
      const user = await User.findById(userId);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Toggle committee status
      user.isCommittee = !user.isCommittee;
      
      // If making a committee member, ensure role is committee
      if (user.isCommittee) {
        user.role = 'committee';
      }
      
      await user.save();
      
      return NextResponse.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isCommittee: user.isCommittee,
        },
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}