import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  InMemoryScrollingOptions,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import routes from '@app/app.routes';
import provideCore from '@app/core';
import gastosPreset from '@app/gastos-preset';
import license from '@env/license';
import authInterceptor from '@interceptors/auth.interceptor';
import { es } from 'primelocale/es.json';
import { providePrimeNG } from 'primeng/config';

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
  anchorScrolling: 'enabled',
};

const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions(),
      withInMemoryScrolling(scrollConfig),
      withComponentInputBinding(),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      translation: es,
      ripple: true,
      theme: {
        preset: gastosPreset,
        options: {
          darkModeSelector: '.gastos-app-dark',
        },
      },
      license: license,
    }),
    provideCore(),
  ],
};

export default appConfig;
