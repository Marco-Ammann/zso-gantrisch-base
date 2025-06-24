import { Component, inject, ViewChild } from '@angular/core';
import { CommonModule, AsyncPipe, NgIf, NgForOf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

import { UserService } from '@core/services/user.service';
import { UserDoc } from '@core/models/user-doc';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';
import { ZsoCheckbox } from '@shared/ui/zso-checkbox/zso-checkbox';
import { ZsoButton } from '@shared/ui/zso-button/zso-button';
import { ZsoInputField } from '@shared/ui/zso-input-field/zso-input-field';
import { ZsoRoleSelect } from '@shared/ui/zso-role-select/zso-role-select';
import { ConfirmationDialogComponent } from '@shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector   : 'zso-users-page',
  standalone : true,
  imports    : [
    CommonModule, NgIf, NgForOf, FormsModule, RouterModule, AsyncPipe,
    CardShimmerDirective, ZsoCheckbox, ZsoButton, ZsoInputField, ZsoRoleSelect,
    ConfirmationDialogComponent
  ],
  templateUrl: './users.page.html',
  styleUrls  : ['./users.page.scss']
})
export class UsersPage {
  private userService = inject(UserService);
  private router      = inject(Router);

  /* UI-State */
  search      = '';
  showPending = false;
  refresh$    = new BehaviorSubject<void>(undefined);

  /* Gefilterte Liste */
  users$ = this.refresh$.pipe(
    switchMap(() => this.userService.getAll()),
    map(list => {
      let arr = list;
      if (this.showPending) arr = arr.filter(u => !u.approved);
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        arr = arr.filter(u =>
          (u.firstName + ' ' + u.lastName).toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q));
      }
      return arr;
    })
  );

  /* Statistik */
  stats$ = this.refresh$.pipe(
    switchMap(() => this.userService.getAll()),
    map(a => ({ total:a.length, pending:a.filter(u=>!u.approved).length, blocked:a.filter(u=>u.blocked).length }))
  );

  /* Dialog */
  @ViewChild(ConfirmationDialogComponent) confirmation!: ConfirmationDialogComponent;
  private confirm(cb: () => void, txt: string, type:'danger'|'primary'='primary') {
    this.confirmation.title = 'Bitte bestätigen';
    this.confirmation.message = txt;
    this.confirmation.confirmText = 'Weiter';
    this.confirmation.confirmType = type;
    this.confirmation.visible = true;
    const sub = this.confirmation.confirmed.subscribe(ok => { if (ok) cb(); sub.unsubscribe(); });
  }

  /* Aktionen */
  approve(u:UserDoc){ this.userService.approve(u.uid).subscribe(()=>this.refresh$.next()); }
  toggleActive(u:UserDoc){
    const msg = u.blocked?'Benutzer entsperren?':'Benutzer blockieren?';
    const type=u.blocked?'primary':'danger';
    this.confirm(()=>this.userService.block(u.uid,!u.blocked).subscribe(()=>this.refresh$.next()),msg,type);
  }
  setRoles(u:UserDoc, roles:string[]){
    const msg=`Rolle auf „${roles[0]}“ setzen?`;
    this.confirm(()=>this.userService.setRoles(u.uid,roles).subscribe(()=>this.refresh$.next()),msg);
  }
  details(u:UserDoc){ this.router.navigate(['/admin/users',u.uid,'edit']); }
}
