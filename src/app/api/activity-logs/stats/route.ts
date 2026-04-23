// src/app/api/activity-logs/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityStats } from '@/lib/activityLogger';
import { connectDB } from '@/lib/mongodb';
import { verifyUserRequest } from '@/lib/userAuth';

/**
 * GET /api/activity-logs/stats
 * Fetch activity statistics for admin dashboard.
 * Secured via JWT Bearer token — admin role only.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = await verifyUserRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '7')));

    const stats = await getActivityStats(auth.userId, days);

    return NextResponse.json(stats);

  } catch (error) {
    console.error('[API] Activity stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}