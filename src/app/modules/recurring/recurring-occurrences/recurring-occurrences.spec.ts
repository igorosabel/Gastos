import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { environment } from '@env/environment';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import GenerateRecurringSpaceResponse from '@interfaces/recurring/generate-recurring-space-response.interface';
import type RecurringOccurrencesResponse from '@interfaces/recurring/recurring-occurrences-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Category from '@model/categories/category.model';
import type RecurringOccurrence from '@model/recurring/recurring-occurrence.model';
import { getCurrentMonth, shiftMonth } from '@model/reports/month-period';
import RecurringOccurrences from '@modules/recurring/recurring-occurrences/recurring-occurrences';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('RecurringOccurrences', (): void => {
  let fixture: ComponentFixture<RecurringOccurrences>;
  let component: RecurringOccurrences;
  let spaceStore: SpaceStore;
  let authStore: AuthStore;
  let httpTesting: HttpTestingController;

  const period: string = `${getCurrentMonth()}-01`;

  const categories: Category[] = [
    {
      id: 20,
      space_id: 2,
      parent_id: null,
      name: 'Suministros',
      default_type: 'expense',
      sort_order: 0,
    },
  ];

  function occurrence(
    spaceId: number,
    selectedPeriod: string,
    status: 'pending' | 'confirmed' | 'skipped' = 'pending',
  ): RecurringOccurrence {
    return {
      id: 80,
      space_id: spaceId,
      recurring_id: 50,
      period: selectedPeriod,
      scheduled_date: `${selectedPeriod.slice(0, 7)}-20`,
      status,
      category_id: 20,
      type: 'expense',
      concept: 'Electricidad',
      amount: '95.40',
      transaction_id: status === 'confirmed' ? 31 : null,
      resolved_at: status === 'pending' ? null : '2026-10-20 10:00:00',
    };
  }

  function response(
    spaceId: number,
    selectedPeriod: string,
    items: RecurringOccurrence[] = [occurrence(spaceId, selectedPeriod)],
    page: number = 1,
    total: number = items.length,
    totalPages: number = total === 0 ? 0 : 1,
  ): RecurringOccurrencesResponse {
    return {
      success: true,
      occurrences: items,
      total,
      page,
      page_size: 20,
      total_pages: totalPages,
      error: null,
      message: null,
    };
  }

  function pendingRequest(): TestRequest {
    return httpTesting.expectOne(
      (request): boolean => request.url === `${environment.apiUrl}/recurring/occurrences`,
    );
  }

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [RecurringOccurrences],
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
        {
          id: 8,
          name: 'Familia',
          type: 'shared',
          owner_id: 1,
          is_owner: true,
        },
      ],
    } satisfies SpacesResponse);

    await loading;

    fixture = TestBed.createComponent(RecurringOccurrences);
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
  });

  it('consulta el mes actual sin filtro de estado', (): void => {
    const request: TestRequest = pendingRequest();

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('spaceId')).toBe('2');
    expect(request.request.params.get('periodFrom')).toBe(period);
    expect(request.request.params.get('periodTo')).toBe(period);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.has('status')).toBe(false);

    request.flush(response(2, period));
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.occurrences()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Electricidad');
    expect(fixture.nativeElement.textContent).toContain('Suministros');
    expect(fixture.nativeElement.textContent).toContain('95,40 €');
  });

  it('filtra por estado y cancela la consulta anterior', (): void => {
    const previous: TestRequest = pendingRequest();

    component.setStatus('confirmed');
    fixture.detectChanges();

    expect(previous.cancelled).toBe(true);
    expect(component.statusFilter()).toBe('confirmed');

    const request: TestRequest = pendingRequest();
    expect(request.request.params.get('status')).toBe('confirmed');

    request.flush(response(2, period, [occurrence(2, period, 'confirmed')]));

    fixture.detectChanges();

    expect(component.occurrences()[0]?.status).toBe('confirmed');
    expect(fixture.nativeElement.textContent).toContain('Movimiento contable #31');
  });

  it('cambia de mes y reinicia la página', (): void => {
    const previous: TestRequest = pendingRequest();

    component.previousMonth();
    fixture.detectChanges();

    expect(previous.cancelled).toBe(true);

    const previousPeriod: string = `${shiftMonth(getCurrentMonth(), -1)}-01`;

    const request: TestRequest = pendingRequest();

    expect(request.request.params.get('periodFrom')).toBe(previousPeriod);
    expect(request.request.params.get('periodTo')).toBe(previousPeriod);

    request.flush(response(2, previousPeriod));
    fixture.detectChanges();

    expect(component.page()).toBe(1);
  });

  it('permite navegar por páginas', (): void => {
    pendingRequest().flush(response(2, period, [occurrence(2, period)], 1, 21, 2));

    fixture.detectChanges();

    expect(component.total()).toBe(21);
    expect(component.totalPages()).toBe(2);

    component.nextPage();
    fixture.detectChanges();

    expect(component.page()).toBe(2);

    const second: TestRequest = pendingRequest();
    expect(second.request.params.get('page')).toBe('2');

    second.flush(response(2, period, [occurrence(2, period)], 2, 21, 2));

    fixture.detectChanges();

    component.previousPage();
    fixture.detectChanges();

    expect(component.page()).toBe(1);

    pendingRequest().flush(response(2, period, [occurrence(2, period)], 1, 21, 2));
  });

  it('muestra un estado vacío', (): void => {
    pendingRequest().flush(response(2, period, []));
    fixture.detectChanges();

    expect(component.occurrences()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain(
      'No hay ocurrencias para este mes y estado.',
    );
  });

  it('permite reintentar después de un error HTTP', (): void => {
    pendingRequest().flush(
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

    expect(component.error()).toBe('No tienes permiso para consultar estas ocurrencias.');

    component.reload();
    fixture.detectChanges();

    pendingRequest().flush(response(2, period));
    fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.occurrences()).toHaveLength(1);
  });

  it('cancela la consulta al cambiar de espacio', (): void => {
    const previous: TestRequest = pendingRequest();

    spaceStore.select(8);
    fixture.componentRef.setInput('spaceId', 8);
    fixture.detectChanges();

    expect(previous.cancelled).toBe(true);
    expect(component.occurrences()).toEqual([]);

    const request: TestRequest = pendingRequest();
    expect(request.request.params.get('spaceId')).toBe('8');

    request.flush(response(8, period));
    fixture.detectChanges();

    expect(component.occurrences()[0]?.space_id).toBe(8);
  });

  it('rechaza datos de otro periodo', (): void => {
    pendingRequest().flush(response(2, period, [occurrence(2, '2020-01-01')]));

    fixture.detectChanges();

    expect(component.occurrences()).toEqual([]);
    expect(component.error()).toBe('No se han podido obtener las ocurrencias.');
  });

  it('limpia los datos al cerrar sesión', (): void => {
    pendingRequest().flush(response(2, period));
    fixture.detectChanges();

    spaceStore.clear();
    authStore.clear();
    fixture.detectChanges();

    expect(component.occurrences()).toEqual([]);
    expect(component.loading()).toBe(false);
  });

  it('requiere confirmación antes de generar mensualidades', (): void => {
    pendingRequest().flush(response(2, period));
    fixture.detectChanges();

    component.requestGeneration();
    fixture.detectChanges();

    expect(component.confirmingGeneration()).toBe(true);
    expect(component.generating()).toBe(false);

    expect(fixture.nativeElement.textContent).toContain('Confirmar generación');

    httpTesting.expectNone(`${environment.apiUrl}/recurring/generate-space`);

    component.cancelGeneration();
    fixture.detectChanges();

    expect(component.confirmingGeneration()).toBe(false);

    httpTesting.expectNone(`${environment.apiUrl}/recurring/generate-space`);
  });

  it('genera el periodo seleccionado y actualiza las ocurrencias', (): void => {
    pendingRequest().flush(response(2, period, []));
    fixture.detectChanges();

    component.requestGeneration();
    component.confirmGeneration();
    fixture.detectChanges();

    expect(component.generating()).toBe(true);

    const request: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/generate-space`,
    );

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      spaceId: 2,
      period,
    });

    request.flush({
      success: true,
      created: 1,
      existing: 0,
      skipped: 1,
      total: 2,
      error: null,
      message: null,
    } satisfies GenerateRecurringSpaceResponse);

    fixture.detectChanges();

    expect(component.generating()).toBe(false);
    expect(component.generationError()).toBeNull();

    expect(component.generationResult()?.created).toBe(1);
    expect(component.generationResult()?.skipped).toBe(1);

    const reload: TestRequest = pendingRequest();

    expect(reload.request.params.get('spaceId')).toBe('2');
    expect(reload.request.params.get('periodFrom')).toBe(period);
    expect(reload.request.params.get('page')).toBe('1');
    expect(reload.request.params.has('status')).toBe(false);

    reload.flush(response(2, period));
    fixture.detectChanges();

    expect(component.occurrences()).toHaveLength(1);

    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Generación completada');
    expect(content).toContain('1 nuevas');
    expect(content).toContain('0 existentes');
    expect(content).toContain('1 no aplicables');
  });

  it('impide una segunda generación mientras hay otra pendiente', (): void => {
    pendingRequest().flush(response(2, period));
    fixture.detectChanges();

    component.requestGeneration();
    component.confirmGeneration();

    component.requestGeneration();
    component.confirmGeneration();

    const requests: TestRequest[] = httpTesting.match(
      `${environment.apiUrl}/recurring/generate-space`,
    );

    expect(requests).toHaveLength(1);
    expect(component.generating()).toBe(true);

    requests[0]!.flush({
      success: true,
      created: 0,
      existing: 1,
      skipped: 0,
      total: 1,
      error: null,
      message: null,
    } satisfies GenerateRecurringSpaceResponse);

    fixture.detectChanges();

    pendingRequest().flush(response(2, period));

    expect(component.generating()).toBe(false);
  });

  it('permite reintentar manualmente después de un fallo parcial', (): void => {
    pendingRequest().flush(response(2, period, []));
    fixture.detectChanges();

    component.requestGeneration();
    component.confirmGeneration();

    const first: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/generate-space`,
    );

    first.flush(
      {
        success: false,
        error: 'generation_error',
        message: 'Error de procesamiento',
      },
      {
        status: 500,
        statusText: 'Internal Server Error',
      },
    );

    fixture.detectChanges();

    expect(component.generating()).toBe(false);
    expect(component.generationResult()).toBeNull();

    expect(component.generationError()).toContain('Algunas mensualidades pueden haberse generado');

    // El frontend consulta de nuevo por si el backend
    // conservó ocurrencias generadas antes del error.
    pendingRequest().flush(response(2, period, [occurrence(2, period)]));

    fixture.detectChanges();

    expect(component.occurrences()).toHaveLength(1);

    // El reintento solamente se produce por una
    // nueva acción explícita del usuario.
    component.requestGeneration();
    component.confirmGeneration();

    const retry: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/generate-space`,
    );

    expect(retry.request.body).toEqual({
      spaceId: 2,
      period,
    });

    retry.flush({
      success: true,
      created: 0,
      existing: 1,
      skipped: 0,
      total: 1,
      error: null,
      message: null,
    } satisfies GenerateRecurringSpaceResponse);

    fixture.detectChanges();

    pendingRequest().flush(response(2, period));

    expect(component.generationResult()?.existing).toBe(1);
    expect(component.generationError()).toBeNull();
  });

  it('rechaza una respuesta con contadores incoherentes', (): void => {
    pendingRequest().flush(response(2, period, []));
    fixture.detectChanges();

    component.requestGeneration();
    component.confirmGeneration();

    httpTesting.expectOne(`${environment.apiUrl}/recurring/generate-space`).flush({
      success: true,
      created: 2,
      existing: 1,
      skipped: 0,
      total: 2,
      error: null,
      message: null,
    } satisfies GenerateRecurringSpaceResponse);

    fixture.detectChanges();

    expect(component.generationResult()).toBeNull();
    expect(component.generationError()).toContain('No se ha podido verificar el resultado');

    pendingRequest().flush(response(2, period));
  });

  it('descarta la generación pendiente al cambiar de espacio', (): void => {
    pendingRequest().flush(response(2, period));
    fixture.detectChanges();

    component.requestGeneration();
    component.confirmGeneration();

    const request: TestRequest = httpTesting.expectOne(
      `${environment.apiUrl}/recurring/generate-space`,
    );

    spaceStore.select(8);
    fixture.componentRef.setInput('spaceId', 8);
    fixture.detectChanges();

    expect(request.cancelled).toBe(true);
    expect(component.generating()).toBe(false);
    expect(component.generationResult()).toBeNull();
    expect(component.generationError()).toBeNull();

    const newRequest: TestRequest = pendingRequest();

    expect(newRequest.request.params.get('spaceId')).toBe('8');

    newRequest.flush(response(8, period, []));
    fixture.detectChanges();

    expect(component.occurrences()).toEqual([]);
  });
});
