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
    loadComponent: () => import('@pages/login/login').then((m) => m.default),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('@pages/register/register').then((m) => m.default),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('@pages/dashboard/dashboard').then((m) => m.default),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];

export default routes;
