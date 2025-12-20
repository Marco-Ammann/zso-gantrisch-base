import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { ActivitySource } from '../activity-feed.model';

export interface ActivityPreferences {
    showUsers: boolean;
    showPlaces: boolean;
    showAdzs: boolean;
    showPlanning: boolean;
}

const STORAGE_KEY = 'zso.activityPreferences.v1';

const DEFAULT_PREFERENCES: ActivityPreferences = {
    showUsers: true,
    showPlaces: true,
    showAdzs: true,
    showPlanning: true,
};

@Injectable({ providedIn: 'root' })
export class ActivityPreferencesService {
    private readonly subject = new BehaviorSubject<ActivityPreferences>(
        this.loadPreferences()
    );

    readonly preferences$: Observable<ActivityPreferences> = this.subject.asObservable();

    setPreferences(prefs: ActivityPreferences): void {
        this.subject.next(prefs);
        this.persistPreferences(prefs);
    }

    setSourceEnabled(source: ActivitySource, enabled: boolean): void {
        const current = this.subject.value;
        const next: ActivityPreferences = {
            ...current,
            ...(source === 'users' ? { showUsers: enabled } : {}),
            ...(source === 'places' ? { showPlaces: enabled } : {}),
            ...(source === 'adsz' ? { showAdzs: enabled } : {}),
            ...(source === 'planning' ? { showPlanning: enabled } : {}),
        };

        this.setPreferences(next);
    }

    private loadPreferences(): ActivityPreferences {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return DEFAULT_PREFERENCES;

            const parsed = JSON.parse(raw) as Partial<ActivityPreferences>;
            return {
                ...DEFAULT_PREFERENCES,
                ...parsed,
            };
        } catch {
            return DEFAULT_PREFERENCES;
        }
    }

    private persistPreferences(prefs: ActivityPreferences): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch {
            return;
        }
    }
}
