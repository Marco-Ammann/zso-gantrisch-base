import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';

import { UserDoc } from '@core/models/user-doc';

@Component({
  selector  : 'app-user-card',
  standalone: true,
  imports   : [CommonModule, ZsoRoleSelect],
  template  : `
  <div class="glass-card shimmer-once p-6 flex flex-col gap-4"
       [ngClass]="{'card--blocked': user.blocked, 'card--demo': isDemo}"
       zsoCardShimmer>

    <!-- Kopfzeile -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div>

        <h2 class="text-lg font-semibold text-white">
          {{ user.firstName }} {{ user.lastName }}
          <span *ngIf="isDemo"    class="badge badge--demo">Demo</span>
          <span *ngIf="user.blocked" class="badge badge--suspended">Gesperrt</span>
        </h2>

        <p class="text-sm text-gray-300">{{ user.email }}</p>

        <p class="meta">
          Registriert: {{ user.createdAt | date:'dd.MM.yyyy' }}
          <span *ngIf="user.updatedAt !== user.createdAt">
            • geändert: {{ user.updatedAt | date:'dd.MM.yyyy' }}
          </span>
        </p>

        <p class="meta">
          {{ user.roles.join(', ') }}
        </p>

        <p class="meta" *ngIf="user['lastLoginAt']">
          Letzter Login: {{ user['lastLoginAt'] | date:'dd.MM.yyyy' }}
        </p>
      </div>

      <zso-role-select [roleOptions]="['user','admin']"
                       [selected]="user.roles"
                       (selectedChange)="roleRequested.emit($event)">
      </zso-role-select>
    </div>

    <!-- Aktion-Slot -->
    <ng-content></ng-content>
  </div>`,
  styles: [':host{display:block}']
})
export class UserCard implements OnInit {
  @Input() user!: UserDoc;

  /* Aktions-Events werden vom Eltern-Component verdrahtet */
  @Output() approve        = new EventEmitter<void>();
  @Output() toggle         = new EventEmitter<void>();
  @Output() details        = new EventEmitter<void>();
  @Output() roleRequested  = new EventEmitter<string[]>();

  isDemo = false;
  ngOnInit(){ this.isDemo = this.user.firstName.startsWith('(d)'); }
}
