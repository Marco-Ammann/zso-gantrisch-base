import { Provider } from '@angular/core';

import { DASHBOARD_WIDGETS } from '@core/dashboard/dashboard-widgets';

export const ADZS_DASHBOARD_WIDGET_PROVIDER: Provider = {
    provide: DASHBOARD_WIDGETS,
    multi: true,
    useValue: {
        id: 'adsz',
        title: 'AdZS',
        order: 10,
        featureFlag: 'adsz',
        loadComponent: () =>
            import('./components/adsz-dashboard-widget/adsz-dashboard-widget').then(
                (m) => m.AdzsDashboardWidget
            ),
    },
};
