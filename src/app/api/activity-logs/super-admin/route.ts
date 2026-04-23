// src/app/api/activity-logs/super-admin/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activityLogger';
import { ActivityLogFilters } from '@/types/activityLog';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

/**
 * GET /api/activity-logs/super-admin
 * Fetch platform-wide activity logs for Super Admin
 * Requires super_admin role
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get user from headers (implement your auth middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only super_admin can access platform-wide logs
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: ActivityLogFilters = {
      shopId: searchParams.get('shopId') || undefined,
      actorId: searchParams.get('actorId') || undefined,
      actionCategory: searchParams.get('category') as any || undefined,
      actionType: searchParams.get('actionType') as any || undefined,
      severity: searchParams.get('severity') as any || undefined,
      searchTerm: searchParams.get('search') || undefined,
    };
    
    // Date range
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const result = await getActivityLogs(filters, page, limit);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API] Super Admin activity logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}