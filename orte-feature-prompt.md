# Orte-Feature Implementierung - Umfassender Entwicklungsauftrag

> **Erstelle ein vollständiges "Orte"-Feature für das ZSO Gantrisch Base Projekt**
>
> Dieses Feature dient zur Verwaltung von Orten (Heime, Zivilschutzanlagen, etc.) für die WK- und Lehrgang-Planung.

---

## 🎯 **Projekt-Kontext**

Du arbeitest an dem ZSO Gantrisch Base Projekt - einer Angular 20 Anwendung zur Verwaltung der Zivilschutz Organisation Gantrisch. Das Projekt verwendet:

- **Angular 20** (Standalone Components)
- **Firebase** (Firestore + Auth)
- **Tailwind CSS** + Custom Design Tokens
- **Feature-Based Architecture**
- **RxJS** für State Management
- **Glassmorphism Design** (Dark Theme)

### **Existierende Architektur-Pattern:**
- `features/adsz/` - AdZS-Verwaltung (als Referenz)
- `features/dashboard/` - Dashboard
- `features/admin/` - Admin-Bereich
- `core/services/` - Business Logic Services
- `shared/components/` - Wiederverwendbare UI-Komponenten

---

## 🏗️ **Feature-Anforderungen**

### **Geschäftliche Anforderungen:**
1. **WK-Planung**: 2x jährlich, 5 Tage, verschiedene Heime (4-8 AdZS pro Heim)
2. **Lehrgang-Planung**: 2x jährlich, 2 Tage, Zivilschutzanlagen
3. **Ortstypen**: Heime, Zivilschutzanlagen, weitere
4. **Daten**: Adresse, Ansprechperson, Kapazität, Google Maps Einbettung
5. **Erweiterbarkeit**: Feature muss später um weitere Funktionen erweiterbar sein

### **Technische Anforderungen:**
- Folge dem bestehenden Projekt-Pattern exakt
- Verwende das existierende Design-System
- Implementiere CRUD-Operationen
- Mobile-First responsive Design
- Google Maps nur als iframe-Embed (keine APIs)
- Erweiterbare Datenstruktur für zukünftige Features

---

## 📊 **Datenmodell (Erweiterbar)**

### **OrtDoc Interface** (Core Model)
```typescript
// src/app/core/models/ort.model.ts
export interface OrtDoc {
  id: string;
  bezeichnung: string;
  typ: OrtTyp;
  
  // Basis-Adresse (immer erforderlich)
  adresse: {
    strasse: string;
    plz: string;
    ort: string;
    land?: string;
    koordinaten?: { lat: number; lng: number; }; // Für späteren Google Maps API Support
  };
  
  // Haupt-Ansprechperson (erforderlich)
  ansprechperson: {
    vorname: string;
    nachname: string;
    telefon: string;
    email: string;
    funktion?: string; // z.B. "Heimleitung", "Facility Manager"
  };
  
  // Basis-Kapazität (erweiterbar)
  kapazitaet?: {
    maxPersonen?: number;
    // Platz für zukünftige Erweiterungen:
    // anzahlZimmer?: number;
    // anzahlBetten?: number;
    // barrierefrei?: boolean;
  };
  
  // Notizen-System (Array für Multiple Einträge)
  notizen: NotizEintrag[];
  
  // Ausstattung (optional, erweiterbar)
  ausstattung?: {
    // Basis-Ausstattung, später erweiterbar um:
    // wlan?: boolean;
    // kueche?: boolean;
    // beamer?: boolean;
    // etc.
    [key: string]: any; // Flexibel für Erweiterungen
  };
  
  // Verfügbarkeit (optional, erweiterbar)
  verfuegbarkeit?: {
    // Basis-Info, später erweiterbar um:
    // ganzjaehrig?: boolean;
    // saisonal?: { von: string; bis: string; };
    // etc.
    [key: string]: any; // Flexibel für Erweiterungen
  };
  
  // Standard-Metadaten
  erstelltAm: number;
  aktualisiertAm: number;
  erstelltVon: string; // User ID
  aktualisiertVon?: string; // User ID bei Updates
}

export type OrtTyp = 'heim' | 'zivilschutzanlage' | 'schulungsraum' | 'sonstiges';

export interface NotizEintrag {
  id: string; // UUID
  text: string;
  erstelltAm: number;
  erstelltVon: string; // User ID
  aktualisiertAm?: number;
  aktualisiertVon?: string;
}

// Statistiken für Dashboard Integration
export interface OrteStats {
  total: number;
  byTyp: Record<OrtTyp, number>;
  verfuegbare: number;
  mitKapazitaet: number;
}
```

