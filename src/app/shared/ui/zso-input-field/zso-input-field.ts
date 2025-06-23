import { Component, Input, forwardRef } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'zso-input-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ZsoInputField), multi: true }
  ],
  templateUrl: './zso-input-field.html',
})
export class ZsoInputField implements ControlValueAccessor {
  @Input() label = '';
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() toggleVisibility = false;

  control = new FormControl(
    '',
    this.type === 'email'
      ? [Validators.required, Validators.email]
      : Validators.required
  );

  id = crypto.randomUUID();
  show = false;

  get resolvedType() {
    return this.toggleVisibility && this.type === 'password'
      ? (this.show ? 'text' : 'password')
      : this.type;
  }

  getError(): string {
    if (this.control.hasError('required')) return 'Dieses Feld ist erforderlich.';
    if (this.control.hasError('email'))    return 'Ungültige E-Mail-Adresse.';
    return 'Ungültiger Wert.';
  }

  /* CVA */
  writeValue(v: any)            { this.control.setValue(v); }
  registerOnChange(fn: any)     { this.control.valueChanges.subscribe(fn); }
  registerOnTouched(fn: any)    { this.onTouched = fn; }
  onTouched = () => {};
  setDisabledState(d: boolean)  { d ? this.control.disable() : this.control.enable(); }
}
