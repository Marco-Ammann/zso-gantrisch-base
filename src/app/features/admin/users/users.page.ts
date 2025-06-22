import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService, AppUser } from '@core/services/user.service';
import { Observable } from 'rxjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'zso-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPage {
  users$!: Observable<AppUser[]>;

  constructor(private users: UserService) {
    this.users$ = this.users.getAll();
  }

  approve(user: AppUser) {
    this.users.approve(user.uid);
  }

  toggleBlock(user: AppUser) {
    this.users.block(user.uid, !user.blocked);
  }
}
