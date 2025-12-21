import { inject, Injectable } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { AuthService } from '@core/auth/services/auth.service';
import { PersonService } from '@core/services/person.service';
import { UserService } from '@core/services/user.service';
import { FeatureFlagsService } from '@core/services/feature-flags.service';
import { PlacesService } from '@features/places/services/places.service';
import { MissionsService } from '@features/planning/services/missions.service';

import { PlaceDoc } from '@core/models/place.model';
import { PersonDoc } from '@core/models/person.model';
import { UserDoc } from '@core/models/user-doc';
import { MissionDoc } from '@core/models/mission.model';

import { ActivityFeedItem } from '../activity-feed.model';
import { ActivityPreferencesService } from './activity-preferences.service';

@Injectable({ providedIn: 'root' })
export class ActivityFeedService {
    private readonly authService = inject(AuthService);
    private readonly prefs = inject(ActivityPreferencesService);
    private readonly featureFlags = inject(FeatureFlagsService);
    private readonly userService = inject(UserService);
    private readonly placesService = inject(PlacesService);
    private readonly personService = inject(PersonService);
    private readonly missionsService = inject(MissionsService);

    activities$(limit?: number): Observable<ActivityFeedItem[]> {
        const isAdmin$ = this.authService.appUser$.pipe(
            map((u) => u?.doc.roles?.includes('admin') ?? false)
        );

        return combineLatest([isAdmin$, this.featureFlags.flags$, this.prefs.preferences$]).pipe(
            switchMap(([isAdmin, flags, prefs]) => {
                const users$ = prefs.showUsers && isAdmin
                    ? this.userService.getAll().pipe(catchError(() => of([] as UserDoc[])))
                    : of([] as UserDoc[]);

                const places$ = prefs.showPlaces && flags.places
                    ? this.placesService.getAll().pipe(catchError(() => of([] as PlaceDoc[])))
                    : of([] as PlaceDoc[]);

                const persons$ = prefs.showAdzs && flags.adsz
                    ? this.personService.getAll().pipe(catchError(() => of([] as PersonDoc[])))
                    : of([] as PersonDoc[]);

                const missions$ = prefs.showPlanning && flags.planning && isAdmin
                    ? this.missionsService.getAll().pipe(catchError(() => of([] as MissionDoc[])))
                    : of([] as MissionDoc[]);

                return combineLatest([users$, places$, persons$, missions$]).pipe(
                    map(([users, places, persons, missions]) => {
                        const userItems = users.map((u) => this.userToActivity(u));
                        const placeItems = places.map((p) => this.placeToActivity(p));
                        const personItems = persons.map((p) => this.personToActivity(p));
                        const missionItems = missions.map((m) => this.missionToActivity(m));

                        const items = [...userItems, ...placeItems, ...personItems, ...missionItems]
                            .filter((i) => i.timestamp > 0)
                            .sort((a, b) => b.timestamp - a.timestamp);

                        if (!limit) return items;
                        return items.slice(0, limit);
                    })
                );
            })
        );
    }

    private missionToActivity(mission: MissionDoc): ActivityFeedItem {
        const timestamp = mission.updatedAt ?? mission.createdAt;
        const isUpdated = !!mission.updatedAt && mission.updatedAt > mission.createdAt;

        const text =
            mission.status === 'active'
                ? 'Einsatz aktiv'
                : mission.status === 'done'
                    ? 'Einsatz abgeschlossen'
                    : mission.status === 'cancelled'
                        ? 'Einsatz abgesagt'
                        : isUpdated
                            ? 'Einsatz aktualisiert'
                            : 'Neuer Einsatz';

        const icon =
            mission.status === 'active'
                ? 'play_circle'
                : mission.status === 'done'
                    ? 'task_alt'
                    : mission.status === 'cancelled'
                        ? 'cancel'
                        : isUpdated
                            ? 'edit'
                            : 'event_note';

        const color =
            mission.status === 'active'
                ? 'text-green-400'
                : mission.status === 'done'
                    ? 'text-sky-400'
                    : mission.status === 'cancelled'
                        ? 'text-rose-400'
                        : 'text-cp-orange';

        return {
            key: `planning:${mission.id}`,
            source: 'planning',
            id: mission.id,
            name: mission.title,
            text,
            icon,
            color,
            timestamp,
            route: `/planning/${mission.id}`,
            avatarText: (mission.title || 'E').charAt(0).toUpperCase(),
        };
    }

    private userToActivity(user: UserDoc): ActivityFeedItem {
        const timestamp = user.updatedAt ?? user.createdAt;
        return {
            key: `users:${user.uid}`,
            source: 'users',
            id: user.uid,
            name: `${user.firstName} ${user.lastName}`,
            text: this.getUserActivityText(user),
            icon: this.getUserActivityIcon(user),
            color: this.getUserActivityColor(user),
            timestamp,
            route: `/admin/users/${user.uid}`,
            avatarText: this.getUserInitials(user),
        };
    }

    private placeToActivity(place: PlaceDoc): ActivityFeedItem {
        const timestamp = place.updatedAt ?? place.createdAt;
        return {
            key: `places:${place.id}`,
            source: 'places',
            id: place.id,
            name: place.name,
            text:
                place.updatedAt && place.updatedAt > place.createdAt
                    ? 'Ort aktualisiert'
                    : 'Neuer Ort',
            icon: 'place',
            color: 'text-emerald-400',
            timestamp,
            route: `/places/${place.id}`,
            avatarText: place.name.charAt(0).toUpperCase(),
        };
    }

    private personToActivity(person: PersonDoc): ActivityFeedItem {
        const created = this.toMillis(person.erstelltAm);
        const updated = this.toMillis(person.aktualisiertAm);
        const timestamp = updated || created;

        const isUpdated = updated > 0 && created > 0 && updated > created;

        return {
            key: `adsz:${person.id}`,
            source: 'adsz',
            id: person.id,
            name: `${person.grunddaten.vorname} ${person.grunddaten.nachname}`,
            text: isUpdated ? 'AdZS aktualisiert' : 'Neuer AdZS',
            icon: 'badge',
            color: 'text-cyan-400',
            timestamp,
            route: `/adsz/${person.id}`,
            avatarText: `${person.grunddaten.vorname.charAt(0)}${person.grunddaten.nachname.charAt(0)}`.toUpperCase(),
        };
    }

    private getUserInitials(user: UserDoc): string {
        return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }

    private getUserActivityText(user: UserDoc): string {
        if (!user.approved) return 'Registrierung ausstehend';
        if (user.blocked) return 'Benutzer gesperrt';
        if (user.updatedAt && user.updatedAt > user.createdAt) return 'Profil aktualisiert';
        return 'Neu registriert';
    }

    private getUserActivityIcon(user: UserDoc): string {
        if (!user.approved) return 'schedule';
        if (user.blocked) return 'block';
        if (user.updatedAt && user.updatedAt > user.createdAt) return 'edit';
        return 'person_add';
    }

    private getUserActivityColor(user: UserDoc): string {
        if (!user.approved) return 'text-amber-400';
        if (user.blocked) return 'text-rose-400';
        return 'text-green-400';
    }

    private toMillis(
        value: number | { seconds: number; nanoseconds: number } | undefined
    ): number {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        return value.seconds * 1000;
    }
}
