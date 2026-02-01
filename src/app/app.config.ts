import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  InMemoryScrollingOptions,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import routes from '@app/app.routes';
import provideCore from '@app/core';
import AuthStore from '@auth/auth.store';
import AuthInterceptor from '@interceptors/auth.interceptor';
import { es } from 'primelocale/es.json';
import { providePrimeNG } from 'primeng/config';
import gastosPreset from './gastos-preset';

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer((): void => inject(AuthStore).hydrate()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling(scrollConfig),
      withComponentInputBinding(),
    ),
    provideHttpClient(withInterceptors([AuthInterceptor]), withFetch()),
    providePrimeNG({
      translation: es,
      ripple: true,
      theme: {
        preset: gastosPreset,
        options: {
          darkModeSelector: '.gastos-app-dark',
        },
      },
    }),
    provideCore(),
  ],
};

export default appConfig;
