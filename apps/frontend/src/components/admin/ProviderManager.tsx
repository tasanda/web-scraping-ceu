import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  useAdminProviders,
  useCreateProvider,
  useUpdateProvider,
  useDeleteProvider,
} from '../../hooks/useAdminQueries';
import type { AdminProvider, AdminProviderCreate, AdminProviderUpdate } from '@ceu/types';

export default function ProviderManager() {
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AdminProvider | null>(null);

  const { data, isLoading } = useAdminProviders(page, 20);
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const deleteProvider = useDeleteProvider();

  const handleCreate = async (input: AdminProviderCreate) => {
    try {
      await createProvider.mutateAsync(input);
      toast.success('Provider created');
      setIsCreateOpen(false);
    } catch {
      toast.error('Failed to create provider');
    }
  };

  const handleUpdate = async (id: string, input: AdminProviderUpdate) => {
    try {
      await updateProvider.mutateAsync({ id, input });
      toast.success('Provider updated');
      setEditingProvider(null);
    } catch {
      toast.error('Failed to update provider');
    }
  };

  const handleDelete = async (provider: AdminProvider) => {
    if (provider.courseCount && provider.courseCount > 0) {
      toast.error(`Cannot delete provider with ${provider.courseCount} courses`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${provider.name}"?`)) {
      return;
    }

    try {
      await deleteProvider.mutateAsync(provider.id);
      toast.success('Provider deleted');
    } catch {
      toast.error('Failed to delete provider. It may have associated courses.');
    }
  };

  const handleToggleActive = async (provider: AdminProvider) => {
    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        input: { active: !provider.active },
      });
      toast.success(`Provider ${provider.active ? 'deactivated' : 'activated'}`);
    } catch {
      toast.error('Failed to update provider');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">CEU Providers</h2>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Add Provider
        </button>
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Loading providers...</p>
          </div>
        ) : data && data.providers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.providers.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={provider.baseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-800 truncate block max-w-xs"
                        >
                          {provider.baseUrl}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {provider.courseCount ?? 0}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(provider)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            provider.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {provider.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingProvider(provider)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(provider)}
                          disabled={provider.courseCount ? provider.courseCount > 0 : false}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={provider.courseCount && provider.courseCount > 0 ? 'Cannot delete provider with courses' : ''}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {data.totalPages}
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
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">No providers found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <ProviderModal
          title="Add Provider"
          onSave={handleCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}

      {/* Edit Modal */}
      {editingProvider && (
        <ProviderModal
          title="Edit Provider"
          provider={editingProvider}
          onSave={(input) => handleUpdate(editingProvider.id, input)}
          onClose={() => setEditingProvider(null)}
        />
      )}
    </div>
  );
}

interface ProviderModalProps {
  title: string;
  provider?: AdminProvider;
  onSave: (input: AdminProviderCreate | AdminProviderUpdate) => Promise<void>;
  onClose: () => void;
}

function ProviderModal({ title, provider, onSave, onClose }: ProviderModalProps) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    baseUrl: provider?.baseUrl || '',
    active: provider?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      toast.error('Name and Base URL are required');
      return;
    }
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{title}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., PESI"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://www.pesi.com"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
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
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
