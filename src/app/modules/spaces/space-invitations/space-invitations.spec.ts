import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type RevokeSpaceInvitationResponse from '@interfaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';
import SpaceInvitations from '@modules/spaces/space-invitations/space-invitations';
import SpacesService from '@services/spaces.service';
import { from, of, type Observable } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SpaceInvitations', () => {
  let fixture: ComponentFixture<SpaceInvitations>;
  let component: SpaceInvitations;
  let service: SpacesService;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [SpaceInvitations],
      providers: [provideHttpClient()],
    }).compileComponents();

    service = TestBed.inject(SpacesService);

    vi.spyOn(service, 'getInvitations').mockImplementation(
      (spaceId: number): Observable<SpaceInvitationsResponse> =>
        of({
          success: true,
          invitations: [
            {
              id: spaceId * 10,
              space_id: spaceId,
              email: `invitado-${spaceId}@example.com`,
              invited_by: 1,
              expires_at: '2026-10-24 10:00:00',
              accepted_at: null,
              revoked_at: null,
              status: 'pending',
            },
          ],
          error: null,
          message: null,
        }),
    );

    fixture = TestBed.createComponent(SpaceInvitations);
    fixture.componentRef.setInput('spaceId', 8);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('carga las invitaciones del espacio seleccionado', (): void => {
    expect(service.getInvitations).toHaveBeenCalledWith(8);
    expect(component.invitations()[0]?.space_id).toBe(8);
  });

  it('elimina el token temporal al cambiar de espacio', async (): Promise<void> => {
    component.onCreated('token-secreto');

    expect(component.createdToken()).toBe('token-secreto');

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.createdToken()).toBeNull();
    expect(component.invitations()[0]?.space_id).toBe(9);
    expect(service.getInvitations).toHaveBeenCalledWith(9);
  });

  it('solicita confirmación sin revocar inmediatamente', (): void => {
    const revokeSpy = vi.spyOn(service, 'revokeInvitation');
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    component.requestRevoke(invitation!);

    expect(component.confirmationId()).toBe(invitation!.id);
    expect(revokeSpy).not.toHaveBeenCalled();

    component.cancelRevoke();

    expect(component.confirmationId()).toBeNull();
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revoca una invitación confirmada y actualiza el listado', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    const response: RevokeSpaceInvitationResponse = {
      success: true,
      invitation: {
        ...invitation!,
        revoked_at: '2026-10-17 12:00:00',
        status: 'revoked',
      },
      error: null,
      message: null,
    };

    const revokeSpy = vi.spyOn(service, 'revokeInvitation').mockReturnValue(of(response));

    component.requestRevoke(invitation!);
    await component.confirmRevoke();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(revokeSpy).toHaveBeenCalledWith({
      invitationId: invitation!.id,
    });

    expect(component.confirmationId()).toBeNull();
    expect(component.revokingId()).toBeNull();

    // La operación debe desencadenar una nueva consulta.
    expect(service.getInvitations).toHaveBeenCalledTimes(2);
  });

  it('no permite revocar una invitación que ya no está pendiente', async (): Promise<void> => {
    const revokeSpy = vi.spyOn(service, 'revokeInvitation');

    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    component.requestRevoke({
      ...invitation!,
      status: 'accepted',
    });

    await component.confirmRevoke();

    expect(component.confirmationId()).toBeNull();
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('ignora una revocación antigua al cambiar de espacio', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    let resolveRequest!: (value: RevokeSpaceInvitationResponse) => void;

    const pendingResponse: Promise<RevokeSpaceInvitationResponse> =
      new Promise<RevokeSpaceInvitationResponse>(
        (resolve: (value: RevokeSpaceInvitationResponse) => void): void => {
          resolveRequest = resolve;
        },
      );

    vi.spyOn(service, 'revokeInvitation').mockReturnValue(from(pendingResponse));

    component.requestRevoke(invitation!);

    const revocation: Promise<void> = component.confirmRevoke();

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    resolveRequest({
      success: true,
      invitation: {
        ...invitation!,
        revoked_at: '2026-10-17 12:00:00',
        status: 'revoked',
      },
      error: null,
      message: null,
    });

    await revocation;

    expect(component.confirmationId()).toBeNull();
    expect(component.revokingId()).toBeNull();
    expect(component.invitations()[0]?.space_id).toBe(9);
    expect(service.getInvitations).toHaveBeenCalledTimes(2);
  });
});
