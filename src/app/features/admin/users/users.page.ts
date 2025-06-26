import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { UserService } from '@core/services/user.service';
import { UserDoc } from '@core/models/user-doc';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'zso-users-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    RouterModule,
    AsyncPipe,
    ZsoButton,
    ZsoInputField,
    ZsoRoleSelect,
    ConfirmationDialogComponent,
  ],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
})
export class UsersPage {
  /* ----------------------------- Demo-Einträge (bleiben sichtbar) */
  public readonly dummyUsers: UserDoc[] = [
    {
      uid: '1',
      email: 'alpha@example.com',
      firstName: '(d) Alice',
      lastName: 'Altenburg',
      roles: ['user'],
      approved: true,
      blocked: false,
      createdAt: 1702406400000,
      updatedAt: 1702406400000,
    },
    {
      uid: '2',
      email: 'bravo@example.com',
      firstName: '(d) Bob',
      lastName: 'Bergmann',
      roles: ['admin'],
      approved: true,
      blocked: false,
      createdAt: 1703119200000,
      updatedAt: 1705701200000,
    },
    {
      uid: '3',
      email: 'carla@example.com',
      firstName: '(d) Carla',
      lastName: 'Carlsen',
      roles: ['user'],
      approved: false,
      blocked: false,
      createdAt: 1706488800000,
      updatedAt: 1706488800000,
    },
    {
      uid: '4',
      email: 'david@example.com',
      firstName: '(d) David',
      lastName: 'Döbeli',
      roles: ['user'],
      approved: true,
      blocked: true,
      createdAt: 1704328800000,
      updatedAt: 1704415200000,
    },
    {
      uid: '5',
      email: 'emma@example.com',
      firstName: '(d) Emma',
      lastName: 'Egli',
      roles: ['user'],
      approved: true,
      blocked: false,
      createdAt: 1705279200000,
      updatedAt: 1705279200000,
    },
    {
      uid: '6',
      email: 'felix@example.com',
      firstName: '(d) Felix',
      lastName: 'Felder',
      roles: ['user'],
      approved: false,
      blocked: false,
      createdAt: 1706049600000,
      updatedAt: 1706049600000,
    },
    {
      uid: '7',
      email: 'greta@example.com',
      firstName: '(d) Greta',
      lastName: 'Gruber',
      roles: ['user'],
      approved: true,
      blocked: false,
      createdAt: 1706568000000,
      updatedAt: 1706568000000,
    },
    {
      uid: '8',
      email: 'hans@example.com',
      firstName: '(d) Hans',
      lastName: 'Heiri',
      roles: ['user'],
      approved: true,
      blocked: false,
      createdAt: 1702075200000,
      updatedAt: 1702075200000,
    },
    {
      uid: '9',
      email: 'ida@example.com',
      firstName: '(d) Ida',
      lastName: 'Imhof',
      roles: ['user'],
      approved: true,
      blocked: true,
      createdAt: 1702588800000,
      updatedAt: 1702675200000,
    },
    {
      uid: '10',
      email: 'jonas@example.com',
      firstName: '(d) Jonas',
      lastName: 'Jäggi',
      roles: ['user'],
      approved: true,
      blocked: false,
      createdAt: 1701384000000,
      updatedAt: 1701384000000,
    },
  ];

  /* ----------------------------- UI-State */
  public search = '';
  public showOnlyBlocked = false;
  public sortBy: 'newest' | 'oldest' | 'name' | 'blocked' = 'newest';

  /** Trigger für Reload/Filter */
  public readonly refresh$ = new BehaviorSubject<void>(undefined);

  /** Rollenänderungen in Warteschlange */
  pendingRole: Record<string, string[]> = {};

  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  /* ----------------------------- Streams */

