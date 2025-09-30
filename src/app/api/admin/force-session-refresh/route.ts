import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Simple in-memory store for session refresh tokens
// In production, you'd use Redis or another cache
const refreshTokens = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    // For now, we'll use a simple admin token check
    // In a real app, you'd check admin authentication here
    
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID manquant' }, { status: 400 });
    }

    await connectToDatabase();

    // Mark this user's session for refresh
    refreshTokens.set(userId, Date.now());

    return NextResponse.json({ 
      message: 'Session marquée pour rafraîchissement',
      userId 
    });

  } catch (error) {
    console.error('Error forcing session refresh:', error);
    return NextResponse.json(
      { error: 'Erreur lors du rafraîchissement de la session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ shouldRefresh: false });
  }

  const refreshTime = refreshTokens.get(userId);
  const shouldRefresh = refreshTime && Date.now() - refreshTime < 300000; // 5 minutes

  if (shouldRefresh) {
    // Clear the refresh token after use
    refreshTokens.delete(userId);
  }

  return NextResponse.json({ shouldRefresh: !!shouldRefresh });
}
