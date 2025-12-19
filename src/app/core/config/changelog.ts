import { InjectionToken } from '@angular/core';

export interface ChangelogEntry {
    version: string;
    title: string;
    items: readonly string[];
}

export const CHANGELOG_ENTRIES = [
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
