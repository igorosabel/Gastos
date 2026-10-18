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
import type Category from '@model/categories/category.model';
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

  async function loadCategories(): Promise<Category> {
    await loadSpaces();

    const category: Category = {
      id: 20,
      space_id: 2,
      parent_id: null,
      name: 'Hogar',
      default_type: 'expense',
      sort_order: 0,
    };

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush({
      success: true,
      categories: [category],
      error: null,
      message: null,
    } satisfies CategoriesResponse);

    fixture.detectChanges();

    return category;
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

  it('abre el formulario de edición de una categoría', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    expect(component.editingCategory()).toEqual(category);

    expect(fixture.nativeElement.querySelector('app-edit-category')).not.toBeNull();
  });

  it('permite cancelar la edición', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    component.cancelEditCategory();
    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();

    expect(fixture.nativeElement.querySelector('app-edit-category')).toBeNull();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it('impide editar una categoría de otro espacio', async (): Promise<void> => {
    await loadCategories();

    const external: Category = {
      id: 50,
      space_id: 8,
      parent_id: null,
      name: 'Categoría externa',
      default_type: 'expense',
      sort_order: 0,
    };

    component.openEditCategory(external);

    expect(component.editingCategory()).toBeNull();
  });

  it('impide abrir creación y edición simultáneamente', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    component.openCreateCategory();

    expect(component.editingCategory()).toEqual(category);
    expect(component.creatingCategory()).toBe(false);
  });

  it('cierra la edición cuando cambia el espacio', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    spaceStore.select(8);
    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=8`);

    request.flush({
      success: true,
      categories: [],
      error: null,
      message: null,
    } satisfies CategoriesResponse);

    fixture.detectChanges();
  });

  it('cierra la edición al actualizar el listado', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    component.reload();
    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush(categoryResponse(2, 'Hogar'));
    fixture.detectChanges();
  });

  it('actualiza las categorías después de guardar', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    component.onCategorySaved({
      ...category,
      name: 'Casa',
    });

    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories?spaceId=2`);

    request.flush(categoryResponse(2, 'Casa'));
    fixture.detectChanges();

    expect(component.categories()[0]?.name).toBe('Casa');
    expect(component.creationMessage()).toBe('Se ha actualizado la categoría «Casa».');
  });

  it('ignora una respuesta de edición de otro espacio', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);

    component.onCategorySaved({
      ...category,
      space_id: 8,
      name: 'Categoría externa',
    });

    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();

    httpTesting.expectNone(`${environment.apiUrl}/categories?spaceId=2`);

    expect(component.categories()[0]?.name).toBe('Hogar');
  });

  it('cierra la edición al finalizar la sesión', async (): Promise<void> => {
    const category: Category = await loadCategories();

    component.openEditCategory(category);
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.editingCategory()).toBeNull();
    expect(component.categories()).toEqual([]);
  });
});
