import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats various Swiss phone number inputs to "+41 xx xxx xx xx".
 * Very tolerant to spaces, brackets, leading 0, etc.
 */
@Pipe({ name: 'swissPhone', standalone: true })
export class SwissPhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '-';

    // remove everything except digits and plus
    let cleaned = value.replace(/[^+\d]/g, '');

    // ensure leading +41
    if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2);
    if (cleaned.startsWith('+')) {
      // ok
    } else if (cleaned.startsWith('0')) {
      cleaned = '+41' + cleaned.slice(1);
    } else if (!cleaned.startsWith('+41')) {
      cleaned = '+41' + cleaned;
    }

    // now remove non digits except leading +
    const plus = cleaned.startsWith('+') ? '+' : '';
    cleaned = cleaned.replace(/[^\d]/g, '');

    // expect 11 or 12 digits incl country
    if (cleaned.length === 11) {
      // already without leading 0
    } else if (cleaned.length === 12 && cleaned.startsWith('41')) {
      cleaned = cleaned.slice(0, 2) + cleaned.slice(3); // drop possible extra 0
    }

    // build formatted string +41 xx xxx xx xx
    const country = cleaned.slice(0, 2);
    const rest = cleaned.slice(2);
    const parts = [rest.slice(0, 2), rest.slice(2, 5), rest.slice(5, 7), rest.slice(7, 9)];
    return `${plus}${country} ${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`.trim();
  }
}
