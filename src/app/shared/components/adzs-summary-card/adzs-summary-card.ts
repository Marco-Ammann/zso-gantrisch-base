import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PersonDoc, NotfallkontaktDoc } from '@core/models/person.model';

@Component({
  selector: 'zso-adzs-summary-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="glass-card p-6 space-y-2 overview-card">
      <h3 class="text-lg font-semibold mb-2 flex items-center gap-2">
        <span class="material-symbols-outlined text-cp-orange">person</span>
        <span class="text-lg">Übersicht</span>
      </h3>
      <div class="space-y-2">
        <div class="entry-group" *ngIf="person">
          <div class="entry">
            <span class="font-semibold">Name:</span>
            {{ person.grunddaten.vorname }} {{ person.grunddaten.nachname }}
          </div>
          <div class="entry">
            <span class="font-semibold">Grad:</span>
            {{ person.grunddaten.grad }}
          </div>
          <div class="entry"><span class="font-semibold">Alter:</span> {{ age }}</div>
          <div class="entry">
            <span class="font-semibold">Primäre Tel.:</span>
            {{
              person.kontaktdaten.telefonMobil ||
                person.kontaktdaten.telefonFestnetz ||
                person.kontaktdaten.telefonGeschaeftlich ||
                '—'
            }}
          </div>
          <div class="entry">
            <span class="font-semibold">Zug / Gruppe:</span>
            {{ person.zivilschutz.einteilung.zug }} /
            {{ person.zivilschutz.einteilung.gruppe || '—' }}
          </div>
          <div class="entry">
            <span class="font-semibold">Notfallkontakte:</span>
            {{ notfallkontakte.length || 0 }}
          </div>
        </div>
        <div *ngIf="!person" class="italic text-gray-400">Keine Daten</div>
      </div>
    </section>
  `,
  styles: [
    `
    .overview-card {
      @apply bg-white/10 backdrop-blur rounded-2xl p-6 space-y-2;
    }

    .entry-group {
      @apply space-y-2 mb-2;
    }

    .entry {
      @apply flex items-center gap-2 text-sm;
    }
    `,
  ],
})
export class AdzsSummaryCard {
  @Input() person: PersonDoc | null = null;
  @Input() notfallkontakte: NotfallkontaktDoc[] = [];

  get age(): number | null {
    if (!this.person) return null;
    const date = this.person.grunddaten.geburtsdatum as any;
    const birthDate =
      typeof date === 'number' ? new Date(date) : new Date(date.seconds * 1000);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
}
