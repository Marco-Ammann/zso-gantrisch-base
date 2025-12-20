import { InjectionToken } from '@angular/core';

export interface ChangelogEntry {
    version: string;
    title: string;
    items: readonly string[];
}

export const CHANGELOG_ENTRIES = [
    {
        version: '0.6.0',
        title: 'Einsatz (Admin)',
        items: [
            'Neu: Einsatz (Admin-only) mit Einsätzen, Ort-Zuordnung und AdZS-Zuteilung.',
            'Einsätze: Einrück-/Ausrückzeit mit Start-/Enddatum inkl. Uhrzeit (wie im Aufgebot).',
            'Übersicht: Liste mit Status-Filter und Suche.',
        ],
    },
    {
        version: '0.5.5',
        title: 'Ladezeiten & Skeletons',
        items: [
            'Dashboard: Keine künstliche „Dashboard wird geladen…“ Anzeige mehr (sofort sichtbar).',
            'Übersichten: Skeletons statt Spinner bei Benutzer/Orte/AdZS für bessere wahrgenommene Ladezeit.',
            'Routing: Lazy-Routes werden im Hintergrund vorgeladen (Preloading + gezieltes Prefetch).',
        ],
    },
    {
        version: '0.5.4',
        title: 'Dashboard & Aktivitäten',
        items: [
            'Dashboard: Widgets werden jetzt über eine Registry pro Feature registriert (AdZS/Places/Admin).',
            'Dashboard: „Alle anzeigen“ bei Aktivitäten führt neu auf eine dedizierte Aktivitäten-Ansicht.',
            'Aktivitäten: Anzeige kann nach Quelle gefiltert werden (z.B. Benutzer/Orte/AdZS).',
        ],
    },
    {
        version: '0.5.3',
        title: 'Notizen & Darstellung',
        items: [
            'Notiz-Fenster wird jetzt korrekt seitenweit angezeigt (besser bei langen Texten).',
            'Bearbeiten im Notiz-Fenster fühlt sich stabiler an (Scroll/Grösse).',
            'Orte-Detailseite übersichtlicher (Layout und Notizen-Bereich verbessert).',
        ],
    },
    {
        version: '0.5.2',
        title: 'Neu & verbessert',
        items: [
            'Glas-Effekt besser lesbar (milchiger).',
            'Hover-Effekte vereinheitlicht.',
            'Logo-Icon korrigiert (Alpha-Symbol sichtbar).',
        ],
    },
    {
        version: '0.5.1',
        title: 'Stabilität & UI-Politur',
        items: ['Kleinere Verbesserungen und Korrekturen.'],
    },
] as const satisfies readonly ChangelogEntry[];

export const CHANGELOG = new InjectionToken<readonly ChangelogEntry[]>('CHANGELOG', {
    providedIn: 'root',
    factory: () => CHANGELOG_ENTRIES,
});
