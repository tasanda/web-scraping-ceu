export type Profession = 
  | 'mental_health'
  | 'nursing'
  | 'psychology'
  | 'counseling'
  | 'social_work'
  | 'other';

export interface User {
  id: string;
  email: string;
  clerkId: string;
  profession?: Profession | null;
  licenseNumber?: string | null;
  annualCeuRequirement?: number | null;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  clerkId: string;
  profession?: Profession;
  licenseNumber?: string;
  annualCeuRequirement?: number;
}

export interface UpdateUserInput {
  profession?: Profession;
  licenseNumber?: string;
  annualCeuRequirement?: number;
}
