import { computed, inject, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import AuthStore from '@auth/auth.store';
import type { AuthUser } from '@interfaces/auth.interfaces';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
import type Space from '@model/spaces/space.model';
import SpacesService from '@services/spaces.service';
import { firstValueFrom } from 'rxjs';

@Service()
export default class SpaceStore {
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly spacesService: SpacesService = inject(SpacesService);

  private readonly userId: WritableSignal<number | null> = signal<number | null>(null);
  private readonly availableSpaces: WritableSignal<Space[]> = signal<Space[]>([]);
  private readonly selectedSpaceId: WritableSignal<number | null> = signal<number | null>(null);
  private readonly loadingState: WritableSignal<boolean> = signal<boolean>(false);
  private readonly errorState: WritableSignal<string | null> = signal<string | null>(null);

  private loadVersion: number = 0;

  readonly loading: Signal<boolean> = this.loadingState.asReadonly();
  readonly error: Signal<string | null> = this.errorState.asReadonly();

  /**
   * Expone espacios únicamente cuando corresponden al usuario actual.
   */
  readonly spaces: Signal<Space[]> = computed((): Space[] => {
    const user: AuthUser | null = this.authStore.user();

    if (user === null || this.userId() !== user.id) {
      return [];
    }

    return this.availableSpaces();
  });

  readonly selected: Signal<Space | null> = computed((): Space | null => {
    const id: number | null = this.selectedSpaceId();

    return this.spaces().find((space: Space): boolean => space.id === id) ?? null;
  });

  readonly selectedId: Signal<number | null> = computed(
    (): number | null => this.selected()?.id ?? null,
  );

  /**
   * Consulta los espacios y selecciona uno válido.
   */
  async load(): Promise<void> {
    const user: AuthUser | null = this.authStore.user();
    const token: string | null = this.authStore.token();

    if (user === null || token === null) {
      this.clear();
      return;
    }

    if (this.loadingState() && this.userId() === user.id) {
      return;
    }

    if (this.userId() !== user.id) {
      this.availableSpaces.set([]);
      this.selectedSpaceId.set(null);
    }

    this.userId.set(user.id);
    this.loadingState.set(true);
    this.errorState.set(null);

    const version: number = ++this.loadVersion;

    try {
      const response: SpacesResponse = await firstValueFrom(this.spacesService.getSpaces());

      if (version !== this.loadVersion || this.authStore.token() !== token) {
        return;
      }

      if (!response.success) {
        throw new Error('La API no ha devuelto un listado válido.');
      }

      const spaces: Space[] = response.spaces;
      const previousId: number | null = this.selectedSpaceId();

      const selected: Space | undefined =
        spaces.find((space: Space): boolean => space.id === previousId) ??
        spaces.find((space: Space): boolean => space.type === 'personal') ??
        spaces[0];

      this.availableSpaces.set(spaces);
      this.selectedSpaceId.set(selected?.id ?? null);
    } catch {
      if (version === this.loadVersion && this.authStore.token() === token) {
        this.availableSpaces.set([]);
        this.selectedSpaceId.set(null);
        this.errorState.set('No se han podido cargar los espacios.');
      }
    } finally {
      if (version === this.loadVersion) {
        this.loadingState.set(false);
      }
    }
  }

  /**
   * Selecciona exclusivamente un espacio del listado autorizado.
   */
  select(spaceId: number): boolean {
    const exists: boolean = this.spaces().some((space: Space): boolean => space.id === spaceId);

    if (!exists) {
      return false;
    }

    this.selectedSpaceId.set(spaceId);
    return true;
  }

  /**
   * Incorpora un espacio compartido creado por la API y lo selecciona.
   *
   * No acepta espacios cuando ha cambiado o terminado la sesión.
   * Invalida también cualquier carga de listado que estuviera pendiente.
   */
  addCreated(space: Space): boolean {
    const user: AuthUser | null = this.authStore.user();
    const token: string | null = this.authStore.token();

    if (
      user === null ||
      token === null ||
      this.userId() !== user.id ||
      space.id <= 0 ||
      space.type !== 'shared' ||
      space.owner_id !== user.id ||
      !space.is_owner
    ) {
      return false;
    }

    this.loadVersion += 1;
    this.loadingState.set(false);
    this.errorState.set(null);

    this.availableSpaces.update((spaces: Space[]): Space[] => [
      ...spaces.filter((existing: Space): boolean => existing.id !== space.id),
      space,
    ]);

    this.selectedSpaceId.set(space.id);

    return true;
  }

  /**
   * Incorpora un espacio compartido al que se acaba de unir
   * el usuario autenticado.
   */
  addAccepted(space: Space): boolean {
    const user: AuthUser | null = this.authStore.user();
    const token: string | null = this.authStore.token();

    if (
      user === null ||
      token === null ||
      this.userId() !== user.id ||
      !Number.isSafeInteger(space.id) ||
      space.id <= 0 ||
      !Number.isSafeInteger(space.owner_id) ||
      space.owner_id <= 0 ||
      space.type !== 'shared' ||
      space.is_owner ||
      space.owner_id === user.id
    ) {
      return false;
    }

    // Evita que un GET /spaces anterior sustituya el resultado.
    this.loadVersion += 1;
    this.loadingState.set(false);
    this.errorState.set(null);

    this.availableSpaces.update((spaces: Space[]): Space[] => [
      ...spaces.filter((existing: Space): boolean => existing.id !== space.id),
      space,
    ]);

    this.selectedSpaceId.set(space.id);

    return true;
  }

  /**
   * Retira un espacio después de que la API haya confirmado
   * que el usuario ha abandonado su membresía.
   *
   * Si estaba seleccionado, activa preferentemente el personal.
   * Si el usuario había cambiado de espacio, conserva su selección.
   */
  removeAfterLeave(spaceId: number): boolean {
    const user: AuthUser | null = this.authStore.user();
    const token: string | null = this.authStore.token();

    if (
      user === null ||
      token === null ||
      this.userId() !== user.id ||
      !Number.isSafeInteger(spaceId) ||
      spaceId <= 0
    ) {
      return false;
    }

    const space: Space | undefined = this.spaces().find(
      (item: Space): boolean => item.id === spaceId,
    );

    if (
      space === undefined ||
      space.type !== 'shared' ||
      space.is_owner ||
      space.owner_id === user.id
    ) {
      return false;
    }

    // Un GET /spaces iniciado antes de la baja no debe
    // recuperar la membresía que acabamos de retirar.
    this.loadVersion += 1;
    this.loadingState.set(false);
    this.errorState.set(null);

    const remaining: Space[] = this.availableSpaces().filter(
      (item: Space): boolean => item.id !== spaceId,
    );

    this.availableSpaces.set(remaining);

    if (this.selectedSpaceId() === spaceId) {
      const next: Space | undefined =
        remaining.find((item: Space): boolean => item.type === 'personal') ?? remaining[0];

      this.selectedSpaceId.set(next?.id ?? null);
    }

    return true;
  }

  /**
   * Elimina los datos del espacio al cerrar la sesión.
   */
  clear(): void {
    this.loadVersion += 1;
    this.userId.set(null);
    this.availableSpaces.set([]);
    this.selectedSpaceId.set(null);
    this.loadingState.set(false);
    this.errorState.set(null);
  }
}
