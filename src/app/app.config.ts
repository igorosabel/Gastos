import { provideHttpClient } from '@angular/common/http';
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
import license from '@env/license';
import { es } from 'primelocale/es.json';
import { providePrimeNG } from 'primeng/config';
import gastosPreset from './gastos-preset';

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
    provideHttpClient(),
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
