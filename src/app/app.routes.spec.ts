import type { Route } from '@angular/router';
import routes from '@app/app.routes';
import { authGuard } from '@guard/auth.guards';
import { describe, expect, it } from 'vitest';

describe('Rutas privadas', (): void => {
  const privateRoute: Route | undefined = routes.find(
    (route: Route): boolean => route.path === '' && route.children !== undefined,
  );

  it('protege el layout privado con authGuard', (): void => {
    expect(privateRoute).toBeDefined();
    expect(privateRoute?.canActivate).toContain(authGuard);
    expect(privateRoute?.loadComponent).toBeDefined();
  });

  it('mantiene el dashboard como ruta hija diferida', (): void => {
    const dashboardRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'dashboard',
    );

    expect(dashboardRoute).toBeDefined();
    expect(dashboardRoute?.loadComponent).toBeDefined();
    expect(dashboardRoute?.component).toBeUndefined();
  });

  it('mantiene login y registro fuera del layout privado', (): void => {
    const login: Route | undefined = routes.find((route: Route): boolean => route.path === 'login');

    const register: Route | undefined = routes.find(
      (route: Route): boolean => route.path === 'register',
    );

    expect(login?.loadComponent).toBeDefined();
    expect(register?.loadComponent).toBeDefined();
    expect(
      privateRoute?.children?.some(
        (route: Route): boolean => route.path === 'login' || route.path === 'register',
      ),
    ).toBe(false);
  });

  it('mantiene categorías como ruta hija diferida', (): void => {
    const categoriesRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'categories',
    );

    expect(categoriesRoute).toBeDefined();
    expect(categoriesRoute?.loadComponent).toBeDefined();
    expect(categoriesRoute?.component).toBeUndefined();
  });

  it('mantiene movimientos como ruta hija diferida', (): void => {
    const transactionsRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'transactions',
    );

    expect(transactionsRoute).toBeDefined();
    expect(transactionsRoute?.loadComponent).toBeDefined();
    expect(transactionsRoute?.component).toBeUndefined();
  });

  it('mantiene Ajustes como ruta privada diferida', (): void => {
    const settingsRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'settings',
    );

    expect(settingsRoute).toBeDefined();
    expect(settingsRoute?.loadComponent).toBeDefined();
    expect(settingsRoute?.component).toBeUndefined();
  });

  it('mantiene Informes como ruta privada diferida', (): void => {
    const reportsRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'reports',
    );

    expect(reportsRoute).toBeDefined();
    expect(reportsRoute?.loadComponent).toBeDefined();
    expect(reportsRoute?.component).toBeUndefined();
  });

  it('mantiene recurrentes como ruta privada diferida', (): void => {
    const recurringRoute: Route | undefined = privateRoute?.children?.find(
      (route: Route): boolean => route.path === 'recurring',
    );

    expect(recurringRoute).toBeDefined();
    expect(recurringRoute?.loadComponent).toBeDefined();
    expect(recurringRoute?.component).toBeUndefined();
  });
});
