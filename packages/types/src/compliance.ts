export type ComplianceStatus = 'compliant' | 'non_compliant' | 'in_progress';

export interface CeuCompliance {
  id: string;
  userId: string;
  year: number;
  requiredCredits: number;
  earnedCredits: number;
  complianceStatus: ComplianceStatus;
  updatedAt: Date;
}

export interface ComplianceSummary {
  year: number;
  requiredCredits: number;
  earnedCredits: number;
  remainingCredits: number;
  complianceStatus: ComplianceStatus;
  percentageComplete: number;
}
