import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zso-checkbox',
  standalone: true,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZsoCheckbox), multi: true }
  ],
  template: `
    <label class="checkbox-wrapper group">
      <input
        type="checkbox"
        class="checkbox-hidden peer"
        [checked]="value"
        (change)="toggle($event)" />

      <span class="checkbox-box">
        @if (value) {
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white"
               viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd"
              d="M16.707 5.293a1 1 0 0 0-1.414 0L8 12.586 4.707 9.293a1 1 0 1 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l8-8a1 1 0 0 0 0-1.414z"/>
          </svg>
        }
      </span>

      <span class="checkbox-label">{{ label }}</span>
    </label>
  `,
})
export class ZsoCheckbox implements ControlValueAccessor {
  @Input() label = '';

  value = false;
  private onChange = (_: boolean) => {};
  private onTouched = () => {};

  toggle(e: Event) {
    const v = (e.target as HTMLInputElement).checked;
    this.value = v;
    this.onChange(v);
    this.onTouched();
  }

  writeValue(v: boolean)         { this.value = !!v; }
  registerOnChange(fn: any)      { this.onChange  = fn; }
  registerOnTouched(fn: any)     { this.onTouched = fn; }
  setDisabledState(_: boolean)   {}
}
