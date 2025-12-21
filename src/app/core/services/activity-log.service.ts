import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, User } from '@angular/fire/auth';
import { addDoc, collection, getDocs, limit, orderBy, query } from '@angular/fire/firestore';
import { Observable, from, map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';

export type ActivityLogAction = 'create' | 'update' | 'delete';

export type ActivityLogChange = {
    path: string;
    before: unknown;
    after: unknown;
};

export type ActivityLogEntry = {
    at: number;
    action: ActivityLogAction;
    actorUid?: string | null;
    actorEmail?: string | null;
    actorName?: string | null;
    changes: ActivityLogChange[];
};

@Injectable({ providedIn: 'root' })
export class ActivityLogService {
    private readonly injector = inject(Injector);
    private readonly firestore = inject(FirestoreService);
    private readonly logger = inject(LoggerService);
    private readonly auth = inject(Auth);

    latestEntry(key: string): Observable<ActivityLogEntry | null> {
        if (!key) return of(null);

        return runInInjectionContext(this.injector, () => {
            const entriesCol = collection(this.firestore.db, 'activityLogs', key, 'entries');
            const q = query(entriesCol, orderBy('at', 'desc'), limit(1));

            return from(getDocs(q)).pipe(
                map((snap) => {
                    const doc = snap.docs[0];
                    return doc ? (doc.data() as ActivityLogEntry) : null;
                }),
                catchError((error) => {
                    this.logger.error('ActivityLogService', 'latestEntry failed', error);
                    return of(null);
                })
            );
        });
    }

    logUpdate(key: string, before: unknown, after: unknown): Observable<void> {
        return this.log(key, 'update', before, after);
    }

    logCreate(key: string, after: unknown): Observable<void> {
        return this.log(key, 'create', null, after);
    }

    logDelete(key: string, before: unknown): Observable<void> {
        return this.log(key, 'delete', before, null);
    }

    private log(
        key: string,
        action: ActivityLogAction,
        before: unknown,
        after: unknown
    ): Observable<void> {
        if (!key) return of(void 0);

        return runInInjectionContext(this.injector, () => {
            const actor = this.auth.currentUser;
            const changes = this.diff(before, after);

            const entry: ActivityLogEntry = {
                at: Date.now(),
                action,
                actorUid: actor?.uid ?? null,
                actorEmail: actor?.email ?? null,
                actorName: this.getActorName(actor),
                changes,
            };

            const entriesCol = collection(this.firestore.db, 'activityLogs', key, 'entries');

            return from(addDoc(entriesCol, entry)).pipe(
                map(() => void 0),
                catchError((error) => {
                    this.logger.error('ActivityLogService', 'log failed', { key, action, error });
                    return of(void 0);
                })
            );
        });
    }

    private getActorName(actor: User | null): string | null {
        const name = actor?.displayName?.trim();
        if (name) return name;
        return null;
    }

    private diff(before: unknown, after: unknown): ActivityLogChange[] {
        const maxDepth = 4;
        const maxChanges = 40;

        const ignoredLeafKeys = new Set([
            'id',
            'uid',
            'updatedAt',
            'updatedBy',
            'createdAt',
            'createdBy',
            'lastActiveAt',
            'lastInactiveAt',
            'lastLoginAt',
            'lastLogoutAt',
            'aktualisiertAm',
            'erstelltAm',
            'metadaten',
        ]);

        const changes: ActivityLogChange[] = [];

        const isObject = (v: unknown): v is Record<string, unknown> =>
            !!v && typeof v === 'object' && !Array.isArray(v);

        const isEqual = (a: unknown, b: unknown): boolean => {
            if (a === b) return true;
            try {
                return JSON.stringify(a) === JSON.stringify(b);
            } catch {
                return false;
            }
        };

        const sanitize = (path: string, value: unknown): unknown => {
            if (Array.isArray(value)) {
                return value.length;
            }

            const p = path.toLowerCase();

            if (p.includes('password')) return '***';

            if (typeof value === 'string' && (p.includes('email') || p.endsWith('.email'))) {
                const [user, domain] = value.split('@');
                if (!domain) return '***';
                const head = (user ?? '').trim().charAt(0);
                return `${head || '*'}***@${domain}`;
            }

            if (
                typeof value === 'string' &&
                (p.includes('telefon') || p.includes('phone') || p.includes('phonenumber'))
            ) {
                const digits = value.replace(/\D/g, '');
                const tail = digits.slice(-2);
                return tail ? `***${tail}` : '***';
            }

            if (
                p.includes('strasse') ||
                p.includes('street') ||
                p.includes('address') ||
                p.includes('plz') ||
                p.includes('zip')
            ) {
                if (value === null || value === undefined) return value;
                return '***';
            }

            return value;
        };

        const walk = (b: unknown, a: unknown, path: string, depth: number): void => {
            if (changes.length >= maxChanges) return;

            const leafKey = path.split('.').pop() ?? '';
            if (leafKey && ignoredLeafKeys.has(leafKey)) return;

            const bObj = isObject(b) ? b : isObject(a) ? {} : null;
            const aObj = isObject(a) ? a : isObject(b) ? {} : null;

            if (depth < maxDepth && bObj && aObj) {
                const keys = new Set([...Object.keys(bObj), ...Object.keys(aObj)]);
                for (const k of keys) {
                    if (changes.length >= maxChanges) return;
                    const nextPath = path ? `${path}.${k}` : k;
                    walk((bObj as any)[k], (aObj as any)[k], nextPath, depth + 1);
                }
                return;
            }

            if (!isEqual(b, a)) {
                changes.push({
                    path,
                    before: sanitize(path, b),
                    after: sanitize(path, a),
                });
            }
            return;
        };

        walk(before, after, '', 0);
        return changes;
    }
}

export function applyDeepPatch<T>(base: T, patch: Partial<T>): T {
    const isObject = (v: unknown): v is Record<string, unknown> =>
        !!v && typeof v === 'object' && !Array.isArray(v);

    if (!isObject(base) || !isObject(patch)) {
        return (patch as T) ?? base;
    }

    const out: Record<string, unknown> = { ...(base as any) };

    for (const key of Object.keys(patch)) {
        const pVal = (patch as any)[key];
        const bVal = (base as any)[key];

        if (Array.isArray(pVal)) {
            out[key] = pVal.slice();
            continue;
        }

        if (isObject(bVal) && isObject(pVal)) {
            out[key] = applyDeepPatch(bVal, pVal);
            continue;
        }

        out[key] = pVal;
    }

    return out as T;
}
