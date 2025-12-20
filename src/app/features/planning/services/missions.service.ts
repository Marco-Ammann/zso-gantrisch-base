import {
    Injectable,
    inject,
    Injector,
    runInInjectionContext,
    OnDestroy,
} from '@angular/core';
import {
    collection,
    collectionData,
    doc,
    query,
    orderBy,
    addDoc,
    updateDoc,
    deleteDoc,
} from '@angular/fire/firestore';
import { Observable, Subject, from, of } from 'rxjs';
import { catchError, filter, map, switchMap, take, takeUntil } from 'rxjs/operators';
import { User } from '@angular/fire/auth';

import { FirestoreService } from '@core/services/firestore.service';
import { LoggerService } from '@core/services/logger.service';
import { AuthService } from '@core/auth/services/auth.service';
import { MissionDoc, MissionStatus } from '@core/models/mission.model';

@Injectable({ providedIn: 'root' })
export class MissionsService implements OnDestroy {
    private readonly injector = inject(Injector);
    private readonly logger = inject(LoggerService);
    private readonly authService = inject(AuthService);
    private readonly destroy$ = new Subject<void>();

    constructor(private firestoreService: FirestoreService) { }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private requireUser(): Observable<User> {
        return this.authService.user$.pipe(
            filter((u): u is User => !!u),
            take(1)
        );
    }

    getAll(): Observable<MissionDoc[]> {
        return runInInjectionContext(this.injector, () => {
            const colRef = collection(this.firestoreService.db, 'missions');
            const q = query(colRef, orderBy('startAt', 'desc'));
            return collectionData(q, { idField: 'id' }).pipe(
                map((docs) => docs as MissionDoc[]),
                catchError((error) => {
                    this.logger.error('MissionsService', 'getAll failed', error);
                    return of([] as MissionDoc[]);
                }),
                takeUntil(this.destroy$)
            );
        });
    }

    getById(id: string): Observable<MissionDoc | null> {
        if (!id) return of(null);
        return this.firestoreService.getDoc<MissionDoc>(`missions/${id}`).pipe(
            catchError((error) => {
                this.logger.error('MissionsService', 'getById failed', error);
                return of(null);
            })
        );
    }

    create(
        data: Omit<MissionDoc, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
            status?: MissionStatus;
        }
    ): Observable<string> {
        return runInInjectionContext(this.injector, () => {
            const colRef = collection(this.firestoreService.db, 'missions');
            const now = Date.now();

            return this.requireUser().pipe(
                switchMap((user) =>
                    from(
                        addDoc(colRef, {
                            ...data,
                            status: data.status ?? 'planned',
                            assignedPersonIds: data.assignedPersonIds ?? [],
                            createdAt: now,
                            updatedAt: now,
                            createdBy: user.uid,
                            updatedBy: user.uid,
                        })
                    )
                ),
                map((docRef) => docRef.id),
                takeUntil(this.destroy$)
            );
        });
    }

    update(id: string, updates: Partial<MissionDoc>): Observable<void> {
        if (!id) return of(void 0);

        return runInInjectionContext(this.injector, () => {
            const docRef = doc(this.firestoreService.db, `missions/${id}`);

            return this.requireUser().pipe(
                switchMap((user) =>
                    from(
                        updateDoc(docRef, {
                            ...updates,
                            updatedAt: Date.now(),
                            updatedBy: user.uid,
                        } as any)
                    )
                ),
                takeUntil(this.destroy$)
            );
        });
    }

    delete(id: string): Observable<void> {
        if (!id) return of(void 0);

        return runInInjectionContext(this.injector, () => {
            const docRef = doc(this.firestoreService.db, `missions/${id}`);
            return from(deleteDoc(docRef)).pipe(takeUntil(this.destroy$));
        });
    }
}
