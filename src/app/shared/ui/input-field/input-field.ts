import {
  Component,
  forwardRef,
  Input,
  ChangeDetectionStrategy,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  FormControl,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

@Component({
  selector: 'zso-input-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './input-field.html',
  styleUrls: ['./input-field.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZsoInputField),
      multi: true
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => ZsoInputField),
      multi: true
    }
  ]
})
export class ZsoInputField implements ControlValueAccessor, OnInit, OnChanges {
  @Input() label!: string;
  @Input() type: 'text' | 'email' | 'password' = 'text';
  @Input() toggleVisibility = false;

  control = new FormControl(
    { value: '', disabled: false },
    { nonNullable: true, validators: [Validators.required] }
  );
  hidden = true;

  // CVA callbacks
  onChange = (_: any) => {};
  onTouched = () => {};

  ngOnInit() {
    this.hidden = this.type === 'password';
    this.setValidators();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['type']) {
      this.hidden = this.type === 'password';
      this.setValidators();
    }
  }

  private setValidators() {
    const v = [Validators.required];
    if (this.type === 'email')    v.push(Validators.email);
    if (this.type === 'password') v.push(Validators.minLength(6));
    this.control.setValidators(v);
    this.control.updateValueAndValidity({ onlySelf: true });
  }

  writeValue(value: any): void {
    this.control.setValue(value ?? '', { emitEvent: false });
  }
  registerOnChange(fn: any): void {
    this.onChange = fn;
    this.control.valueChanges.subscribe(fn);
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    isDisabled
      ? this.control.disable({ emitEvent: false })
      : this.control.enable({ emitEvent: false });
  }
  validate() {
    return this.control.valid ? null : { invalid: true };
  }

  toggle() {
    this.hidden = !this.hidden;
  }

  getErrorMessage(): string | null {
    if (this.control.hasError('required'))  return `${this.label} ist erforderlich.`;
    if (this.control.hasError('email'))     return `Ungültige E-Mail-Adresse.`;
    if (this.control.hasError('minlength')) return `${this.label} muss ≥ 6 Zeichen haben.`;
    return null;
  }
}
