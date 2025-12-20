import { Provider } from '@angular/core';

import { DASHBOARD_WIDGETS } from '@core/dashboard/dashboard-widgets';

export const PLACES_DASHBOARD_WIDGET_PROVIDER: Provider = {
    provide: DASHBOARD_WIDGETS,
    multi: true,
    useValue: {
        id: 'places',
        title: 'Places',
        order: 20,
        featureFlag: 'places',
        loadComponent: () =>
            import('./components/places-dashboard-widget/places-dashboard-widget').then(
                (m) => m.PlacesDashboardWidget
            ),
    },
};
