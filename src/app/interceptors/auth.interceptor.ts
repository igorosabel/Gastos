import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import { catchError, throwError } from 'rxjs';

const API_PREFIX = `${environment.apiUrl}/`;

const PUBLIC_ENDPOINTS = new Set([
  `${environment.apiUrl}/auth/login`,
  `${environment.apiUrl}/auth/register`,
]);

const authInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthStore);
  const router = inject(Router);

  // No modificar peticiones dirigidas a otros servidores.
  if (!request.url.startsWith(API_PREFIX)) {
    return next(request);
  }

  const urlWithoutQuery = request.url.split('?')[0];
  const isPublic = PUBLIC_ENDPOINTS.has(urlWithoutQuery);

  // Nunca enviar un JWT antiguo a login o registro.
  const token = isPublic ? null : store.token();

  const authorizedRequest = token
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(authorizedRequest).pipe(
    catchError((error: unknown) => {
      if (
        !isPublic &&
        token !== null &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        store.clearIfToken(token)
      ) {
        void router.navigateByUrl('/login');
      }

      return throwError(() => error);
    }),
  );
};

export default authInterceptor;
