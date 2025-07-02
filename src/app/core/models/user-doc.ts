// src/app/core/models/user-doc.ts
export interface UserDoc {
  uid: string;
  email: string;
  // Email verification is obtained from Firebase Auth, no need to store duplicate flag
  firstName: string;
  lastName: string;

  roles: string[]; // e.g. ['user'] | ['admin']

  // ----- Auth Info (synced from Firebase Auth) -----
  authProvider?: string; // e.g. 'password', 'google.com'
  emailVerified?: boolean;
  phoneNumber?: string;
  birthDate?: number | null;
  approved: boolean;
  blocked: boolean;

  createdAt: number; // Date.now()
  updatedAt: number;

  lastLoginAt?: number;

  lastLogoutAt?: number;

  lastActiveAt?: number;

  lastInactiveAt?: number;

  photoUrl?: string;
  photoURL?: string;
}

export class User {
  constructor(public data: UserDoc) {}

  get fullName() {
    return `${this.data.firstName} ${this.data.lastName}`.trim();
  }

  // convenience getters
  get isAdmin() {
    return this.data.roles.includes('admin');
  }

  get isActive() {
    return this.data.approved && !this.data.blocked;
  }
}
