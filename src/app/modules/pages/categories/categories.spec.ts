import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import Categories from '@pages/categories/categories';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Categories', (): void => {
  let fixture: ComponentFixture<Categories>;
  let component: Categories;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;

  const spacesResponse: SpacesResponse = {
    success: true,
    spaces: [
      {
        id: 2,
        name: 'Personal',
        type: 'personal',
        owner_id: 1,
        is_owner: true,
      },
      {
        id: 8,
        name: 'Familia',
        type: 'shared',
        owner_id: 1,
        is_owner: true,
      },
    ],
  };

  function categoryResponse(spaceId: number, name: string): CategoriesResponse {
    return {
      success: true,
      categories: [
        {
          id: spaceId * 10,
          space_id: spaceId,
          parent_id: null,
          name,
          default_type: 'expense',
          sort_order: 0,
        },
      ],
      error: null,
      message: null,
    };
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Categories],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

    const login: LoginResponse = {
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
    };

    authStore.start(login);

    fixture = TestBed.createComponent(Categories);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach((): void => {
    httpTesting.verify();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
  });

  async function loadSpaces(): Promise<void> {
    const loading: Promise<void> = spaceStore.load();

    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    request.flush(spacesResponse);
    await loading;
    fixture.detectChanges();
  }

  it('consulta las categorías del espacio seleccionado', async (): Promise<void> => {
    await loadSpaces();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    expect(request.request.method).toBe('GET');

    request.flush(categoryResponse(2, 'Alimentación'));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.categories()[0]?.name).toBe('Alimentación');
    expect(component.rows()).toHaveLength(1);
  });

  it('muestra el estado vacío', async (): Promise<void> => {
    await loadSpaces();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    } satisfies CategoriesResponse);

    fixture.detectChanges();

    expect(component.categories()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'Este espacio todavía no tiene categorías.',
    );
  });

  it('permite actualizar el listado', async (): Promise<void> => {
    await loadSpaces();

    const initial = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    initial.flush(categoryResponse(2, 'Hogar'));
    fixture.detectChanges();

    component.reload();
    fixture.detectChanges();

    const refresh = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    refresh.flush(categoryResponse(2, 'Transporte'));
    fixture.detectChanges();

    expect(component.categories()[0]?.name).toBe('Transporte');
  });

  it('descarta el listado anterior al cambiar de espacio', async (): Promise<void> => {
    await loadSpaces();

    const oldRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    spaceStore.select(8);
    fixture.detectChanges();

    expect(oldRequest.cancelled).toBe(true);
    expect(component.categories()).toEqual([]);

    const newRequest = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=8`);

    newRequest.flush(categoryResponse(8, 'Viajes'));
    fixture.detectChanges();

    expect(component.categories()[0]?.name).toBe('Viajes');
    expect(component.categories()[0]?.space_id).toBe(8);
  });

  it('presenta los errores de autorización', async (): Promise<void> => {
    await loadSpaces();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush(
      {
        success: false,
        error: 'forbidden',
        message: 'Sin permisos',
      },
      {
        status: 403,
        statusText: 'Forbidden',
      },
    );

    fixture.detectChanges();

    expect(component.error()).toBe('No tienes permiso para consultar estas categorías.');
    expect(component.categories()).toEqual([]);
  });

  it('descarta los datos al cerrar la sesión', async (): Promise<void> => {
    await loadSpaces();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush(categoryResponse(2, 'Hogar'));
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.categories()).toEqual([]);
    expect(component.rows()).toEqual([]);
  });
});
