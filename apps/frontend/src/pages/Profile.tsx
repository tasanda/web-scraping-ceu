import { useState, useEffect } from 'react';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useUser, useUpdateUser } from '../hooks/useUserQueries';
import type { UpdateUserInput, Profession } from '@ceu/types';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user: clerkUser } = useClerkUser();
  const { data: user, isLoading: loading, error } = useUser();
  const updateUserMutation = useUpdateUser();

  const [formData, setFormData] = useState<UpdateUserInput>({
    profession: undefined,
    licenseNumber: undefined,
    annualCeuRequirement: undefined,
  });

  const professions: Profession[] = [
    'mental_health',
    'nursing',
    'psychology',
    'counseling',
    'social_work',
    'other',
  ];

  useEffect(() => {
    if (error) {
      toast.error('Failed to load user profile');
      console.error(error);
    }
  }, [error]);

  useEffect(() => {
    if (user) {
      setFormData({
        profession: user.profession || undefined,
        licenseNumber: user.licenseNumber || undefined,
        annualCeuRequirement: user.annualCeuRequirement || undefined,
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      await updateUserMutation.mutateAsync(formData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile</h1>

      <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
        <div className="mb-6">
          <p className="text-sm text-gray-600">Email</p>
          <p className="text-lg font-medium text-gray-900">
            {clerkUser?.primaryEmailAddress?.emailAddress || user?.email}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profession
            </label>
            <select
              value={formData.profession || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profession: (e.target.value || undefined) as Profession | undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select profession</option>
              {professions.map((prof) => (
                <option key={prof} value={prof}>
                  {prof.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Number
            </label>
            <input
              type="text"
              value={formData.licenseNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseNumber: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Annual CEU Requirement
            </label>
            <input
              type="number"
              value={formData.annualCeuRequirement || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  annualCeuRequirement: e.target.value ? parseInt(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Number of CEU credits required annually for your profession
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={updateUserMutation.isPending}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
