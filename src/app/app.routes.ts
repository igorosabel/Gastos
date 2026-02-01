import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@pages/login/login').then((m) => m.default),
  },
  {
    path: 'register',
    loadComponent: () => import('@pages/register/register').then((m) => m.default),
  },
];

export default routes;
