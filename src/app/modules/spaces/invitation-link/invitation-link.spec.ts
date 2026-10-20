import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import PendingInvitationStore from '@app/spaces/pending-invitation.store';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import type AcceptSpaceInvitationResponse from '@interfaces/spaces/accept-space-invitation-response.interface';
import InvitationLink from '@modules/spaces/invitation-link/invitation-link';
import SpacesService from '@services/spaces.service';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN: string = 'a'.repeat(64);

describe('InvitationLink', (): void => {
  let routeStub: { snapshot: { fragment: string | null } };
  let authStore: AuthStore;
  let pendingStore: PendingInvitationStore;
  let spaceStore: SpaceStore;
  let spacesService: SpacesService;
  let router: Router;
  let fixture: ComponentFixture<InvitationLink> | null;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();
    fixture = null;
    routeStub = {
      snapshot: {
        fragment: null,
      },
    };

    await TestBed.configureTestingModule({
      imports: [InvitationLink],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: routeStub,
        },
      ],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);
    pendingStore = TestBed.inject(PendingInvitationStore);
    spaceStore = TestBed.inject(SpaceStore);
    spacesService = TestBed.inject(SpacesService);
    router = TestBed.inject(Router);
  });

  afterEach((): void => {
    fixture?.destroy();
    authStore.clear();
    spaceStore.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  function render(fragment: string | null): InvitationLink {
    routeStub.snapshot.fragment = fragment;

    fixture = TestBed.createComponent(InvitationLink);
    fixture.detectChanges();

    return fixture.componentInstance;
  }

  function authenticate(): void {
    authStore.start({
      success: true,
      token: 'jwt-invitado',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 2,
        name: 'Invitado',
        email: 'invitado@example.com',
      },
      error: null,
      message: null,
    } satisfies LoginResponse);
  }

  it('recupera el token del enlace', (): void => {
    render(`token=${TOKEN}`);

    expect(pendingStore.token()).toBe(TOKEN);
    expect(sessionStorage.getItem('gastos.pending-invitation.v1')).toBe(TOKEN);
  });

  it('ofrece iniciar sesión o registrarse al invitado', (): void => {
    render(`token=${TOKEN}`);

    expect(fixture?.nativeElement.textContent).toContain('Iniciar sesión');

    expect(fixture?.nativeElement.textContent).toContain('Crear una cuenta');
  });

  it('rechaza un enlace inválido', (): void => {
    const component: InvitationLink = render('token=invalido');

    expect(component.invalidLink).toBe(true);
    expect(pendingStore.token()).toBeNull();
  });

  it('acepta la invitación y limpia el token', async (): Promise<void> => {
    authenticate();

    const component: InvitationLink = render(`token=${TOKEN}`);

    const response: AcceptSpaceInvitationResponse = {
      success: true,
      space: {
        id: 8,
        name: 'Familia',
        type: 'shared',
        owner_id: 1,
        is_owner: false,
      },
      error: null,
      message: null,
    };

    const acceptSpy = vi.spyOn(spacesService, 'acceptInvitation').mockReturnValue(of(response));

    const addSpy = vi.spyOn(spaceStore, 'addAccepted').mockReturnValue(true);

    await component.accept();

    expect(acceptSpy).toHaveBeenCalledWith({
      token: TOKEN,
    });
    expect(addSpy).toHaveBeenCalledWith(response.space);
    expect(component.acceptedSpace()?.id).toBe(8);
    expect(pendingStore.token()).toBeNull();
  });

  it('conserva la invitación si pertenece a otra cuenta', async (): Promise<void> => {
    authenticate();

    const component: InvitationLink = render(`token=${TOKEN}`);

    vi.spyOn(spacesService, 'acceptInvitation').mockReturnValue(
      throwError(
        (): HttpErrorResponse =>
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
          }),
      ),
    );

    await component.accept();

    expect(component.error()).toContain('otra cuenta');
    expect(pendingStore.token()).toBe(TOKEN);
  });

  it('permite cambiar de cuenta sin perder la invitación', (): void => {
    authenticate();

    const component: InvitationLink = render(`token=${TOKEN}`);

    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.changeAccount();

    expect(authStore.isAuthenticated()).toBe(false);
    expect(pendingStore.token()).toBe(TOKEN);
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: {
        returnUrl: '/invitacion',
      },
    });
  });
});
