import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleSelectComponent } from '@shared/components/role-select/role-select';
import { LoggerService } from '@core/services/logger.service';
import { UserService, AppUser } from '@core/services/user.service';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'zso-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, RoleSelectComponent],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage {
  users$!: Observable<AppUser[]>;
  showPending = false;
  roleOptions = ['user', 'admin'];

  constructor(private users: UserService, private logger: LoggerService) {
    this.load();
  }

  private load() {
    this.users$ = this.users.getAll();
  }

  approve(user: AppUser) {
    this.users.approve(user.uid);
  }

  toggleBlock(user: AppUser) {
    this.users.block(user.uid, !user.blocked);
  }

  togglePendingFilter() {
    this.showPending = !this.showPending;
  }

  onRolesChange(user: AppUser, roles: string[]) {
    if (!roles.length) {
      this.logger.warn('UsersPage', 'roles empty, abort update');
      return;
    }
    this.users.setRoles(user.uid, roles);
  }
}
