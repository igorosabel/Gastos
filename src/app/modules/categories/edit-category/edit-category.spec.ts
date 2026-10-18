import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type UpdateCategoryResponse from '@interfaces/categories/update-category-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Category from '@model/categories/category.model';
import EditCategory from '@modules/categories/edit-category/edit-category';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('EditCategory', (): void => {
  let fixture: ComponentFixture<EditCategory>;
  let component: EditCategory;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;

  const categories: Category[] = [
    {
      id: 10,
      space_id: 2,
      parent_id: null,
      name: 'Hogar',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 11,
      space_id: 2,
      parent_id: 10,
      name: 'Suministros',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 12,
      space_id: 2,
      parent_id: 11,
      name: 'Electricidad',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 13,
      space_id: 2,
      parent_id: null,
      name: 'Transporte',
      default_type: 'expense',
      sort_order: 1,
    },
    {
      id: 14,
      space_id: 2,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 0,
    },
    {
      id: 15,
      space_id: 8,
      parent_id: null,
      name: 'Otra familia',
      default_type: 'expense',
      sort_order: 0,
    },
  ];

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

  const updatedCategory: Category = {
    ...categories[1]!,
    name: 'Servicios',
    parent_id: 13,
  };

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [EditCategory],
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

    const loading: Promise<void> = spaceStore.load();

    httpTesting.expectOne(`${environment.apiUrl}/spaces`).flush(spacesResponse);

    await loading;

    fixture = TestBed.createComponent(EditCategory);
    fixture.componentRef.setInput('category', categories[1]);
    fixture.componentRef.setInput('categories', categories);

    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach((): void => {
    httpTesting.verify();
    fixture.destroy();
    spaceStore.clear();
    authStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function submitForm(): void {
    const formElement: HTMLFormElement = fixture.nativeElement.querySelector('form');

    formElement.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    fixture.detectChanges();
  }

  function successfulResponse(): UpdateCategoryResponse {
    return {
      success: true,
      category: updatedCategory,
      error: null,
      message: null,
    };
  }

  it('inicializa el formulario con los datos de la categoría', (): void => {
    expect(component.editModel()).toEqual({
      name: 'Suministros',
      parentId: 10,
    });

    expect(fixture.nativeElement.textContent).toContain('Editar categoría');

    expect(fixture.nativeElement.textContent).toContain('Gasto');
  });

  it('no ofrece un campo editable para el tipo', (): void => {
    const typeSelect: Element | null = fixture.nativeElement.querySelector('#edit-category-type');

    expect(typeSelect).toBeNull();
    expect(component.category().default_type).toBe('expense');
  });

  it('excluye la propia categoría y sus descendientes', (): void => {
    expect([...component.excludedIds()].sort()).toEqual([11, 12]);

    const ids: (number | null)[] = component
      .parentOptions()
      .map((option): number | null => option.value);

    expect(ids).toContain(null);
    expect(ids).toContain(10);
    expect(ids).toContain(13);
    expect(ids).not.toContain(11);
    expect(ids).not.toContain(12);
  });

  it('excluye categorías de otro tipo y espacio', (): void => {
    const ids: (number | null)[] = component
      .parentOptions()
      .map((option): number | null => option.value);

    expect(ids).not.toContain(14);
    expect(ids).not.toContain(15);
  });

  it('conserva la profundidad de las opciones', (): void => {
    const hogar = component.parentOptions().find((option): boolean => option.value === 10);

    const transporte = component.parentOptions().find((option): boolean => option.value === 13);

    expect(hogar?.depth).toBe(0);
    expect(transporte?.depth).toBe(0);
  });

  it('permite cancelar sin realizar una petición', (): void => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledOnce();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it('no envía un nombre compuesto solo por espacios', async (): Promise<void> => {
    component.editModel.update((model) => ({
      ...model,
      name: '   ',
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it('no envía un nombre que supere 100 caracteres', async (): Promise<void> => {
    component.editModel.update((model) => ({
      ...model,
      name: 'A'.repeat(101),
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it('envía los datos correctos y emite el resultado', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.editModel.set({
      name: '  Servicios  ',
      parentId: 13,
    });

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      categoryId: 11,
      name: 'Servicios',
      parentId: 13,
      sortOrder: 0,
    });

    request.flush(successfulResponse());

    await fixture.whenStable();

    expect(savedSpy).toHaveBeenCalledOnce();
    expect(savedSpy).toHaveBeenCalledWith(updatedCategory);
  });

  it('no envía una categoría padre que sea descendiente', async (): Promise<void> => {
    component.editModel.set({
      name: 'Suministros',
      parentId: 12,
    });

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it('no envía una categoría padre de otro tipo', async (): Promise<void> => {
    component.editModel.set({
      name: 'Suministros',
      parentId: 14,
    });

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/categories/update`);
  });

  it.each([
    [400, 'Los datos de la categoría no son válidos.'],
    [403, 'No tienes permiso para editar esta categoría.'],
    [404, 'La categoría ya no está disponible.'],
    [409, 'La jerarquía propuesta no es válida.'],
  ])('muestra el error HTTP %i', async (status: number, message: string): Promise<void> => {
    component.editModel.update((model) => ({
      ...model,
      name: 'Servicios',
    }));

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    request.flush(
      {
        success: false,
        error: 'test_error',
        message: 'Error de prueba',
      },
      {
        status,
        statusText: 'Error',
      },
    );

    await vi.waitFor((): void => {
      fixture.detectChanges();

      expect(component.editForm().submitting()).toBe(false);
      expect(component.editForm().errors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'serverError',
            message,
          }),
        ]),
      );
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it('descarta el resultado si cambia el espacio', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.editModel.update((model) => ({
      ...model,
      name: 'Servicios',
    }));

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    spaceStore.select(8);

    request.flush(successfulResponse());

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('descarta el resultado si termina la sesión', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.editModel.update((model) => ({
      ...model,
      name: 'Servicios',
    }));

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    authStore.clear();
    spaceStore.clear();

    request.flush(successfulResponse());

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('descarta el resultado si se destruye el componente', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.editModel.update((model) => ({
      ...model,
      name: 'Servicios',
    }));

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/categories/update`);

    fixture.destroy();

    request.flush(successfulResponse());

    expect(savedSpy).not.toHaveBeenCalled();
  });
});
