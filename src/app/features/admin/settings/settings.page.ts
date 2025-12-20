import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import {
    FeatureFlagKey,
    FeatureFlagsService,
} from '@core/services/feature-flags.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
    selector: 'zso-settings-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
    private readonly flagsService = inject(FeatureFlagsService);
    private readonly logger = inject(LoggerService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly flags$ = this.flagsService.flags$;

    errorMsg: string | null = null;
    pending: Partial<Record<FeatureFlagKey, boolean>> = {};

    readonly items: Array<{ key: FeatureFlagKey; label: string; description: string }> = [
        {
            key: 'adsz',
            label: 'AdZS',
            description: 'AdZS Verwaltung (Personen, Gruppen, Notfallkontakte)',
        },
        {
            key: 'planning',
            label: 'Einsatz',
            description: 'Einsätze planen (Ort-Zuordnung, AdZS-Zuteilung)',
        },
        {
            key: 'places',
            label: 'Orte',
            description: 'Orte / WK-Heime / Anlagen verwalten',
        },
        {
            key: 'adminUsers',
            label: 'Benutzerverwaltung',
            description: 'Admin-Benutzer verwalten (Genehmigung, Rollen, Details)',
        },
    ];

    isPending(key: FeatureFlagKey): boolean {
        return !!this.pending[key];
    }

    async setEnabled(key: FeatureFlagKey, enabled: boolean): Promise<void> {
        if (this.pending[key]) return;

        this.pending = { ...this.pending, [key]: true };
        this.errorMsg = null;
        this.cdr.markForCheck();

        try {
            await firstValueFrom(this.flagsService.setFlag(key, enabled));
        } catch (err) {
            this.logger.error('SettingsPage', 'setEnabled failed', err);
            this.errorMsg = 'Speichern fehlgeschlagen';
        } finally {
            this.pending = { ...this.pending, [key]: false };
            this.cdr.markForCheck();
        }
    }
}
