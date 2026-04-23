// src/app/components/ActivityLogCard.tsx
'use client';

import React from 'react';
import { ActivityActionType } from '@/types/activityLog';

interface ActivityLogCardProps {
  log: any;
}

// Map action types to colors and icons
const getActionStyle = (actionType: ActivityActionType, severity: string) => {
  const severityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  return severityColors[severity as keyof typeof severityColors] || severityColors.low;
};

const getActionIcon = (actionCategory: string) => {
  const icons = {
    inventory: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    sales: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    customer: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    delivery: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    finance: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return icons[actionCategory as keyof typeof icons] || icons.inventory;
};

const formatActionType = (actionType: string) => {
  return actionType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const ActivityLogCard: React.FC<ActivityLogCardProps> = ({ log }) => {
  const details = log.details || {};
  const actionStyle = getActionStyle(log.actionType, log.severity);

  const renderDetails = () => {
    switch (log.actionType) {
      case ActivityActionType.PRICE_CHANGED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p><span className="font-medium">{details.productName}</span></p>
            {details.oldSellingPrice && details.newSellingPrice && (
              <p>Price: ₹{details.oldSellingPrice} → ₹{details.newSellingPrice} ({details.priceChangePercent?.toFixed(1)}%)</p>
            )}
          </div>
        );

      case ActivityActionType.PRODUCT_DELETED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p><span className="font-medium">{details.productName}</span></p>
            <p>Last stock: {details.lastStock} | Price: ₹{details.lastSellingPrice}</p>
          </div>
        );

      case ActivityActionType.RESTOCK_ADDED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p><span className="font-medium">{details.productName}</span></p>
            <p>Added {details.addedQuantity} units ({details.previousStock} → {details.newStock})</p>
            {details.totalCost && <p>Cost: ₹{details.totalCost}</p>}
          </div>
        );

      case ActivityActionType.BILL_DISCARDED:
      case ActivityActionType.BILL_EDITED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p>Bill #{details.billNumber} - {details.customerName}</p>
            {details.oldAmount && details.newAmount && (
              <p>Amount: ₹{details.oldAmount} → ₹{details.newAmount}</p>
            )}
            {details.totalAmount && <p>Amount: ₹{details.totalAmount}</p>}
            {details.reason && <p className="text-gray-500 italic">{details.reason}</p>}
          </div>
        );

      case ActivityActionType.SETTLEMENT_COMPLETED:
      case ActivityActionType.DEBT_SETTLED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p>Order #{details.serialNumber} - {details.customerName}</p>
            <p>Amount: ₹{details.amount || details.settledAmount} via {details.paymentMethod?.toUpperCase()}</p>
            {details.daysInDebt && <p>Outstanding for {details.daysInDebt} days</p>}
          </div>
        );

      case ActivityActionType.DELIVERY_STATUS_CHANGED:
      case ActivityActionType.DELIVERY_REVERTED:
      case ActivityActionType.ORDER_STATUS_UPDATED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p>Order #{details.serialNumber} - {details.customerName}</p>
            {details.oldStatus && details.newStatus && (
              <p>Status: {details.oldStatus} → {details.newStatus}</p>
            )}
            <p>Amount: ₹{details.orderAmount}</p>
            {details.revertReason && <p className="text-red-600 italic">{details.revertReason}</p>}
          </div>
        );

      case ActivityActionType.CUSTOMER_DELETED:
        return (
          <div className="mt-2 text-sm text-gray-600">
            <p><span className="font-medium">{details.customerName}</span> ({details.phoneNumber})</p>
            <p>Outstanding debt: ₹{details.outstandingDebt} | Total orders: {details.totalOrders}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${actionStyle} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getActionIcon(log.actionCategory)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold">
                {formatActionType(log.actionType)}
              </h3>
              <span className={`px-2 py-0.5 text-xs rounded-full ${log.severity === 'critical' ? 'bg-red-200 text-red-800' :
                  log.severity === 'high' ? 'bg-orange-200 text-orange-800' :
                    log.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-blue-200 text-blue-800'
                }`}>
                {log.severity}
              </span>
            </div>

            {renderDetails()}

            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {log.actorName}
              </span>
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTimestamp(log.timestamp)}
              </span>
              <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs">
                {log.actionCategory}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogCard;