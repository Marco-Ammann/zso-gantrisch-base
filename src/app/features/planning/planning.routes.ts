import { Routes } from '@angular/router';

export const planningRoutes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./planning-overview/planning-overview.page').then(
                (m) => m.PlanningOverviewPage
            ),
        title: 'Einsatz',
    },
    {
        path: 'new',
        loadComponent: () =>
            import('./mission-edit/mission-edit.page').then((m) => m.MissionEditPage),
        title: 'Neuer Einsatz',
    },
    {
        path: ':id',
        loadComponent: () =>
            import('./mission-detail/mission-detail.page').then(
                (m) => m.MissionDetailPage
            ),
        title: 'Einsatz',
    },
    {
        path: ':id/edit',
        loadComponent: () =>
            import('./mission-edit/mission-edit.page').then((m) => m.MissionEditPage),
        title: 'Einsatz bearbeiten',
    },
];
