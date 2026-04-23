// ice-inventory\src\app\components\ActivityStatsCards.tsx
'use client';

import { useState, useEffect } from 'react';
import { ActivityStats } from '@/types/activityLog';

interface ActivityStatsCardsProps {
  userId: string;
}

export default function ActivityStatsCards({ userId }: ActivityStatsCardsProps) {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/activity-logs/stats?days=${days}`, {
          headers: {
            'x-user-id': userId,
            'x-user-role': 'admin',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, days]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const severityColors = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-blue-600',
  };

  return (
    <div className="mb-6">
      {/* Time Range Selector */}
      <div className="flex justify-end mb-4">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Activities</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalLogs}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
          <p className="text-sm text-gray-600 mb-3">By Severity</p>
          <div className="space-y-2">
            {Object.entries(stats.bySeverity).map(([severity, count]) => (
              <div key={severity} className="flex justify-between items-center">
                <span className={`text-sm capitalize ${severityColors[severity as keyof typeof severityColors]}`}>
                  {severity}
                </span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-3">By Category</p>
          <div className="space-y-2">
            {Object.entries(stats.byCategory)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{category}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Top Actors */}
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-3">Most Active</p>
          <div className="space-y-2">
            {stats.topActors.slice(0, 3).map((actor, index) => (
              <div key={actor.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-gray-200 px-2 py-1 rounded">#{index + 1}</span>
                  <div className="truncate max-w-[120px]">
                    <p className="text-sm font-medium truncate">{actor.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{actor.role}</p>
                  </div>
                </div>
                <span className="font-semibold">{actor.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {stats.recentCritical && stats.recentCritical.length > 0 && (
        <div className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Critical Activities</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{stats.recentCritical.length} critical activities in the last {days} days</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}