// src/app/api/activity-logs/super-admin/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminStats } from '@/lib/activityLogger';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/activity-logs/super-admin/stats
 * Fetch platform-wide activity statistics for Super Admin
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get user from headers
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Super Admin access required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const stats = await getSuperAdminStats(days);
    
    return NextResponse.json(stats);
    
  } catch (error) {
    console.error('[API] Super Admin stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}