---

## 🗂️ **Ordnerstruktur**

Erstelle folgende Struktur in `src/app/features/orte/`:

```
features/orte/
├── orte-overview/
│   ├── orte-overview.page.ts
│   ├── orte-overview.page.html
│   ├── orte-overview.page.scss
│   └── components/
│       └── ort-filter-bar/         # Filter für Ortstyp, etc.
├── ort-detail/
│   ├── ort-detail.page.ts
│   ├── ort-detail.page.html
│   ├── ort-detail.page.scss
│   └── components/
│       ├── ort-info-card/          # Basis-Informationen
│       ├── ansprechperson-card/    # Kontaktdaten
│       ├── kapazitaets-card/       # Kapazitätsinformationen
│       ├── google-maps-embed/      # Google Maps iframe
│       └── notizen-widget/         # Notizen-Verwaltung
├── components/
│   ├── ort-create-modal/           # Modal für neue Orte
│   │   ├── ort-create-modal.ts
│   │   ├── ort-create-modal.html
│   │   └── ort-create-modal.scss
│   └── ort-card/                   # Card für Overview
│       ├── ort-card.ts
│       ├── ort-card.html
│       └── ort-card.scss
├── services/
│   └── orte.service.ts
├── models/
│   └── ort.model.ts                # Bereits oben definiert
├── orte.routes.ts
└── index.ts                        # Barrel export
```

---

## 🔧 **Service Implementation**

