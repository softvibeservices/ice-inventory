// ice-inventory\src\app\components\ActivityFilters.tsx


'use client';

import { useState } from 'react';
import { ActivityLogFilters, ActivityCategory, ActivityActionType, Severity } from '@/types/activityLog';

interface ActivityFiltersProps {
  filters: ActivityLogFilters;
  onFiltersChange: (filters: ActivityLogFilters) => void;
}

export default function ActivityFilters({ filters, onFiltersChange }: ActivityFiltersProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: keyof ActivityLogFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    handleFilterChange('searchTerm', searchTerm);
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Filters</h2>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {showAdvanced ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Advanced
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Advanced
            </>
          )}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name or order serial number..."
            className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-3 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                handleFilterChange('searchTerm', '');
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={filters.actionCategory || ''}
            onChange={(e) => handleFilterChange('actionCategory', e.target.value as ActivityCategory)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="inventory">Inventory</option>
            <option value="sales">Sales</option>
            <option value="customer">Customer</option>
            <option value="delivery">Delivery</option>
            <option value="finance">Finance</option>
          </select>
        </div>

        {/* Severity Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
          <select
            value={filters.severity || ''}
            onChange={(e) => handleFilterChange('severity', e.target.value as Severity)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
          <input
            type="date"
            value={filters.startDate ? filters.startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
          <input
            type="date"
            value={filters.endDate ? filters.endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : null)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={filters.actionType || ''}
                onChange={(e) => handleFilterChange('actionType', e.target.value as ActivityActionType)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                <optgroup label="Inventory">
                  <option value="price_changed">Price Changed</option>
                  <option value="product_deleted">Product Deleted</option>
                  <option value="stock_emptied">Stock Emptied</option>
                  <option value="restock_added">Restock Added</option>
                </optgroup>
                <optgroup label="Customer">
                  <option value="customer_deleted">Customer Deleted</option>
                </optgroup>
                <optgroup label="Sales">
                  <option value="bill_discarded">Bill Discarded</option>
                  <option value="bill_edited">Bill Edited</option>
                </optgroup>
                <optgroup label="Finance">
                  <option value="settlement_completed">Settlement Completed</option>
                  <option value="debt_settled">Debt Settled</option>
                </optgroup>
                <optgroup label="Delivery">
                  <option value="delivery_status_changed">Delivery Status Changed</option>
                  <option value="delivery_reverted">Delivery Reverted</option>
                  <option value="order_status_updated">Order Status Updated</option>
                  <option value="sticky_note_created">Sticky Note Created</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All Filters
          </button>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.actionCategory && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
              Category: {filters.actionCategory}
              <button
                onClick={() => handleFilterChange('actionCategory', null)}
                className="ml-2 hover:text-blue-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.severity && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
              Severity: {filters.severity}
              <button
                onClick={() => handleFilterChange('severity', null)}
                className="ml-2 hover:text-orange-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.actionType && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
              Action: {filters.actionType.replace(/_/g, ' ')}
              <button
                onClick={() => handleFilterChange('actionType', null)}
                className="ml-2 hover:text-green-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.searchTerm && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
              Search: {filters.searchTerm}
              <button
                onClick={() => {
                  setSearchTerm('');
                  handleFilterChange('searchTerm', null);
                }}
                className="ml-2 hover:text-purple-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}