import { TestBed } from '@angular/core/testing';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('TransactionRefreshService', (): void => {
  let service: TransactionRefreshService;

  beforeEach((): void => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionRefreshService);
  });

  it('comienza sin cambios notificados', (): void => {
    expect(service.version()).toBe(0);
  });

  it('incrementa la versión al notificar cambios', (): void => {
    service.notifyChanged();
    expect(service.version()).toBe(1);

    service.notifyChanged();
    expect(service.version()).toBe(2);
  });
});
