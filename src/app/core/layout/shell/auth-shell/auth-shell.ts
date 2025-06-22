//auth shell for the auth pages like login, register, etc.
//auth shell is just the frame and renders the content depending on the route

import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-auth-shell',
  templateUrl: './auth-shell.html',
  styleUrls: ['./auth-shell.scss'],
  imports: [RouterOutlet, CommonModule],
  standalone: true,
})
export class AuthShell {
}
