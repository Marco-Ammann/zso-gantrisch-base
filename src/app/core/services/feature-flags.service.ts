import {
    Injectable,
    Injector,
    OnDestroy,
    inject,
    runInInjectionContext,
} from '@angular/core';
import { doc, docData } from '@angular/fire/firestore';
import { Observable, Subject, of } from 'rxjs';
import { catchError, map, shareReplay, takeUntil } from 'rxjs/operators';

import { FirestoreService } from './firestore.service';
import { LoggerService } from './logger.service';

export type FeatureFlagKey = 'adsz' | 'places' | 'adminUsers' | 'planning';

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    adsz: true,
    places: true,
    adminUsers: true,
    planning: true,
};

@Injectable({ providedIn: 'root' })
export class FeatureFlagsService implements OnDestroy {
    private readonly injector = inject(Injector);
    private readonly fs = inject(FirestoreService);
    private readonly logger = inject(LoggerService);
    private readonly destroy$ = new Subject<void>();

    readonly flags$: Observable<FeatureFlags>;

    constructor() {
        this.flags$ = runInInjectionContext(this.injector, () => {
            const ref = doc(this.fs.db, 'config/featureFlags');
            return docData(ref).pipe(
                map((remote) => ({
                    ...DEFAULT_FEATURE_FLAGS,
                    ...((remote ?? {}) as Partial<FeatureFlags>),
                })),
                catchError((err) => {
                    this.logger.error('FeatureFlagsService', 'flags$ failed', err);
                    return of(DEFAULT_FEATURE_FLAGS);
                }),
                shareReplay({ bufferSize: 1, refCount: true }),
                takeUntil(this.destroy$)
            );
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    isEnabled$(key: FeatureFlagKey): Observable<boolean> {
        return this.flags$.pipe(map((flags) => flags[key]));
    }

    setFlag(key: FeatureFlagKey, enabled: boolean): Observable<void> {
        return this.fs.setDoc<Partial<FeatureFlags>>(
            'config/featureFlags',
            { [key]: enabled },
            true
        );
    }

    setFlags(flags: Partial<FeatureFlags>): Observable<void> {
        const payload = Object.fromEntries(
            Object.entries(flags).filter(([, value]) => value !== undefined)
        ) as Partial<FeatureFlags>;

        return this.fs.setDoc<Partial<FeatureFlags>>('config/featureFlags', payload, true);
    }
}
