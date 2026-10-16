import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type CreateSpaceResponse from '@interfaces/create-space-response.interface';
import type Space from '@model/spaces/space.model';
import CreateSpace from '@modules/spaces/create-space/create-space';
import SpacesService from '@services/spaces.service';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('CreateSpace', () => {
  let fixture: ComponentFixture<CreateSpace>;
  let component: CreateSpace;
  let spacesService: SpacesService;

  beforeEach(async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CreateSpace],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateSpace);
    component = fixture.componentInstance;
    spacesService = TestBed.inject(SpacesService);

    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach((): void => {
    vi.restoreAllMocks();
  });

  /**
   * Envía el formulario a través de su elemento HTML.
   */
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

  it('rechaza nombres vacíos o formados por espacios', async (): Promise<void> => {
    const createSpy = vi.spyOn(spacesService, 'createSpace');

    component.spaceModel.set({
      name: '   ',
    });

    submitForm();
    await fixture.whenStable();

    expect(component.spaceForm.name().invalid()).toBe(true);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('envía el nombre normalizado y emite el espacio creado', async (): Promise<void> => {
    const space: Space = {
      id: 9,
      name: 'Familia',
      type: 'shared',
      owner_id: 1,
      is_owner: true,
    };

    const response: CreateSpaceResponse = {
      success: true,
      space,
      error: null,
      message: null,
    };

    const createSpy = vi.spyOn(spacesService, 'createSpace').mockReturnValue(of(response));

    const emitSpy = vi.spyOn(component.created, 'emit');

    component.spaceModel.set({
      name: '  Familia  ',
    });

    submitForm();
    await fixture.whenStable();

    expect(createSpy).toHaveBeenCalledWith({
      name: 'Familia',
    });

    expect(emitSpy).toHaveBeenCalledWith(space);
  });

  it('no admite nombres de más de 100 caracteres', async (): Promise<void> => {
    const createSpy = vi.spyOn(spacesService, 'createSpace');

    component.spaceModel.set({
      name: 'a'.repeat(101),
    });

    submitForm();
    await fixture.whenStable();

    expect(component.spaceForm.name().invalid()).toBe(true);
    expect(createSpy).not.toHaveBeenCalled();
  });
});
