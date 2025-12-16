import { Injectable } from '@angular/core';
import {
    CanActivate,
    ActivatedRouteSnapshot,
    RouterStateSnapshot,
    UrlTree,
    Router,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';

import {
    FeatureFlagKey,
    FeatureFlagsService,
} from '@core/services/feature-flags.service';
import { LoggerService } from '@core/services/logger.service';

@Injectable({ providedIn: 'root' })
export class FeatureFlagGuard implements CanActivate {
    constructor(
        private readonly flags: FeatureFlagsService,
        private readonly router: Router,
        private readonly logger: LoggerService
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<boolean | UrlTree> {
        const required = route.data['featureFlag'] as
            | FeatureFlagKey
            | FeatureFlagKey[]
            | undefined;

        if (!required || (Array.isArray(required) && required.length === 0)) {
            return of(true);
        }

        const requiredFlags: FeatureFlagKey[] = Array.isArray(required)
            ? required
            : [required];

        const fallback: string = route.data['fallback'] || '/dashboard';

        return this.flags.flags$.pipe(
            take(1),
            map((flags) => {
                const disabled = requiredFlags.filter((f) => flags[f] === false);
                if (disabled.length > 0) {
                    this.logger.info('FeatureFlagGuard', 'Feature disabled – blocking route', {
                        requiredFlags,
                        disabled,
                        url: state.url,
                    });
                    return this.router.parseUrl(fallback);
                }
                return true;
            })
        );
    }
}
