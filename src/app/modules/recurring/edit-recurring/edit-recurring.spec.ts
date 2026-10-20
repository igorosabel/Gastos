import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type UpdateRecurringResponse from '@interfaces/recurring/update-recurring-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Category from '@model/categories/category.model';
import type Recurring from '@model/recurring/recurring.model';
import EditRecurring from '@modules/recurring/edit-recurring/edit-recurring';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('EditRecurring', (): void => {
  let fixture: ComponentFixture<EditRecurring>;
  let component: EditRecurring;
  let spaceStore: SpaceStore;
  let authStore: AuthStore;
  let httpTesting: HttpTestingController;

  const recurring: Recurring = {
    id: 50,
    space_id: 2,
    category_id: 20,
    type: 'expense',
    amount: '95.40',
    concept: 'Electricidad',
    day_of_month: 20,
    start_date: '2026-10-01',
    end_date: null,
    active: false,
  };

  const categories: Category[] = [
    {
      id: 20,
      space_id: 2,
      parent_id: null,
      name: 'Hogar',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 22,
      space_id: 2,
      parent_id: 20,
      name: 'Suministros',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 21,
      space_id: 2,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 0,
    },
  ];

  function submitForm(): void {
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );

    fixture.detectChanges();
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [EditRecurring],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

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

    fixture = TestBed.createComponent(EditRecurring);
    fixture.componentRef.setInput('recurring', recurring);
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

  it('carga los datos y no muestra errores iniciales', (): void => {
    expect(component.recurringModel()).toEqual({
      type: 'expense',
      categoryId: 20,
      amount: '95.40',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: '',
    });

    expect(component.showErrors()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.recurring-form__error')).toHaveLength(0);
  });

  it('mantiene las categorías jerárquicas', (): void => {
    expect(component.categoryOptions()).toEqual([
      { label: 'Hogar', value: 20, depth: 0 },
      { label: 'Suministros', value: 22, depth: 1 },
    ]);
  });

  it('limpia la categoría al cambiar a ingreso', (): void => {
    component.changeType('income');
    fixture.detectChanges();

    expect(component.recurringModel().type).toBe('income');
    expect(component.recurringModel().categoryId).toBeNull();

    expect(component.categoryOptions()).toEqual([{ label: 'Nómina', value: 21, depth: 0 }]);
  });

  it('permite cancelar sin realizar peticiones', (): void => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledOnce();

    httpTesting.expectNone(`${environment.apiUrl}/recurring/update`);
  });

  it('impide guardar un importe inválido', async (): Promise<void> => {
    component.recurringModel.update((model) => ({ ...model, amount: '0' }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.showErrors()).toBe(true);

    httpTesting.expectNone(`${environment.apiUrl}/recurring/update`);
  });

  it('impide guardar una fecha final anterior al inicio', async (): Promise<void> => {
    component.recurringModel.update((model) => ({
      ...model,
      endDate: '2026-09-30',
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    expect(component.recurringForm.endDate().invalid()).toBe(true);

    httpTesting.expectNone(`${environment.apiUrl}/recurring/update`);
  });

  it('envía los cambios con el importe normalizado', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.recurringModel.update((model) => ({
      ...model,
      amount: '105',
      concept: 'Electricidad nueva',
    }));

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      recurringId: 50,
      categoryId: 20,
      type: 'expense',
      amount: '105.00',
      concept: 'Electricidad nueva',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: null,
    });

    const updated: Recurring = {
      ...recurring,
      amount: '105.00',
      concept: 'Electricidad nueva',
    };

    request.flush({
      success: true,
      recurring: updated,
      error: null,
      message: null,
    } satisfies UpdateRecurringResponse);

    await fixture.whenStable();

    expect(savedSpy).toHaveBeenCalledOnce();
    expect(savedSpy).toHaveBeenCalledWith(updated);
  });

  it.each([
    [400, 'Los datos del recurrente no son válidos.'],
    [403, 'No tienes permiso para editar este recurrente.'],
    [404, 'El recurrente ya no está disponible.'],
    [409, 'No se ha podido editar el recurrente por un conflicto.'],
  ])('muestra el error HTTP %i', async (status: number, message: string): Promise<void> => {
    submitForm();

    httpTesting.expectOne(`${environment.apiUrl}/recurring/update`).flush(
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

      expect(component.recurringForm().submitting()).toBe(false);

      expect(component.recurringForm().errors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'serverError',
            message,
          }),
        ]),
      );
    });

    expect(fixture.nativeElement.textContent).toContain(message);
  });

  it('rechaza una respuesta de otra plantilla', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    submitForm();

    httpTesting.expectOne(`${environment.apiUrl}/recurring/update`).flush({
      success: true,
      recurring: { ...recurring, id: 99 },
      error: null,
      message: null,
    } satisfies UpdateRecurringResponse);

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('ignora la respuesta si cambia el espacio', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/update`);

    spaceStore.clear();

    request.flush({
      success: true,
      recurring,
      error: null,
      message: null,
    } satisfies UpdateRecurringResponse);

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('ignora la respuesta si se cierra sesión', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring/update`);

    spaceStore.clear();
    authStore.clear();

    request.flush({
      success: true,
      recurring,
      error: null,
      message: null,
    } satisfies UpdateRecurringResponse);

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('mantiene los campos de fecha nativos dentro de sus contenedores', (): void => {
    const start: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.recurring-form__date-control #edit-recurring-start',
    );

    const end: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.recurring-form__date-control #edit-recurring-end',
    );

    expect(start?.type).toBe('date');
    expect(end?.type).toBe('date');

    const containers: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.recurring-form__date-control',
    );

    expect(containers).toHaveLength(2);
  });
});
