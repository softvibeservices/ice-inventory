// src/app/api/activity-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activityLogger';
import { ActivityLogFilters } from '@/types/activityLog';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

/**
 * GET /api/activity-logs
 * Fetch activity logs for admin panel
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get user from headers (you'll need to implement your auth middleware)
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!userId || !userRole) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only admin (owner) can access their shop's activity logs
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Parse filters
    const filters: ActivityLogFilters = {
      shopId: userId, // Admin's shop only
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
    console.error('[API] Activity logs fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}