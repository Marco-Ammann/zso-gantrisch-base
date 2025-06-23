import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkConnectedOverlay, ConnectedPosition } from '@angular/cdk/overlay';

@Component({
  selector: 'zso-role-select',
  standalone: true,
  imports: [CommonModule, OverlayModule],
  template: `
    <div class="relative inline-block text-left select-none">
      <!-- Trigger -->
      <button #trigger="cdkOverlayOrigin" cdkOverlayOrigin type="button" (click)="toggle()" class="btn btn-xs bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-md">
        <ng-container *ngIf="selected?.length; else ph">
          <span *ngFor="let r of selected" class="badge badge-secondary mr-1">{{ r }}</span>
        </ng-container>
        <ng-template #ph><span class="opacity-60">Rollen wählen</span></ng-template>
        <svg class="w-4 h-4 ml-1 -mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
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
        <div class="w-44 rounded-md glass-card p-2 z-30">
          <label *ngFor="let opt of roleOptions" class="flex items-center gap-2 py-1 cursor-pointer text-sm">
            <input type="checkbox" class="accent-orange-500" [checked]="isSelected(opt)" (change)="toggleOpt(opt)" />
            <span>{{ opt }}</span>
          </label>
        </div>
      </ng-template>
    </div>
  `,
  styles: []
})
export class ZsoRoleSelect {
  @ViewChild(CdkConnectedOverlay) overlay?: CdkConnectedOverlay;

  @Input() roleOptions: string[] = [];
  @Input() selected: string[] = [];
  @Output() selectedChange = new EventEmitter<string[]>();

  open = false;
  positions: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4 },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4 }
  ];

  toggle() { this.open = !this.open; }
  isSelected(opt: string) { return this.selected?.includes(opt) ?? false; }

  toggleOpt(opt: string) {
    const sel = [...(this.selected ?? [])];
    const idx = sel.indexOf(opt);
    idx > -1 ? sel.splice(idx, 1) : sel.push(opt);
    if (!sel.length) return;               // verhindert leeres Array
    this.selected = sel;
    this.selectedChange.emit(sel);
  }
}