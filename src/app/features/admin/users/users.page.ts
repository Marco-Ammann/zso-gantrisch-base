import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { UserService } from '@core/services/user.service';
import { UserDoc }     from '@core/models/user-doc';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoButton   } from '@shared/ui/zso-button/zso-button';

@Component({
  selector  : 'zso-users-page',
  standalone: true,
  imports   : [
    CommonModule, RouterModule, FormsModule, AsyncPipe,
    CardShimmerDirective, ZsoCheckbox, ZsoButton
  ],
  templateUrl: './users.page.html',
  styleUrls : ['./users.page.scss']
})
export class UsersPage {

  private userService = inject(UserService);
  private router      = inject(Router);

  /** UI-State */
  showPending = false;
  reload$     = new BehaviorSubject<void>(undefined);

  /** Benutzer-Stream, gefiltert nach showPending */
  users$: Observable<UserDoc[]> = this.reload$.pipe(
    switchMap(() => this.userService.getAll()),
    map(list => this.showPending ? list.filter(u => !u.approved) : list)
  );

  /* ------------------------------------------------------------------ */
  refresh()                 { this.reload$.next(); }
  onTogglePending(v: boolean) { this.showPending = v; this.refresh(); }

  approve   (u: UserDoc) { this.userService.approve   (u.uid).subscribe(() => this.refresh()); }
  suspend   (u: UserDoc) { this.userService.block     (u.uid).subscribe(() => this.refresh()); }
  toggleRole(u: UserDoc) { this.userService.setRoles  (u.uid, u.roles?.[0] === 'admin' ? ['user'] : ['admin']).subscribe(() => this.refresh()); }

  editUser(u: UserDoc) {
    this.router.navigate(['/admin/users', u.uid, 'edit']);
  }
}
