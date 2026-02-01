import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import AuthStore from '@auth/auth.store';
import AuthService from '@services/auth.service';
import { catchError, from, switchMap, throwError } from 'rxjs';

const AuthInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const store: AuthStore = inject(AuthStore);
  const auth: AuthService = inject(AuthService);

  const token: string | null = store.accessToken();
  const withAuth = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withAuth).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const refresh = store.refreshToken(); // si usas cookie HttpOnly, no hace falta
        if (!refresh) return throwError(() => err);

        // intentar refrescar y reintentar una vez
        return from(auth.refresh(refresh)).pipe(
          switchMap((tokens) => {
            store.applyTokens(tokens.accessToken, tokens.expiresIn, tokens.refreshToken);
            const retry = withAuth.clone({
              setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            return next(retry);
          }),
          catchError(() => throwError(() => err)),
        );
      }
      return throwError(() => err);
    }),
  );
};

export default AuthInterceptor;
