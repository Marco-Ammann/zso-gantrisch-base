import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'zso-auth-shell',
  standalone: true,
  templateUrl: './auth-shell.html',
  styleUrls: ['./auth-shell.scss'],
  imports: [RouterOutlet, CommonModule]
})
export class AuthShell {}
