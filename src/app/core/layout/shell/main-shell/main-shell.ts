import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { CommonModule } from "@angular/common";

@Component({
    selector: 'app-main-shell',
    templateUrl: './main-shell.html',
    styleUrls: ['./main-shell.scss'],
    imports: [RouterOutlet, CommonModule],
    standalone: true,
})
export class MainShell {
}
