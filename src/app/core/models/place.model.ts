// src/app/core/models/place.model.ts
// All code names are English; user-facing strings will remain German in UI components.

export interface PlaceDoc {
  id: string;
  name: string;
  type: PlaceType;

  // Base address (always required)
  address: {
    street: string;
    zip: string;
    city: string;
    country?: string;
    coordinates?: { lat: number; lng: number }; // For future Google Maps API support
  };

  // Main contact person (required)
  contactPerson: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    role?: string; // e.g. "Heimleitung", "Facility Manager"
  };

  // Base capacity (extensible)
  capacity?: {
    maxPersons?: number;
    // roomCount?: number;
    // bedCount?: number;
    // barrierFree?: boolean;
    [key: string]: any; // Flexible for future extensions
  };

  // Notes system (array for multiple entries)
  notes: NoteEntry[];

  // Equipment (optional, extensible)
  equipment?: {
    [key: string]: any; // Flexible for future extensions
  };

  // Availability (optional, extensible)
  availability?: {
    [key: string]: any; // Flexible for future extensions
  };

  // Standard metadata
  createdAt: number;
  updatedAt: number;
  createdBy: string; // User ID
  updatedBy?: string; // User ID on updates
}

export type PlaceType =
  | 'accommodation' // Heim
  | 'civil_protection_facility' // Zivilschutzanlage
  | 'training_room' // Schulungsraum
  | 'other';

export interface NoteEntry {
  id: string; // UUID
  text: string;
  createdAt: number;
  createdBy: string; // User ID
  updatedAt?: number;
  updatedBy?: string;
}

// Statistics for dashboard integration
export interface PlacesStats {
  total: number;
  byType: Record<PlaceType, number>;
  available: number;
  withCapacity: number;
}
