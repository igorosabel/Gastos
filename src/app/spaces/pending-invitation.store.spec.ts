import { TestBed } from '@angular/core/testing';
import PendingInvitationStore from '@app/spaces/pending-invitation.store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const TOKEN: string = 'a'.repeat(64);
const STORAGE_KEY: string = 'gastos.pending-invitation.v1';

describe('PendingInvitationStore', (): void => {
  beforeEach((): void => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach((): void => {
    sessionStorage.clear();
  });

  it('guarda y recupera la invitación tras recrear el store', (): void => {
    const store: PendingInvitationStore = TestBed.inject(PendingInvitationStore);

    expect(store.save(TOKEN)).toBe(true);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(TOKEN);

    const restored: PendingInvitationStore = TestBed.runInInjectionContext(
      (): PendingInvitationStore => new PendingInvitationStore(),
    );

    expect(restored.token()).toBe(TOKEN);
  });

  it('rechaza los tokens inválidos', (): void => {
    const store: PendingInvitationStore = TestBed.inject(PendingInvitationStore);

    expect(store.save('token-invalido')).toBe(false);
    expect(store.token()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('elimina la invitación al descartarla', (): void => {
    const store: PendingInvitationStore = TestBed.inject(PendingInvitationStore);

    store.save(TOKEN);
    store.clear();

    expect(store.token()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('reemplaza una invitación anterior al recibir otra', (): void => {
    const store: PendingInvitationStore = TestBed.inject(PendingInvitationStore);
    const newToken: string = 'b'.repeat(64);

    store.save(TOKEN);
    store.save(newToken);

    expect(store.token()).toBe(newToken);
    expect(sessionStorage.getItem(STORAGE_KEY)).toBe(newToken);
  });
});
