import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type CreateSpaceInvitationResponse from '@interfaces/spaces/create-space-invitation-response.interface';
import CreateInvitation from '@modules/spaces/create-invitation/create-invitation';
import SpacesService from '@services/spaces.service';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CreateInvitation', () => {
  let fixture: ComponentFixture<CreateInvitation>;
  let component: CreateInvitation;
  let service: SpacesService;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CreateInvitation],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateInvitation);
    fixture.componentRef.setInput('spaceId', 8);
    component = fixture.componentInstance;
    service = TestBed.inject(SpacesService);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  function submitForm(): void {
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement as HTMLElement;
    const form: HTMLFormElement | null = element.querySelector('form');

    if (form === null) {
      throw new Error('No se ha encontrado el formulario.');
    }

    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  it('no envía un correo electrónico inválido', async (): Promise<void> => {
    const createSpy = vi.spyOn(service, 'createInvitation');

    component.invitationModel.set({
      email: 'correo-invalido',
    });

    submitForm();
    await fixture.whenStable();

    expect(component.invitationForm.email().invalid()).toBe(true);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('normaliza el correo y emite el token recibido', async (): Promise<void> => {
    const response: CreateSpaceInvitationResponse = {
      success: true,
      invitation: {
        id: 15,
        space_id: 8,
        email: 'invitado@example.com',
        token: 'token-de-prueba',
        expires_at: '2026-10-24 10:00:00',
      },
      error: null,
      message: null,
    };

    const createSpy = vi.spyOn(service, 'createInvitation').mockReturnValue(of(response));

    const emitSpy = vi.spyOn(component.created, 'emit');

    component.invitationModel.set({
      email: 'INVITADO@EXAMPLE.COM',
    });

    submitForm();
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledWith({
      spaceId: 8,
      email: 'invitado@example.com',
    });

    expect(emitSpy).toHaveBeenCalledWith('token-de-prueba');
  });
});
