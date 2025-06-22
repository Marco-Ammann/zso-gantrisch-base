// Centralised application settings
// Update values here to alter behaviour across the app in one place.

export interface AppSettings {
  /** Named Firestore database ID */
  firestoreDbId: string;
}

export const APP_SETTINGS: AppSettings = {
  // 🔧 change this once and every service using APP_SETTINGS picks it up
  firestoreDbId: 'zso-base'
} as const;
