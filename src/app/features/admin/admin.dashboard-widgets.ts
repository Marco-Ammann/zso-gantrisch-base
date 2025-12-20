import { Provider } from '@angular/core';

import { DASHBOARD_WIDGETS } from '@core/dashboard/dashboard-widgets';

export const ADMIN_USERS_DASHBOARD_WIDGET_PROVIDER: Provider = {
    provide: DASHBOARD_WIDGETS,
    multi: true,
    useValue: {
        id: 'adminUsers',
        title: 'Benutzer',
        order: 30,
        featureFlag: 'adminUsers',
        roles: ['admin'],
        loadComponent: () =>
            import('./users/components/admin-users-dashboard-widget/admin-users-dashboard-widget').then(
                (m) => m.AdminUsersDashboardWidget
            ),
    },
};
