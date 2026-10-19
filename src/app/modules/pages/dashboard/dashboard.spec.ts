import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import Dashboard from '@pages/dashboard/dashboard';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Dashboard', (): void => {
  let fixture: ComponentFixture<Dashboard>;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);

    authStore.start({
      success: true,
      token: 'jwt-de-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 1,
        name: 'Propietario',
        email: 'propietario@example.com',
      },
      error: null,
      message: null,
    } satisfies LoginResponse);

    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(Dashboard);
    fixture.detectChanges();
  });

  afterEach((): void => {
    httpTesting.verify();
    fixture.destroy();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
  });

  it('solicita seleccionar un espacio si no hay ninguno activo', (): void => {
    expect(fixture.nativeElement.textContent).toContain('Selecciona un espacio');
  });

  it('muestra la estructura económica al seleccionar un espacio', async (): Promise<void> => {
    const loading: Promise<void> = spaceStore.load();

    httpTesting.expectOne(`${environment.apiUrl}/spaces`).flush({
      success: true,
      spaces: [
        {
          id: 2,
          name: 'Personal',
          type: 'personal',
          owner_id: 1,
          is_owner: true,
        },
      ],
    } satisfies SpacesResponse);

    await loading;
    fixture.detectChanges();

    const metrics: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.dashboard__metric');

    expect(metrics).toHaveLength(4);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Ingresos');
    expect(content).toContain('Gastos');
    expect(content).toContain('Resultado');
    expect(content).toContain('Previsión fin de mes');
    expect(content).toContain('Gastos por categorías');
    expect(content).toContain('Últimos movimientos');
  });
});
