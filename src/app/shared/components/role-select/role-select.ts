import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'zso-role-select',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative inline-block text-left select-none">
      <!-- Trigger -->
      <button type="button" (click)="toggle()" class="btn btn-xs bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-md">
        <ng-container *ngIf="selected?.length; else ph">
          <span *ngFor="let r of selected" class="badge badge-secondary mr-1">{{ r }}</span>
        </ng-container>
        <ng-template #ph><span class="opacity-60">Rollen wählen</span></ng-template>
        <svg class="w-4 h-4 ml-1 -mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown -->
      <div *ngIf="open" class="absolute right-0 mt-2 w-44 origin-top-right rounded-md glass-card p-2 z-20">
        <label *ngFor="let opt of roleOptions" class="flex items-center gap-2 py-1 cursor-pointer text-sm">
          <input type="checkbox" class="accent-orange-500" [checked]="isSelected(opt)" (change)="toggleOpt(opt)" />
          <span>{{ opt }}</span>
        </label>
      </div>
    </div>
  `,
  styles: []
})
export class RoleSelectComponent {
  @Input() roleOptions: string[] = [];
  @Input() selected: string[] = [];
  @Output() selectedChange = new EventEmitter<string[]>();

  open = false;

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

  @HostListener('document:click', ['$event'])
  close(ev: MouseEvent) {
    if (!(ev.target as HTMLElement).closest('zso-role-select')) this.open = false;
  }
}