// src/app/api/activity-logs/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityStats } from '@/lib/activityLogger';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/activity-logs/stats
 * Fetch activity statistics for admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get user from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const stats = await getActivityStats(userId, days);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('[API] Activity stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}