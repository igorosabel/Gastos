import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import AuthStore from '@auth/auth.store';

/**
 * Protege una ruta privada.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (store.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
    },
  });
};

/**
 * Evita volver al login o registro con una sesión vigente.
 */
export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  return store.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};
