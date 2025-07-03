// src/app/features/dashboard/dashboard.model.ts
export interface Stats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
}

export interface ExtendedStats extends Stats {
  persons?: number;
  activePersons?: number;
  newPersons?: number;
  inactivePersons?: number;
}

export interface DashboardActivity {
  id: string;
  type: 'user_registered' | 'user_approved' | 'user_blocked' | 'profile_updated' | 'person_added';
  userId: string;
  userName: string;
  timestamp: number;
  details?: string;
}

export interface DashboardQuickLink {
  id: string;
  icon: string;
  label: string;
  description: string;
  route: string;
  color: string;
  requiresAdmin?: boolean;
  badge?: number;
}