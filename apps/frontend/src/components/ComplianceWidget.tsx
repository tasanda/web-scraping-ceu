import type { ComplianceSummary } from '@ceu/types';

interface ComplianceWidgetProps {
  compliance: ComplianceSummary;
}

export default function ComplianceWidget({ compliance }: ComplianceWidgetProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Compliance Status {compliance.year}
      </h2>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{compliance.percentageComplete.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full ${
              compliance.complianceStatus === 'compliant'
                ? 'bg-green-500'
                : compliance.complianceStatus === 'in_progress'
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(100, compliance.percentageComplete)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Earned</p>
          <p className="text-2xl font-bold text-gray-900">
            {compliance.earnedCredits.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Required</p>
          <p className="text-2xl font-bold text-gray-900">
            {compliance.requiredCredits}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Remaining</span>
        <span className="text-lg font-semibold text-gray-900">
          {compliance.remainingCredits.toFixed(1)}
        </span>
      </div>

      <div className="mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
            compliance.complianceStatus
          )}`}
        >
          {compliance.complianceStatus.replace('_', ' ').toUpperCase()}
        </span>
      </div>
    </div>
  );
}
