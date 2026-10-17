
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';
import SpaceInvitations from '@modules/spaces/space-invitations/space-invitations';
import SpacesService from '@services/spaces.service';
import { of, type Observable } from 'rxjs';
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
});
