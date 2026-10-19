import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '@guard/auth.guards';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@modules/auth/login/login').then((m) => m.default),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('@modules/auth/register/register').then((m) => m.default),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('@layout/private-layout/private-layout').then((m) => m.default),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@pages/dashboard/dashboard').then((m) => m.default),
      },
      {
        path: 'categories',
        loadComponent: () => import('@pages/categories/categories').then((m) => m.default),
      },
      {
        path: 'transactions',
        loadComponent: () => import('@pages/transactions/transactions').then((m) => m.default),
      },
      {
        path: 'reports',
        loadComponent: () => import('@pages/reports/reports').then((m) => m.default),
      },
      {
        path: 'settings',
        loadComponent: () => import('@pages/settings/settings').then((m) => m.default),
      },
      {
        path: 'recurring',
        loadComponent: () => import('@pages/recurring/recurring').then((m) => m.default),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

export default routes;
