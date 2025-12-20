import { Provider } from '@angular/core';

import { DASHBOARD_WIDGETS } from '@core/dashboard/dashboard-widgets';

export const PLANNING_DASHBOARD_WIDGET_PROVIDER: Provider = {
    provide: DASHBOARD_WIDGETS,
    multi: true,
    useValue: {
        id: 'planning',
        title: 'Einsatz',
        order: 25,
        featureFlag: 'planning',
        roles: ['admin'],
        loadComponent: () =>
            import('./components/planning-dashboard-widget/planning-dashboard-widget').then(
                (m) => m.PlanningDashboardWidget
            ),
    },
};
