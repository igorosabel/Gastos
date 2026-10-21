import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type CreateSpaceInvitationResponse from '@interfaces/spaces/create-space-invitation-response.interface';
import type RevokeSpaceInvitationResponse from '@interfaces/spaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/spaces/space-invitations-response.interface';
import SpaceInvitations from '@modules/spaces/space-invitations/space-invitations';
import SpacesService from '@services/spaces.service';
import { from, of, throwError, type Observable } from 'rxjs';
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

  function issuedInvitation(
    emailSent: boolean,
    token: string = 'a'.repeat(64),
  ): CreateSpaceInvitationResponse {
    return {
      success: true,
      invitation: {
        id: 80,
        space_id: 8,
        email: 'invitado-8@example.com',
        token,
        expires_at: '2026-10-27 10:00:00',
      },
      email_sent: emailSent,
      error: null,
      message: null,
    };
  }

  it('carga las invitaciones del espacio seleccionado', (): void => {
    expect(service.getInvitations).toHaveBeenCalledWith(8);
    expect(component.invitations()[0]?.space_id).toBe(8);
  });

  it('elimina el resultado temporal al cambiar de espacio', async (): Promise<void> => {
    component.onCreated(issuedInvitation(false));

    expect(component.lastDelivery()?.invitation.token).toBe('a'.repeat(64));

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.lastDelivery()).toBeNull();
    expect(component.invitations()[0]?.space_id).toBe(9);
    expect(service.getInvitations).toHaveBeenCalledWith(9);
  });

  it('confirma el envío sin mostrar el token', async (): Promise<void> => {
    component.onCreated(issuedInvitation(true));
    fixture.detectChanges();
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Invitación enviada');
    expect(element.textContent).toContain('invitado-8@example.com');

    expect(
      element.querySelector('input[aria-label="Enlace de invitación para copiar"]'),
    ).toBeNull();
  });

  it('muestra un enlace completo si falla el envío', async (): Promise<void> => {
    component.onCreated(issuedInvitation(false));
    fixture.detectChanges();
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    const linkInput: HTMLInputElement | null = element.querySelector(
      'input[aria-label="Enlace de invitación para copiar"]',
    );

    expect(element.textContent).toContain('correo no confirmado');
    expect(linkInput).not.toBeNull();

    expect(linkInput?.value).toBe(`${window.location.origin}/invitacion#token=${'a'.repeat(64)}`);
  });

  it('solicita confirmación antes de reenviar', (): void => {
    const resendSpy = vi.spyOn(service, 'resendInvitation');
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    component.requestResend(invitation!);

    expect(component.resendConfirmationId()).toBe(invitation!.id);
    expect(resendSpy).not.toHaveBeenCalled();

    component.cancelResend();

    expect(component.resendConfirmationId()).toBeNull();
  });

  it('reenvía y sustituye el resultado de la última emisión', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    component.onCreated(issuedInvitation(false));

    // Dejamos que Angular procese la actualización
    // correspondiente a la creación inicial.
    fixture.detectChanges();
    await fixture.whenStable();

    const response: CreateSpaceInvitationResponse = issuedInvitation(true, 'b'.repeat(64));

    const resendSpy = vi.spyOn(service, 'resendInvitation').mockReturnValue(of(response));

    component.requestResend(invitation!);
    await component.confirmResend();

    fixture.detectChanges();
    await fixture.whenStable();

    expect(resendSpy).toHaveBeenCalledWith({
      invitationId: invitation!.id,
    });

    expect(component.lastDelivery()?.email_sent).toBe(true);
    expect(component.lastDelivery()?.invitation.token).toBe('b'.repeat(64));

    expect(component.resendConfirmationId()).toBeNull();
    expect(component.resendingId()).toBeNull();
    expect(service.getInvitations).toHaveBeenCalledTimes(3);
  });

  it('conserva el enlace alternativo si falla SMTP al reenviar', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    const response: CreateSpaceInvitationResponse = issuedInvitation(false, 'c'.repeat(64));

    vi.spyOn(service, 'resendInvitation').mockReturnValue(of(response));

    component.requestResend(invitation!);
    await component.confirmResend();

    expect(component.lastDelivery()?.email_sent).toBe(false);

    expect(component.invitationLink(component.lastDelivery()!.invitation.token)).toBe(
      `${window.location.origin}/invitacion#token=${'c'.repeat(64)}`,
    );
  });

  it('informa del cooldown sin considerar realizado el reenvío', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    vi.spyOn(service, 'resendInvitation').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 409,
            statusText: 'Conflict',
          }),
      ),
    );

    component.requestResend(invitation!);
    await component.confirmResend();

    expect(component.resendError()).toContain('un minuto');
    expect(component.resendConfirmationId()).toBe(invitation!.id);
    expect(component.lastDelivery()).toBeNull();
  });

  it('impide reenviar invitaciones que no estén pendientes', async (): Promise<void> => {
    const resendSpy = vi.spyOn(service, 'resendInvitation');
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    component.requestResend({
      ...invitation!,
      status: 'accepted',
    });

    await component.confirmResend();

    expect(component.resendConfirmationId()).toBeNull();
    expect(resendSpy).not.toHaveBeenCalled();
  });

  it('ignora la respuesta de un reenvío tras cambiar de espacio', async (): Promise<void> => {
    const invitation = component.invitations()[0];

    expect(invitation).toBeDefined();

    let resolveRequest!: (response: CreateSpaceInvitationResponse) => void;

    const pendingResponse: Promise<CreateSpaceInvitationResponse> =
      new Promise<CreateSpaceInvitationResponse>((resolve): void => {
        resolveRequest = resolve;
      });

    vi.spyOn(service, 'resendInvitation').mockReturnValue(from(pendingResponse));

    component.requestResend(invitation!);

    const resend: Promise<void> = component.confirmResend();

    fixture.componentRef.setInput('spaceId', 9);
    fixture.detectChanges();
    await fixture.whenStable();

    resolveRequest(issuedInvitation(true));

    await resend;

    expect(component.lastDelivery()).toBeNull();
    expect(component.resendingId()).toBeNull();
    expect(component.invitations()[0]?.space_id).toBe(9);
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
