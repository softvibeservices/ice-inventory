// src/app/api/activity-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activityLogger';
import { connectDB } from '@/lib/mongodb';

/**
 * GET /api/activity-logs/export
 * Export activity logs as CSV
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
    
    // Get all logs for this shop (with high limit)
    const result = await getActivityLogs(
      { shopId: userId },
      1,
      10000 // Large limit for export
    );
    
    // Convert to CSV
    const csvRows = [
      // Header row
      [
        'Timestamp',
        'Business Date',
        'Actor Name',
        'Actor Role',
        'Action Type',
        'Category',
        'Severity',
        'Serial Number',
        'Customer Name',
        'Details'
      ].join(','),
      
      // Data rows
      ...result.logs.map(log => {
        const details = log.details || {};
        return [
          new Date(log.timestamp).toISOString(),
          new Date(log.businessDate).toLocaleDateString(),
          `"${log.actorName}"`,
          log.actorRole,
          log.actionType,
          log.actionCategory,
          log.severity,
          `"${details.serialNumber || 'N/A'}"`,
          `"${details.customerName || 'N/A'}"`,
          `"${JSON.stringify(details).replace(/"/g, '""')}"` // Escape quotes
        ].join(',');
      })
    ];
    
    const csv = csvRows.join('\n');
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="activity-logs-${Date.now()}.csv"`,
      },
    });
    
  } catch (error) {
    console.error('[API] Activity logs export error:', error);
    return NextResponse.json(
      { error: 'Failed to export logs' },
      { status: 500 }
    );
  }
}