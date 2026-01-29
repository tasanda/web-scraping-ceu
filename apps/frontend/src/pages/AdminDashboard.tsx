import { useState } from 'react';
import { useAdminStats } from '../hooks/useAdminQueries';
import CourseManager from '../components/admin/CourseManager';
import ProviderManager from '../components/admin/ProviderManager';
import UserManager from '../components/admin/UserManager';
import ManualCourseReview from '../components/admin/ManualCourseReview';

type TabType = 'overview' | 'courses' | 'providers' | 'users' | 'reviews';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'courses', label: 'Courses' },
    { id: 'providers', label: 'Providers' },
    { id: 'users', label: 'Users' },
    { id: 'reviews', label: 'Manual Reviews' },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage courses, providers, users, and compliance records
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'reviews' && stats?.pendingReviews ? (
                <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                  {stats.pendingReviews}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          {statsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading stats...</p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon={
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Total Courses"
                value={stats.totalCourses}
                icon={
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                }
              />
              <StatCard
                title="Providers"
                value={stats.totalProviders}
                icon={
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
              <StatCard
                title="Pending Reviews"
                value={stats.pendingReviews}
                icon={
                  <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
                highlight={stats.pendingReviews > 0}
              />
              <StatCard
                title="Compliant Users"
                value={stats.compliantUsers}
                subtitle={`${stats.totalUsers > 0 ? Math.round((stats.compliantUsers / stats.totalUsers) * 100) : 0}% of total`}
                icon={
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Non-Compliant Users"
                value={stats.nonCompliantUsers}
                subtitle={`${stats.totalUsers > 0 ? Math.round((stats.nonCompliantUsers / stats.totalUsers) * 100) : 0}% of total`}
                icon={
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                highlight={stats.nonCompliantUsers > 0}
              />
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('courses')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">Manage Courses</h3>
                <p className="text-sm text-gray-500 mt-1">Edit or delete courses</p>
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">Manage Providers</h3>
                <p className="text-sm text-gray-500 mt-1">Add or edit CEU providers</p>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">View Users</h3>
                <p className="text-sm text-gray-500 mt-1">User compliance status</p>
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <h3 className="font-medium text-gray-900">Review Courses</h3>
                <p className="text-sm text-gray-500 mt-1">Manually added courses</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'courses' && <CourseManager />}
      {activeTab === 'providers' && <ProviderManager />}
      {activeTab === 'users' && <UserManager />}
      {activeTab === 'reviews' && <ManualCourseReview />}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ title, value, subtitle, icon, highlight }: StatCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {icon}
      </div>
    </div>
  );
}
