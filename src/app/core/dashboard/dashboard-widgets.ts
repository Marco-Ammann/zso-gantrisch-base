import { InjectionToken, Type } from '@angular/core';

import { FeatureFlagKey } from '@core/services/feature-flags.service';

export interface DashboardWidgetDefinition {
    id: string;
    title: string;
    order: number;
    featureFlag?: FeatureFlagKey;
    roles?: string[];
    loadComponent: () => Promise<Type<unknown>>;
}

export const DASHBOARD_WIDGETS = new InjectionToken<DashboardWidgetDefinition>('DASHBOARD_WIDGETS');
