import { Timestamp } from '@angular/fire/firestore';

/** Role that defines user permissions */
export type UserRole = 'admin' | 'user';

/** Approval status for user registration */
export type UserApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Core user data from Firebase Auth */
interface FirebaseUserData {
  /** Unique identifier from Firebase Auth */
  uid: string;
  
  /** User's email address */
  email: string;
  
  /** Whether the email is verified */
  emailVerified: boolean;
  
  /** User's display name */
  displayName?: string;
  
  /** URL to user's profile photo */
  photoURL?: string;
  
  /** When the user was last signed in */
  lastSignInAt?: Date;
  
  /** When the user was created */
  createdAt: Date;
}

/** Custom claims from Firebase Auth */
interface UserClaims {
  /** User's role for authorization */
  role: UserRole;
  
  /** Custom claims version for cache invalidation */
  _v?: number;
}

/** Application-specific user profile */
interface UserProfile {
  /** User's full name */
  fullName: string;
  
  /** Optional profile picture URL */
  avatarUrl?: string;
  
  /** Phone number with country code */
  phoneNumber?: string;
  
  /** Department or team */
  department?: string;
  
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Complete user model combining auth and profile data */
export class User implements FirebaseUserData, UserClaims, UserProfile {
  // From FirebaseUserData
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  lastSignInAt?: Date;
  createdAt: Date;

  // From UserClaims
  role: UserRole;
  _v?: number;

  // From UserProfile
  fullName: string;
  avatarUrl?: string;
  phoneNumber?: string;
  department?: string;
  metadata?: Record<string, unknown>;

  // Additional application fields
  approvalStatus: UserApprovalStatus;
  lastUpdated: Date;
  
  /**
   * Creates a new User instance
   * @param data - Partial user data to initialize with
   */
  constructor(data: Partial<User> = {}) {
    // Required fields with defaults
    this.uid = data.uid || '';
    this.email = data.email || '';
    this.emailVerified = data.emailVerified || false;
    this.role = data.role || 'user';
    this.fullName = data.fullName || data.displayName || '';
    this.approvalStatus = data.approvalStatus || 'pending';
    this.createdAt = data.createdAt || new Date();
    this.lastUpdated = new Date();
    
    // Optional fields
    if (data.displayName) this.displayName = data.displayName;
    if (data.photoURL) this.photoURL = data.photoURL;
    if (data.avatarUrl) this.avatarUrl = data.avatarUrl;
    if (data.phoneNumber) this.phoneNumber = data.phoneNumber;
    if (data.department) this.department = data.department;
    if (data.metadata) this.metadata = { ...data.metadata };
    if (data.lastSignInAt) this.lastSignInAt = data.lastSignInAt;
    if (data._v) this._v = data._v;
  }

  /**
   * Creates a User instance from Firebase UserCredential
   * @param userCredential - Firebase auth user credential
   * @param additionalData - Additional user data to include
   * @returns New User instance
   */
  static fromFirebaseAuth(
    userCredential: any, // Firebase User type would go here
    additionalData: Partial<User> = {}
  ): User {
    const { uid, email, emailVerified, displayName, photoURL, metadata } = userCredential;
    
    return new User({
      uid,
      email: email || '',
      emailVerified: !!emailVerified,
      displayName: displayName || '',
      photoURL: photoURL || undefined,
      createdAt: new Date(metadata?.creationTime || Date.now()),
      lastSignInAt: new Date(metadata?.lastSignInTime || Date.now()),
      ...additionalData
    });
  }

  /**
   * Creates a User instance from a plain object (e.g., from Firestore)
   * @param data - Plain object with user data
   * @returns New User instance
   */
  static fromPlainObject(data: any): User {
    // Convert Firestore Timestamp to Date if needed
    const convertTimestamp = (value: any): any => {
      if (value?.toDate) return value.toDate();
      if (value?.seconds) return new Date(value.seconds * 1000);
      return value;
    };

    const processedData: any = {};
    
    // Process all fields, handling timestamps
    Object.entries(data).forEach(([key, value]) => {
      processedData[key] = convertTimestamp(value);
    });

    return new User(processedData);
  }

  /**
   * Converts the User instance to a plain object
   * @returns Plain object representation of the user
   */
  toPlainObject(): Record<string, any> {
    return {
      uid: this.uid,
      email: this.email,
      emailVerified: this.emailVerified,
      displayName: this.displayName,
      photoURL: this.photoURL,
      lastSignInAt: this.lastSignInAt,
      createdAt: this.createdAt,
      role: this.role,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      phoneNumber: this.phoneNumber,
      department: this.department,
      approvalStatus: this.approvalStatus,
      lastUpdated: this.lastUpdated,
      _v: this._v,
      metadata: this.metadata ? { ...this.metadata } : undefined
    };
  }

  /**
   * Updates user data
   * @param updates - Partial user data to update
   * @returns New User instance with updated data
   */
  update(updates: Partial<User>): User {
    return new User({
      ...this.toPlainObject(),
      ...updates,
      lastUpdated: new Date()
    });
  }

  /**
   * Checks if the user has admin privileges
   */
  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Checks if the user's email is verified
   */
  get isEmailVerified(): boolean {
    return this.emailVerified;
  }

  /**
   * Checks if the user is approved
   */
  get isApproved(): boolean {
    return this.approvalStatus === 'approved';
  }

  /**
   * Gets the user's display name, falling back to email
   */
  get displayNameOrEmail(): string {
    return this.displayName || this.email.split('@')[0];
  }
}

/** Type guard to check if an object is a valid User */
export function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uid' in obj &&
    'email' in obj &&
    'role' in obj
  );
}
