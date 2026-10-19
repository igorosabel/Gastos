import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type UpdateTransactionResponse from '@interfaces/transactions/update-transaction-response.interface';
import type Category from '@model/categories/category.model';
import type Transaction from '@model/transactions/transaction.model';
import EditTransaction from '@modules/transactions/edit-transaction/edit-transaction';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('EditTransaction', (): void => {
  let fixture: ComponentFixture<EditTransaction>;
  let component: EditTransaction;
  let authStore: AuthStore;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;

  const transaction: Transaction = {
    id: 31,
    space_id: 2,
    user_id: 1,
    category_id: 20,
    type: 'expense',
    amount: '95.40',
    concept: 'Electricidad',
    date: '2026-10-20',
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
      id: 21,
      space_id: 2,
      parent_id: null,
      name: 'Nómina',
      default_type: 'income',
      sort_order: 0,
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

  function successResponse(): UpdateTransactionResponse {
    return {
      success: true,
      transaction: {
        ...transaction,
        amount: '98.00',
        concept: 'Electricidad ajustada',
      },
      error: null,
      message: null,
    };
  }

  function fillValidForm(): void {
    component.transactionModel.set({
      type: 'expense',
      categoryId: 20,
      amount: '98.00',
      concept: 'Electricidad ajustada',
      date: '2026-10-20',
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
      imports: [EditTransaction],
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

    fixture = TestBed.createComponent(EditTransaction);
    fixture.componentRef.setInput('transaction', transaction);
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

  it('inicializa el formulario con el movimiento original', (): void => {
    expect(component.transactionModel()).toEqual({
      type: 'expense',
      categoryId: 20,
      amount: '95.40',
      concept: 'Electricidad',
      date: '2026-10-20',
    });
  });

  it('filtra categorías por tipo y espacio', (): void => {
    expect(component.categoryOptions()).toEqual([{ label: 'Hogar', value: 20, depth: 0 }]);
  });

  it('limpia la categoría al cambiar de tipo', (): void => {
    component.changeType('income');

    expect(component.transactionModel().type).toBe('income');
    expect(component.transactionModel().categoryId).toBeNull();
    expect(component.categoryOptions()).toEqual([{ label: 'Nómina', value: 21, depth: 0 }]);
  });

  it('cancela sin enviar ninguna petición', (): void => {
    const cancelledSpy = vi.fn();
    component.cancelled.subscribe(cancelledSpy);

    component.cancel();

    expect(cancelledSpy).toHaveBeenCalledOnce();

    httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
  });

  it.each([['0'], ['0.00'], ['-10.00'], ['95.400'], ['abc'], ['1.234,56']])(
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

      httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
    },
  );

  it('rechaza una categoría incompatible', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      categoryId: 21,
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
  });

  it('rechaza una categoría de otro espacio', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      categoryId: 80,
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
  });

  it('rechaza una fecha inexistente', async (): Promise<void> => {
    fillValidForm();

    component.transactionModel.update((model) => ({
      ...model,
      date: '2026-02-30',
    }));

    fixture.detectChanges();
    submitForm();
    await fixture.whenStable();

    httpTesting.expectNone(`${environment.apiUrl}/transactions/update`);
  });

  it('envía la actualización y emite el movimiento', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      transactionId: 31,
      categoryId: 20,
      type: 'expense',
      amount: '98.00',
      concept: 'Electricidad ajustada',
      date: '2026-10-20',
    });

    request.flush(successResponse());
    await fixture.whenStable();

    expect(savedSpy).toHaveBeenCalledOnce();
    expect(savedSpy).toHaveBeenCalledWith(successResponse().transaction);
  });

  it('permite cambiar el tipo con una categoría compatible', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    component.transactionModel.set({
      type: 'income',
      categoryId: 21,
      amount: '150.00',
      concept: 'Abono',
      date: '2026-10-21',
    });

    fixture.detectChanges();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    expect(request.request.body.type).toBe('income');
    expect(request.request.body.categoryId).toBe(21);

    request.flush({
      success: true,
      transaction: {
        ...transaction,
        type: 'income',
        category_id: 21,
        amount: '150.00',
        concept: 'Abono',
        date: '2026-10-21',
      },
      error: null,
      message: null,
    } satisfies UpdateTransactionResponse);

    await fixture.whenStable();

    expect(savedSpy).toHaveBeenCalledOnce();
  });

  it.each([
    [400, 'Los datos del movimiento no son válidos.'],
    [403, 'No tienes permiso para editar este movimiento.'],
    [404, 'El movimiento ya no está disponible.'],
    [409, 'No se puede editar un movimiento vinculado a una ocurrencia recurrente.'],
  ])('muestra el error HTTP %i', async (status: number, message: string): Promise<void> => {
    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    request.flush(
      {
        success: false,
        error: 'transaction_conflict',
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

  it('descarta el guardado al cambiar de espacio', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    spaceStore.select(8);
    request.flush(successResponse());

    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('descarta el guardado al cerrar sesión', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    spaceStore.clear();
    authStore.clear();

    request.flush(successResponse());
    await fixture.whenStable();

    expect(savedSpy).not.toHaveBeenCalled();
  });

  it('descarta el resultado si el componente se destruye', async (): Promise<void> => {
    const savedSpy = vi.fn();
    component.saved.subscribe(savedSpy);

    fillValidForm();
    submitForm();

    const request = httpTesting.expectOne(`${environment.apiUrl}/transactions/update`);

    fixture.destroy();
    request.flush(successResponse());

    expect(savedSpy).not.toHaveBeenCalled();
  });
});
