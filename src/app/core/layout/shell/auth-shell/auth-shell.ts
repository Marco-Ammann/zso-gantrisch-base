import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardShimmerDirective } from '@shared/directives/card-shimmer.directive';

@Component({
  selector: 'zso-auth-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, CardShimmerDirective],
  templateUrl: './auth-shell.html',
  styleUrls: ['./auth-shell.scss']
})
export class AuthShell {}
