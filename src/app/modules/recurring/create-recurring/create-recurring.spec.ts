import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type CreateRecurringResponse from '@interfaces/recurring/create-recurring-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Category from '@model/categories/category.model';
import CreateRecurring from '@modules/recurring/create-recurring/create-recurring';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CreateRecurring', (): void => {
  let fixture: ComponentFixture<CreateRecurring>;
  let component: CreateRecurring;
  let spaceStore: SpaceStore;
  let authStore: AuthStore;
  let httpTesting: HttpTestingController;

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
      name: 'Electricidad',
      default_type: 'expense',
      sort_order: 0,
    },
    {
      id: 21,
      space_id: 2,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 1,
    },
    {
      id: 80,
      space_id: 8,
      parent_id: null,
      name: 'Otro espacio',
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

  function successResponse(): CreateRecurringResponse {
    return {
      success: true,
      recurring: {
        id: 50,
        space_id: 2,
        category_id: 22,
        type: 'expense',
        amount: '33.00',
        concept: 'Electricidad',
        day_of_month: 20,
        start_date: '2026-10-01',
        end_date: null,
        active: true,
      },
      error: null,
      message: null,
    };
  }

  function fillValidForm(): void {
    component.recurringModel.set({
      type: 'expense',
      categoryId: 22,
      amount: '33',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: '',
    });

    fixture.detectChanges();
  }

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

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [CreateRecurring],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
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

    httpTesting.expectOne(`${environment.apiUrl}/spaces`).flush(spacesResponse);

    await loading;

    fixture = TestBed.createComponent(CreateRecurring);
    fixture.componentRef.setInput('spaceId', 2);
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

  it('comienza como gasto y sin errores visibles', (): void => {
    expect(component.recurringModel().type).toBe('expense');
    expect(component.recurringModel().categoryId).toBeNull();
    expect(component.recurringModel().dayOfMonth).toBeNull();
    expect(component.showErrors()).toBe(false);

    expect(fixture.nativeElement.querySelectorAll('.recurring-form__error')).toHaveLength(0);
  });

  it('muestra categorías jerárquicas del espacio', (): void => {
    expect(component.categoryOptions()).toEqual([
      { label: 'Hogar', value: 20, depth: 0 },
      { label: 'Electricidad', value: 22, depth: 1 },
    ]);
  });

  it('limpia la categoría cuando cambia a ingreso', (): void => {
    fillValidForm();

    component.changeType('income');

    expect(component.recurringModel().type).toBe('income');
    expect(component.recurringModel().categoryId).toBeNull();

    expect(component.categoryOptions()).toEqual([{ label: 'Nómina', value: 21, depth: 0 }]);
  });

  it('ofrece los días del 1 al 31', (): void => {
    expect(component.dayOptions).toHaveLength(31);
    expect(component.dayOptions[0]?.value).toBe(1);
    expect(component.dayOptions[30]?.value).toBe(31);
  });

  it('muestra los errores tras intentar guardar vacío', async (): Promise<void> => {
    submitForm();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.showErrors()).toBe(true);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Selecciona una categoría.');
    expect(content).toContain('El importe es obligatorio.');
    expect(content).toContain('El concepto es obligatorio.');
    expect(content).toContain('Selecciona el día del mes.');

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it.each([['0'], ['0.00'], ['-10'], ['12.345'], ['abc']])(
    'rechaza el importe inválido %s',
    async (amount: string): Promise<void> => {
      fillValidForm();

      component.recurringModel.update((model) => ({ ...model, amount }));

      fixture.detectChanges();
      submitForm();
      await fixture.whenStable();

      httpTesting.expectNone(`${environment.apiUrl}/recurring`);
    },
  );

  it.each([0, 32, 2.5])('rechaza el día inválido %s', async (day: number): Promise<void> => {
    fillValidForm();

    component.recurringModel.update((model) => ({ ...model, dayOfMonth: day }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('rechaza una categoría incompatible', async (): Promise<void> => {
    fillValidForm();

    component.recurringModel.update((model) => ({ ...model, categoryId: 21 }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('rechaza una categoría de otro espacio', async (): Promise<void> => {
    fillValidForm();

    component.recurringModel.update((model) => ({ ...model, categoryId: 80 }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('rechaza una fecha inicial inexistente', async (): Promise<void> => {
    fillValidForm();

    component.recurringModel.update((model) => ({
      ...model,
      startDate: '2026-02-30',
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    expect(component.recurringForm.startDate().invalid()).toBe(true);

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('rechaza una fecha final anterior a la inicial', async (): Promise<void> => {
    fillValidForm();

    component.recurringModel.update((model) => ({
      ...model,
      endDate: '2026-09-30',
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    expect(component.recurringForm.endDate().invalid()).toBe(true);

    expect(fixture.nativeElement.textContent).toContain('La fecha de fin no puede ser anterior');

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('envía una plantilla activa con el importe normalizado', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      categoryId: 22,
      type: 'expense',
      amount: '33.00',
      concept: 'Electricidad',
      dayOfMonth: 20,
      startDate: '2026-10-01',
      endDate: null,
    });

    request.flush(successResponse(), {
      status: 201,
      statusText: 'Created',
    });

    await fixture.whenStable();

    expect(createdSpy).toHaveBeenCalledOnce();
    expect(createdSpy).toHaveBeenCalledWith(successResponse().recurring);
  });

  it.each([
    [400, 'Los datos del recurrente no son válidos.'],
    [403, 'No tienes permiso para crear recurrentes.'],
    [404, 'La categoría seleccionada ya no está disponible.'],
    [409, 'La plantilla entra en conflicto con otra existente.'],
  ])('muestra el error HTTP %i', async (status: number, message: string): Promise<void> => {
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring`);

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

  it('no emite la respuesta después de cambiar de espacio', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring`);

    spaceStore.select(8);

    request.flush(successResponse());
    await fixture.whenStable();

    expect(createdSpy).not.toHaveBeenCalled();
  });

  it('no emite la respuesta después de cerrar sesión', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/recurring`);

    spaceStore.clear();
    authStore.clear();

    request.flush(successResponse());
    await fixture.whenStable();

    expect(createdSpy).not.toHaveBeenCalled();
  });

  it('permite cancelar sin crear una plantilla', (): void => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledOnce();

    httpTesting.expectNone(`${environment.apiUrl}/recurring`);
  });

  it('mantiene los campos de fecha nativos dentro de sus contenedores', (): void => {
    const start: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.recurring-form__date-control #new-recurring-start',
    );

    const end: HTMLInputElement | null = fixture.nativeElement.querySelector(
      '.recurring-form__date-control #new-recurring-end',
    );

    expect(start?.type).toBe('date');
    expect(end?.type).toBe('date');

    const containers: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
      '.recurring-form__date-control',
    );

    expect(containers).toHaveLength(2);
  });
});
