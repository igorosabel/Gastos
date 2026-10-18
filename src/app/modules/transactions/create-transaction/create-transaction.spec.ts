import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type CreateTransactionResponse from '@interfaces/transactions/create-transaction-response.interface';
import type Category from '@model/categories/category.model';
import CreateTransaction from '@modules/transactions/create-transaction/create-transaction';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CreateTransaction', (): void => {
  let fixture: ComponentFixture<CreateTransaction>;
  let component: CreateTransaction;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
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
      name: 'Familia',
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
        name: 'Compartido',
        type: 'shared',
        owner_id: 1,
        is_owner: true,
      },
    ],
  };

  function successResponse(): CreateTransactionResponse {
    return {
      success: true,
      transaction: {
        id: 31,
        space_id: 2,
        user_id: 1,
        category_id: 20,
        type: 'expense',
        amount: '95.40',
        concept: 'Electricidad',
        date: '2026-10-20',
      },
      error: null,
      message: null,
    };
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

  function fillValidForm(): void {
    component.transactionModel.set({
      type: 'expense',
      categoryId: 20,
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });

    fixture.detectChanges();
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [CreateTransaction],
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

    fixture = TestBed.createComponent(CreateTransaction);
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

  it('comienza como gasto sin categoría seleccionada', (): void => {
    expect(component.transactionModel().type).toBe('expense');
    expect(component.transactionModel().categoryId).toBeNull();
    expect(component.transactionModel().amount).toBe('');
  });

  it('muestra solo categorías compatibles del espacio', (): void => {
    expect(component.categoryOptions()).toEqual([{ label: 'Hogar', value: 20 }]);
  });

  it('limpia la categoría cuando cambia el tipo', (): void => {
    component.transactionModel.update((model) => ({
      ...model,
      categoryId: 20,
    }));

    component.changeType('income');

    expect(component.transactionModel().type).toBe('income');
    expect(component.transactionModel().categoryId).toBeNull();
    expect(component.categoryOptions()).toEqual([{ label: 'Nómina', value: 21 }]);
  });

  it('cancela sin realizar una petición', (): void => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledOnce();
    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it.each([['0.00'], ['95'], ['95.4'], ['95,40'], ['-10.00'], ['abc']])(
    'rechaza el importe inválido %s',
    async (amount: string): Promise<void> => {
      fillValidForm();

      component.transactionModel.update((model) => ({
        ...model,
        amount,
      }));

      fixture.detectChanges();
      submitForm();

      await fixture.whenStable();

      httpTesting.expectNone(`${environment.apiUrl}/transactions`);
    },
  );

  it('no envía sin categoría', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      categoryId: null,
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('no envía con una categoría de otro tipo', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      categoryId: 21,
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('no envía con una categoría de otro espacio', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      categoryId: 80,
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('no envía una fecha inexistente', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      date: '2026-02-30',
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('no envía conceptos de más de 255 caracteres', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      concept: 'X'.repeat(256),
    }));

    fixture.detectChanges();
    submitForm();

    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions`);
  });

  it('envía el movimiento y emite el resultado', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);
    fillValidForm();

    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      categoryId: 20,
      type: 'expense',
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });

    request.flush(successResponse(), {
      status: 201,
      statusText: 'Created',
    });

    await fixture.whenStable();

    expect(createdSpy).toHaveBeenCalledOnce();
    expect(createdSpy).toHaveBeenCalledWith(successResponse().transaction);
  });

  it.each([
    [400, 'Los datos del movimiento no son válidos.'],
    [403, 'No tienes permiso para crear movimientos.'],
    [404, 'La categoría seleccionada ya no está disponible.'],
  ])('muestra el error HTTP %i', async (status: number, message: string): Promise<void> => {
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions`);

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

      expect(component.transactionForm().submitting()).toBe(false);
      expect(component.transactionForm().errors()).toEqual(
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

  it('no emite el resultado si cambia el espacio', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions`);

    spaceStore.select(8);
    request.flush(successResponse());

    await fixture.whenStable();

    expect(createdSpy).not.toHaveBeenCalled();
  });

  it('no emite el resultado si se cierra la sesión', async (): Promise<void> => {
    const createdSpy = vi.fn();
    component.created.subscribe(createdSpy);
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions`);

    spaceStore.clear();
    authStore.clear();
    request.flush(successResponse());

    await fixture.whenStable();

    expect(createdSpy).not.toHaveBeenCalled();
  });
});