  /** alle Benutzer (Service + Demo) → Filter/Sort → Split  */
  public readonly users$ = this.refresh$.pipe(
    switchMap(() =>
      this.userService.getAll().pipe(
        // Falls der Service (z. B. offline) nichts liefert, dummyUsers trotzdem zeigen
        // (mit `of([])` würde das observable leer sein)
        switchMap((real) =>
          of([
            ...real,
            ...this.dummyUsers.filter(
              (d) => !real.some((u) => u.uid === d.uid) // Duplikate vermeiden
            ),
          ])
        )
      )
    ),
    map((list) => {
      /* --- Suche ---------------------------------------------------- */
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        list = list.filter(
          (u) =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
      }

      /* --- nur gesperrte ------------------------------------------- */
      if (this.showOnlyBlocked) list = list.filter((u) => u.blocked);

      /* --- Sortierung ---------------------------------------------- */
      switch (this.sortBy) {
        case 'name':
          list = [...list].sort((a, b) =>
            (a.lastName + a.firstName).localeCompare(
              b.lastName + b.firstName,
              'de'
            )
          );
          break;
        case 'oldest':
          list = [...list].sort((a, b) => a.createdAt - b.createdAt);
          break;
        case 'blocked':
          // shows blocked first
          list = [...list].sort(
            (a, b) => (a.blocked ? -1 : 1) - (b.blocked ? -1 : 1)
          );
          break;
        default: /* newest */
          list = [...list].sort((a, b) => b.createdAt - a.createdAt);
      }

      /* --- Split pending / rest ------------------------------------ */
      return {
        pending: list.filter((u) => !u.approved),
        rest: list.filter((u) => u.approved),
      };
    })
  );

  /** Statistik-Info rechts oben */
  public readonly stats$ = this.refresh$.pipe(
    switchMap(() =>
      this.userService
        .getAll()
        .pipe(
          switchMap((real) =>
            of([
              ...real,
              ...this.dummyUsers.filter(
                (d) => !real.some((u) => u.uid === d.uid)
              ),
            ])
          )
        )
    ),
    map((a) => ({
      total: a.length,
      pending: a.filter((u) => !u.approved).length,
      blocked: a.filter((u) => u.blocked).length,
    }))
  );

  /* ----------------------------- Dialog */
  @ViewChild(ConfirmationDialogComponent)
  confirmation!: ConfirmationDialogComponent;
  private confirm(
    cb: () => void,
    msg: string,
    type: 'danger' | 'primary' = 'primary'
  ) {
    this.confirmation.title = 'Bitte bestätigen';
    this.confirmation.message = msg;
    this.confirmation.confirmText = 'Weiter';
    this.confirmation.confirmType = type;
    this.confirmation.visible = true;
    const sub = this.confirmation.confirmed.subscribe((ok) => {
      if (ok) cb();
      sub.unsubscribe();
    });
  }

  /* ----------------------------- Aktionen */
  approve = (u: UserDoc) =>
    this.userService.approve(u.uid).subscribe(() => this.refresh$.next());

  toggleActive(u: UserDoc) {
    const msg = u.blocked ? 'Benutzer entsperren?' : 'Benutzer blockieren?';
    const type = u.blocked ? 'primary' : 'danger';
    this.confirm(
      () =>
        this.userService
          .block(u.uid, !u.blocked)
          .subscribe(() => this.refresh$.next()),
      msg,
      type
    );
  }

  /** Rollenauswahl (Dialog vor finalem Speichern) */
  askRoleChange(u: UserDoc, roles: string[]) {
    this.pendingRole[u.uid] = roles;
    const msg = `Rolle von „${u.roles[0]}“ auf „${roles[0]}“ ändern?`;
    this.confirm(() => {
      this.userService.setRoles(u.uid, roles).subscribe(() => {
        delete this.pendingRole[u.uid];
        this.refresh$.next();
      });
    }, msg);
  }

  details = (u: UserDoc) =>
    this.router.navigate(['/admin/users', u.uid, 'edit']);

  sortChanged() {
    this.refresh$.next();
  }
}
