import { useState } from 'react';
import type { CourseFilters, CourseField } from '@ceu/types';

interface FilterBarProps {
  filters: CourseFilters;
  onFiltersChange: (filters: CourseFilters) => void;
}

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [search, setSearch] = useState(filters.search || '');

  const fields: CourseField[] = [
    'mental_health',
    'nursing',
    'psychology',
    'counseling',
    'social_work',
    'other',
  ];

  const handleSearch = (value: string) => {
    setSearch(value);
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleFieldChange = (field: CourseField | '') => {
    onFiltersChange({ ...filters, field: field || undefined });
  };

  const handleCategoryChange = (category: string) => {
    onFiltersChange({ ...filters, category: category || undefined });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Field
          </label>
          <select
            value={filters.field || ''}
            onChange={(e) => handleFieldChange(e.target.value as CourseField | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Fields</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <input
            type="text"
            value={filters.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value)}
            placeholder="Filter by category..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
