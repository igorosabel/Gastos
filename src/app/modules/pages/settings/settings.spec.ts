import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import { environment } from '@env/environment';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import Settings from '@pages/settings/settings';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AuthStore from '@auth/auth.store';
import type { LoginResponse } from '@interfaces/auth.interfaces';

describe('Settings', (): void => {
  let fixture: ComponentFixture<Settings>;
  let component: Settings;
  let spaceStore: SpaceStore;
  let httpTesting: HttpTestingController;
  let authStore: AuthStore;

  beforeEach(async (): Promise<void> => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    authStore = TestBed.inject(AuthStore);

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

    spaceStore = TestBed.inject(SpaceStore);
    httpTesting = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(Settings);
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

  it('agrupa la administración dentro de Ajustes', (): void => {
    const content: string = fixture.nativeElement.textContent;

    expect(content).toContain('Ajustes');
    expect(content).toContain('Categorías');
    expect(content).toContain('Gestión de espacios');
    expect(content).toContain('Unirse a un espacio compartido');
  });

  it('permite abrir y cancelar la creación de espacios', (): void => {
    component.openCreateSpace();
    fixture.detectChanges();

    expect(component.creatingSpace()).toBe(true);

    component.cancelCreateSpace();
    fixture.detectChanges();

    expect(component.creatingSpace()).toBe(false);
  });

  it('muestra el espacio seleccionado', async (): Promise<void> => {
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
      ],
    } satisfies SpacesResponse);

    await loading;
    fixture.detectChanges();

    expect(spaceStore.selectedId()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Personal');
  });
});
