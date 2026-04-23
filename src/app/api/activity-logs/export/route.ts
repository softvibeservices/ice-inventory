// src/app/api/activity-logs/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getActivityLogs } from '@/lib/activityLogger';
import { connectDB } from '@/lib/mongodb';
import { verifyUserRequest } from '@/lib/userAuth';

/**
 * GET /api/activity-logs/export
 * Export activity logs as CSV for admin's shop.
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

    // Parse optional date range from query params for filtered export
    const { searchParams } = new URL(request.url);
    const filters: any = { shopId: auth.userId };
    if (searchParams.get('startDate')) {
      filters.startDate = new Date(searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      filters.endDate = new Date(searchParams.get('endDate')!);
    }

    // Fetch all logs for this shop (high limit for export)
    const result = await getActivityLogs(filters, 1, 10000);

    // Build CSV
    const headers = [
      'Timestamp',
      'Date',
      'Time',
      'Actor Name',
      'Actor Role',
      'Action',
      'Category',
      'Severity',
      'Order #',
      'Customer',
      'Amount',
      'Details',
    ];

    const escape = (val: any): string => {
      if (val == null) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = result.logs.map((log) => {
      const d = log.details || {};
      const ts = new Date(log.timestamp);
      return [
        escape(ts.toISOString()),
        escape(ts.toLocaleDateString('en-IN')),
        escape(ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })),
        escape(log.actorName),
        escape(log.actorRole),
        escape(log.actionType.replace(/_/g, ' ')),
        escape(log.actionCategory),
        escape(log.severity),
        escape(d.serialNumber || d.billNumber || ''),
        escape(d.customerName || ''),
        escape(d.amount || d.totalAmount || d.settledAmount || d.orderAmount || ''),
        escape(JSON.stringify(d)),
      ].join(',');
    });

    const csv = [headers.map(escape).join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
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