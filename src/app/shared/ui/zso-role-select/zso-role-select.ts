// src/app/shared/ui/zso-role-select/zso-role-select.ts
import { CommonModule } from '@angular/common';
import { 
  Component, 
  EventEmitter, 
  Input, 
  Output, 
  ViewChild, 
  ElementRef, 
  HostListener,
  inject
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'zso-role-select',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  template: `
    <div class="relative inline-block text-left">
      <!-- Trigger -->
      <button 
        #trigger="cdkOverlayOrigin" 
        cdkOverlayOrigin 
        type="button" 
        (click)="toggle()" 
        class="inline-flex items-center justify-between w-full rounded glass-card bg-white/5 hover:bg-white/10 px-3 py-1.5 text-sm text-white min-w-[120px] transition-colors"
        [class.border-primary-500]="selected?.length">
        <ng-container *ngIf="selected?.length; else ph">
          <div class="flex flex-wrap gap-1">
            <span *ngFor="let r of selected" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200">
              {{ r }}
            </span>
          </div>
        </ng-container>
        <ng-template #ph>
          <span class="text-gray-500 dark:text-gray-400">Rollen wählen</span>
        </ng-template>
        <svg class="-mr-1 ml-2 h-4 w-4 text-gray-500 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Dropdown -->
      <ng-template cdkConnectedOverlay
                 [cdkConnectedOverlayOrigin]="trigger"
                 [cdkConnectedOverlayOpen]="open"
                 [cdkConnectedOverlayPositions]="positions"
                 cdkConnectedOverlayHasBackdrop
                 cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                 (backdropClick)="open=false"
                 (detach)="open=false">
        <div class="mt-1 w-52 rounded glass-card py-2 z-50">
          <div class="py-1" role="menu" aria-orientation="vertical">
            <div *ngFor="let opt of roleOptions" 
                 class="dropdown-item cursor-pointer flex items-center"
                 (click)="toggleOpt(opt)"
                 role="menuitem">
              <div class="flex items-center h-5">
                <input type="checkbox" 
                       class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-900"
                       [checked]="isSelected(opt)" 
                       (click)="$event.stopPropagation()"
                       (change)="toggleOpt(opt)">
              </div>
              <div class="ml-3">
                {{ opt }}
              </div>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: []
})
export class ZsoRoleSelect {
  @ViewChild(CdkConnectedOverlay) overlay?: CdkConnectedOverlay;
  private el = inject(ElementRef);

  @Input() roleOptions: string[] = [];
  @Input() selected: string[] | null = [];
  @Output() selectedChange = new EventEmitter<string[]>();

  open = false;
  positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 }
  ];

  toggle() { this.open = !this.open; }
  isSelected(opt: string) { return this.selected?.includes(opt) ?? false; }

  get hasSelection(): boolean {
    return !!this.selected && this.selected.length > 0;
  }

  toggleOpt(opt: string) {
    // For single selection, just set the selected item
    // If clicking the same role, don't change the selection
    if (this.selected?.includes(opt)) {
      return;
    }
    this.selected = [opt];
    this.selectedChange.emit(this.selected);
    this.open = false; // Close dropdown after selection
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.el.nativeElement.contains(target)) {
      this.open = false;
    }
  }
}