### **OrteService** (Vollständige Implementierung)
```typescript
// src/app/features/orte/services/orte.service.ts
@Injectable({ providedIn: 'root' })
export class OrteService implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly logger = inject(LoggerService);
  private readonly firestoreService = inject(FirestoreService);
  private readonly authService = inject(AuthService);
  private readonly stateService = inject(StateManagementService);
  private readonly destroy$ = new Subject<void>();

  // Observables
  readonly orte$ = this.getAllOrte();
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getAllOrte(): Observable<OrtDoc[]> {
    // Implementiere ähnlich wie PersonService.getAll()
    // Verwende collectionData mit Firestore
  }

  getById(id: string): Observable<OrtDoc | null> {
    // Lade einzelnen Ort
  }

  getByTyp(typ: OrtTyp): Observable<OrtDoc[]> {
    // Filter nach Ortstyp
  }

  create(ortData: Omit<OrtDoc, 'id' | 'erstelltAm' | 'aktualisiertAm' | 'erstelltVon'>): Observable<string> {
    // Erstelle neuen Ort mit Metadaten
  }

  update(id: string, updates: Partial<OrtDoc>): Observable<void> {
    // Update mit aktualisiertAm und aktualisiertVon
  }

  delete(id: string): Observable<void> {
    // Lösche Ort (prüfe später auf Verknüpfungen zu Einsätzen)
  }

  // Notizen-Verwaltung
  addNotiz(ortId: string, notizText: string): Observable<void> {
    // Füge neue Notiz hinzu
  }

  updateNotiz(ortId: string, notizId: string, neuerText: string): Observable<void> {
    // Aktualisiere Notiz
  }

  deleteNotiz(ortId: string, notizId: string): Observable<void> {
    // Lösche Notiz
  }

  // Statistiken für Dashboard
  getStats(): Observable<OrteStats> {
    // Berechne Statistiken ähnlich wie PersonService.getStats()
  }

  // Google Maps Embed URL Generator
  getGoogleMapsEmbedUrl(adresse: OrtDoc['adresse']): string {
    // Generiere Google Maps Embed URL aus Adresse
    const address = `${adresse.strasse}, ${adresse.plz} ${adresse.ort}`;
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}`;
    // Oder verwende iframe ohne API Key (einfacher Ansatz)
  }
}
```

---

## 🎨 **UI-Komponenten Implementierung**

### **Orte-Overview Page**
```typescript
// src/app/features/orte/orte-overview/orte-overview.page.ts
@Component({
  selector: 'zso-orte-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    OrtCreateModal,
    OrtCard,
    OrtFilterBar
  ],
  templateUrl: './orte-overview.page.html',
  styleUrls: ['./orte-overview.page.scss'],
  animations: [
    // Verwende bestehende Animationen aus adsz-overview
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrteOverviewPage implements OnInit, OnDestroy {
  // Implementiere ähnlich wie AdzsOverviewPage
  // - Filter-State
  // - Loading-State
  // - Search-Funktionalität
  // - Modal-Handling
  // - Success/Error Messages
}
```

### **Ort-Detail Page**
```typescript
// src/app/features/ort-detail/ort-detail.page.ts
@Component({
  selector: 'zso-ort-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    OrtInfoCard,
    AnsprechpersonCard,
    KapazitaetsCard,
    GoogleMapsEmbed,
    NotizenWidget
  ],
  templateUrl: './ort-detail.page.html',
  styleUrls: ['./ort-detail.page.scss'],
  animations: [
    // Bestehende Animationen
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrtDetailPage implements OnInit, OnDestroy {
  // Implementiere ähnlich wie adsz-detail
  // - Route Parameter Handling
  // - Edit-Mode Toggle
  // - Form Handling
  // - Auto-Save Mechanismus
  // - Bild-Upload (später)
}
```

### **Google Maps Embed Komponente**
```typescript
// src/app/features/orte/ort-detail/components/google-maps-embed/google-maps-embed.ts
@Component({
  selector: 'zso-google-maps-embed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-card p-4">
      <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span class="material-symbols-outlined text-cp-orange">place</span>
        Standort
      </h3>
      
      @if (embedUrl) {
        <div class="relative w-full h-64 rounded-lg overflow-hidden">
          <iframe
            [src]="embedUrl | safe:'resourceUrl'"
            width="100%"
            height="100%"
            style="border:0;"
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
          </iframe>
        </div>
      } @else {
        <div class="w-full h-64 bg-gray-700 rounded-lg flex items-center justify-center">
          <p class="text-gray-400">Karte nicht verfügbar</p>
        </div>
      }
      
      <div class="mt-3 p-3 bg-black/20 rounded-lg">
        <p class="text-sm text-gray-300">
          <span class="material-symbols-outlined text-sm mr-1">location_on</span>
          {{ fullAddress }}
        </p>
      </div>
    </div>
  `
})
export class GoogleMapsEmbedComponent {
  @Input() adresse!: OrtDoc['adresse'];
  
  get fullAddress(): string {
    return `${this.adresse.strasse}, ${this.adresse.plz} ${this.adresse.ort}`;
  }
  
  get embedUrl(): string {
    // Generiere einfache Google Maps URL ohne API
    const query = encodeURIComponent(this.fullAddress);
    return `https://www.google.com/maps?q=${query}&output=embed`;
  }
}
```

### **Notizen-Widget**
```typescript
// src/app/features/orte/ort-detail/components/notizen-widget/notizen-widget.ts
@Component({
  selector: 'zso-notizen-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-card p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-cp-orange">note</span>
          Notizen
        </h3>
        <button 
          (click)="showAddForm = !showAddForm"
          class="glass-btn-primary px-3 py-1 rounded text-sm">
          <span class="material-symbols-outlined text-sm">add</span>
        </button>
      </div>

      <!-- Add Form -->
      @if (showAddForm) {
        <div class="mb-4 p-3 bg-black/20 rounded-lg">
          <textarea
            [(ngModel)]="neueNotiz"
            placeholder="Neue Notiz hinzufügen..."
            class="w-full bg-black/30 border border-white/10 rounded p-2 text-white placeholder-gray-400 resize-none"
            rows="3"></textarea>
          <div class="flex gap-2 mt-2">
            <button 
              (click)="addNotiz()"
              [disabled]="!neueNotiz.trim()"
              class="glass-btn-primary px-3 py-1 rounded text-sm">
              Speichern
            </button>
            <button 
              (click)="cancelAdd()"
              class="glass-btn-neutral px-3 py-1 rounded text-sm">
              Abbrechen
            </button>
          </div>
        </div>
      }

      <!-- Notizen Liste -->
      <div class="space-y-3">
        @for (notiz of notizen; track notiz.id) {
          <div class="p-3 bg-black/10 rounded-lg border border-white/5">
            @if (editingId === notiz.id) {
              <!-- Edit Mode -->
              <textarea
                [(ngModel)]="editText"
                class="w-full bg-black/30 border border-white/10 rounded p-2 text-white"
                rows="2"></textarea>
              <div class="flex gap-2 mt-2">
                <button (click)="saveEdit(notiz.id)" class="text-green-400 text-sm">Speichern</button>
                <button (click)="cancelEdit()" class="text-gray-400 text-sm">Abbrechen</button>
              </div>
            } @else {
              <!-- View Mode -->
              <p class="text-gray-300 whitespace-pre-wrap">{{ notiz.text }}</p>
              <div class="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{{ getRelativeTime(notiz.erstelltAm) }}</span>
                <div class="flex gap-2">
                  <button (click)="startEdit(notiz)" class="hover:text-white">
                    <span class="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button (click)="deleteNotiz(notiz.id)" class="hover:text-rose-400">
                    <span class="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            }
          </div>
        } @empty {
          <p class="text-gray-400 text-center py-4">Noch keine Notizen vorhanden</p>
        }
      </div>
    </div>
  `
})
export class NotizenWidgetComponent {
  @Input() notizen: NotizEintrag[] = [];
  @Input() ortId!: string;
  @Output() notizAdded = new EventEmitter<string>();
  @Output() notizUpdated = new EventEmitter<{id: string, text: string}>();
  @Output() notizDeleted = new EventEmitter<string>();

  showAddForm = false;
  neueNotiz = '';
  editingId: string | null = null;
  editText = '';

  // Implementiere alle Methoden für Notizen-Verwaltung
}
```

---

## 🔗 **Routing Integration**

### **Orte Routes**
```typescript
// src/app/features/orte/orte.routes.ts
import { Routes } from '@angular/router';

export const orteRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./orte-overview/orte-overview.page').then(m => m.OrteOverviewPage),
    title: 'Orte-Verwaltung'
  },
  {
    path: 'neu',
    loadComponent: () => import('./orte-overview/orte-overview.page').then(m => m.OrteOverviewPage),
    data: { openModal: true },
    title: 'Neuer Ort'
  },
  {
    path: ':id',
    loadComponent: () => import('./ort-detail/ort-detail.page').then(m => m.OrtDetailPage),
    title: 'Ort Details'
  }
];
```

### **App Routes Integration**
```typescript
// src/app/app.routes.ts (zu erweitern)
// Füge zu den MainShell children hinzu:
{ path: 'orte', children: orteRoutes },
```

---

## 🎨 **Design-System Integration**

### **Design Token Erweiterungen** (falls nötig)
```css
/* src/theme/tokens.css - Neue Tokens falls erforderlich */
:root {
  /* Ort-spezifische Farben */
  --ort-heim-color: rgba(34, 197, 94, 0.8);        /* Grün für Heime */
  --ort-anlage-color: rgba(59, 130, 246, 0.8);     /* Blau für Anlagen */
  --ort-sonstiges-color: rgba(156, 163, 175, 0.8); /* Grau für Sonstiges */
  
  /* Map Container */
  --map-border: rgba(255, 255, 255, 0.1);
  --map-bg: rgba(0, 0, 0, 0.3);
}
```

### **CSS Utility Klassen**
```scss
// src/app/features/orte/orte-overview/orte-overview.page.scss
.ort-type-badge {
  &--heim { 
    @apply bg-green-500/20 text-green-400 border-green-500/30; 
  }
  &--zivilschutzanlage { 
    @apply bg-blue-500/20 text-blue-400 border-blue-500/30; 
  }
  &--sonstiges { 
    @apply bg-gray-500/20 text-gray-400 border-gray-500/30; 
  }
}

.map-container {
  iframe {
    @apply rounded-lg;
    filter: contrast(0.8) brightness(0.9); // Dunkler für Dark Theme
  }
}
```

---

## 📱 **Dashboard Integration**

### **Dashboard Quick-Link**
```typescript
// src/app/features/dashboard/dashboard.page.ts (zu erweitern)
quickLinks: QuickLink[] = [
  // Bestehende Links...
  {
    icon: 'place',
    label: 'Orte',
    description: 'WK-Heime und Anlagen verwalten',
    route: '/orte',
    color: 'bg-gray-500/20 hover:bg-gray-500/30 text-emerald-400'
  }
];
```

### **Dashboard Statistik-Widget**
```typescript
// Erweitere stats$ um Orte-Statistiken
stats$ = combineLatest([
  // Bestehende Observables...
  this.orteService.getStats().pipe(
    catchError(err => of({ total: 0, byTyp: {}, verfuegbare: 0, mitKapazitaet: 0 }))
  )
]).pipe(
  map(([userStats, personStats, orteStats]) => ({
    ...userStats,
    ...personStats,
    orte: orteStats.total,
    heime: orteStats.byTyp['heim'] || 0,
    anlagen: orteStats.byTyp['zivilschutzanlage'] || 0
  }))
);
```

---

## 🚀 **Implementierungs-Reihenfolge**

### **Phase 1: Basis-Struktur**
1. Models und Interfaces definieren
2. OrteService implementieren (CRUD)
3. Basic Firestore Integration

### **Phase 2: UI-Komponenten**
1. Orte-Overview Page
2. Ort-Detail Page  
3. Create-Modal
4. Basis-Komponenten (Cards, etc.)

### **Phase 3: Advanced Features**
1. Google Maps Embed
2. Notizen-System
3. Dashboard Integration
4. Filter und Search

### **Phase 4: Polish**
1. Animationen
2. Error Handling
3. Loading States
4. Mobile Optimierung

---

## ✅ **Akzeptanzkriterien**

### **Funktional:**
- ✅ CRUD-Operationen für Orte
- ✅ Ortstypen: Heim, Zivilschutzanlage, Sonstiges
- ✅ Vollständige Adressverwaltung
- ✅ Ansprechperson-Management
- ✅ Kapazitäts-Tracking
- ✅ Notizen-System (Multiple Einträge)
- ✅ Google Maps Einbettung
- ✅ Mobile-responsive Design

### **Technisch:**
- ✅ Folgt bestehenden Projekt-Patterns
- ✅ Verwendet existierendes Design-System
- ✅ Erweiterbare Datenstruktur
- ✅ Proper Error Handling
- ✅ Loading States
- ✅ Dashboard Integration

### **Qualität:**
- ✅ TypeScript Strict Mode
- ✅ RxJS Best Practices
- ✅ OnPush Change Detection
- ✅ Proper Lifecycle Management
- ✅ Einheitliches Logging

---

## 🎯 **Erwarteter Output**

**Erstelle eine vollständige, produktionsreife Implementierung** des Orte-Features basierend auf diesem Prompt. Das Feature soll:

1. **Sofort nutzbar** sein für WK/Lehrgang-Planung
2. **Nahtlos integriert** sein in die bestehende Anwendung
3. **Erweiterbar** sein für zukünftige Anforderungen
4. **Den bestehenden Code-Standards** entsprechen
5. **Mobile-optimiert** und **benutzerfreundlich** sein

**Beginne mit der Implementierung und erstelle alle notwendigen Dateien, Services und Komponenten.**