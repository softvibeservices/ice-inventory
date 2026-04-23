// src/app/api/activity-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activityLogger';
import { ActivityLogFilters } from '@/types/activityLog';
import { connectDB } from '@/lib/mongodb';
import { verifyUserRequest } from '@/lib/userAuth';

/**
 * GET /api/activity-logs
 * Fetch activity logs for admin (owner) panel.
 * Secured via JWT Bearer token — admin role only.
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // ── Auth: JWT verification (same pattern as all other routes) ──
    const auth = await verifyUserRequest(request);
    if (auth instanceof NextResponse) return auth; // 401 / 403 response

    // Only admin (shop owner) can view logs
    if (auth.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Build filters — shopId is always scoped to admin's own shop
    const filters: ActivityLogFilters = {
      shopId: auth.userId,                                              // Admin's own shop
      actionCategory: (searchParams.get('category') as any) || undefined,
      actionType: (searchParams.get('actionType') as any) || undefined,
      severity: (searchParams.get('severity') as any) || undefined,
      searchTerm: searchParams.get('search') || undefined,
    };

    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));

    const result = await getActivityLogs(filters, page, limit);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API] Activity logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}