import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminUsers, useUpdateCompliance } from '../../hooks/useAdminQueries';
import type { AdminUserView, AdminComplianceUpdate, ComplianceStatus } from '@ceu/types';

const COMPLIANCE_STATUSES: ComplianceStatus[] = ['compliant', 'non_compliant', 'in_progress'];

export default function UserManager() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingCompliance, setEditingCompliance] = useState<{
    user: AdminUserView;
    year: number;
  } | null>(null);

  const { data, isLoading } = useAdminUsers(page, 20, search || undefined);
  const updateCompliance = useUpdateCompliance();

  const currentYear = new Date().getFullYear();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleUpdateCompliance = async (
    userId: string,
    year: number,
    input: AdminComplianceUpdate
  ) => {
    try {
      await updateCompliance.mutateAsync({ userId, year, input });
      toast.success('Compliance updated');
      setEditingCompliance(null);
    } catch {
      toast.error('Failed to update compliance');
    }
  };

  const getComplianceColor = (status?: ComplianceStatus) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'non_compliant':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email or license number..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Loading users...</p>
          </div>
        ) : data && data.users.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profession
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {currentYear} Compliance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{user.email}</div>
                        {user.licenseNumber && (
                          <div className="text-sm text-gray-500">License: {user.licenseNumber}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                        {user.profession?.replace('_', ' ') || 'Not set'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{user.tracking?.total || 0} total</div>
                        <div className="text-xs text-gray-500">
                          {user.tracking?.completed || 0} completed, {user.tracking?.inProgress || 0} in progress
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getComplianceColor(
                            user.compliance?.complianceStatus
                          )}`}
                        >
                          {user.compliance?.complianceStatus?.replace('_', ' ') || 'No record'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.compliance ? (
                          <span>
                            {user.compliance.earnedCredits} / {user.compliance.requiredCredits}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingCompliance({ user, year: currentYear })}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Edit Compliance
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">No users found</p>
          </div>
        )}
      </div>

      {/* Edit Compliance Modal */}
      {editingCompliance && (
        <ComplianceModal
          user={editingCompliance.user}
          year={editingCompliance.year}
          onSave={(input) =>
            handleUpdateCompliance(editingCompliance.user.id, editingCompliance.year, input)
          }
          onClose={() => setEditingCompliance(null)}
        />
      )}
    </div>
  );
}

interface ComplianceModalProps {
  user: AdminUserView;
  year: number;
  onSave: (input: AdminComplianceUpdate) => Promise<void>;
  onClose: () => void;
}

function ComplianceModal({ user, year, onSave, onClose }: ComplianceModalProps) {
  const [formData, setFormData] = useState<AdminComplianceUpdate>({
    earnedCredits: user.compliance?.earnedCredits ?? 0,
    requiredCredits: user.compliance?.requiredCredits ?? user.annualCeuRequirement ?? 0,
    complianceStatus: user.compliance?.complianceStatus ?? 'in_progress',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Edit Compliance</h2>
          <p className="text-sm text-gray-500 mb-4">
            {user.email} - {year}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Earned Credits</label>
              <input
                type="number"
                step="0.1"
                value={formData.earnedCredits ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, earnedCredits: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Required Credits</label>
              <input
                type="number"
                step="0.1"
                value={formData.requiredCredits ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, requiredCredits: parseFloat(e.target.value) || 0 })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.complianceStatus || 'in_progress'}
                onChange={(e) =>
                  setFormData({ ...formData, complianceStatus: e.target.value as ComplianceStatus })
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {COMPLIANCE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-yellow-50 p-3 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Manually adjusting compliance will override the auto-calculated
                values. The system will recalculate when the user completes more courses.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
