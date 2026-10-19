import {
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import type CategoriesResponse from '@interfaces/categories/categories-response.interface';
import type Category from '@model/categories/category.model';
import type Transaction from '@model/transactions/transaction.model';
import CreateTransaction from '@modules/transactions/create-transaction/create-transaction';
import { ChartBar, Cog, Home, List, Plus, SignOut, Tags } from '@primeicons/angular';
import CategoriesService from '@services/categories.service';
import TransactionRefreshService from '@services/transaction-refresh.service';
import { ButtonDirective } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import type { Subscription } from 'rxjs';

@Component({
  selector: 'app-private-layout',
  imports: [
    ButtonDirective,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    SelectModule,
    Home,
    List,
    ChartBar,
    Tags,
    Cog,
    Plus,
    SignOut,
    CreateTransaction,
    DialogModule,
  ],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss',
})
export default class PrivateLayout implements OnInit {
  readonly authStore: AuthStore = inject(AuthStore);
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly router: Router = inject(Router);
  private readonly categoriesService: CategoriesService = inject(CategoriesService);
  private readonly transactionRefresh: TransactionRefreshService =
    inject(TransactionRefreshService);

  readonly quickOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly quickLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly quickError: WritableSignal<string | null> = signal<string | null>(null);
  readonly quickCategories: WritableSignal<Category[]> = signal<Category[]>([]);
  readonly quickMessage: WritableSignal<string | null> = signal<string | null>(null);
  private readonly quickRefreshVersion: WritableSignal<number> = signal<number>(0);

  private previousSpaceId: number | null = null;
  private previousToken: string | null = null;
  private previousUserId: number | null = null;

  private readonly quickForm: Signal<CreateTransaction | undefined> = viewChild(CreateTransaction);

  readonly quickSubmitting: Signal<boolean> = computed(
    (): boolean => this.quickForm()?.transactionForm().submitting() ?? false,
  );

  constructor() {
    // Cualquier cambio de espacio o sesión cierra el registro rápido.
    effect((): void => {
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | null = this.authStore.user()?.id ?? null;

      if (
        spaceId !== this.previousSpaceId ||
        token !== this.previousToken ||
        userId !== this.previousUserId
      ) {
        this.previousSpaceId = spaceId;
        this.previousToken = token;
        this.previousUserId = userId;

        this.quickOpen.set(false);
        this.quickMessage.set(null);
      }
    });

    // Consulta las categorías del espacio al abrir el diálogo.
    effect((onCleanup): void => {
      const isOpen: boolean = this.quickOpen();
      const spaceId: number | null = this.spaceStore.selectedId();
      const token: string | null = this.authStore.token();
      const userId: number | null = this.authStore.user()?.id ?? null;

      this.quickRefreshVersion();

      this.quickCategories.set([]);
      this.quickError.set(null);
      this.quickLoading.set(false);

      if (!isOpen || spaceId === null || token === null || userId === null) {
        return;
      }

      this.quickLoading.set(true);

      const subscription: Subscription = this.categoriesService.getCategories(spaceId).subscribe({
        next: (response: CategoriesResponse): void => {
          if (!this.isCurrentQuickContext(spaceId, token, userId)) {
            return;
          }

          if (
            !response.success ||
            response.categories.some((category: Category): boolean => category.space_id !== spaceId)
          ) {
            this.quickError.set('No se han podido cargar las categorías.');
          } else {
            this.quickCategories.set(response.categories);
          }

          this.quickLoading.set(false);
        },
        error: (): void => {
          if (!this.isCurrentQuickContext(spaceId, token, userId)) {
            return;
          }

          this.quickError.set('No se han podido cargar las categorías.');
          this.quickLoading.set(false);
        },
      });

      onCleanup((): void => {
        subscription.unsubscribe();
      });
    });
  }

  /**
   * Carga los espacios una vez al entrar en el área privada.
   */
  ngOnInit(): void {
    void this.spaceStore.load();
  }

  /**
   * Selecciona uno de los espacios autorizados.
   */
  selectSpace(spaceId: number | null): void {
    if (typeof spaceId === 'number') {
      this.spaceStore.select(spaceId);
    }
  }

  /**
   * Reintenta la consulta de los espacios.
   */
  reloadSpaces(): void {
    void this.spaceStore.load();
  }

  /**
   * Cierra la sesión y limpia el contexto contable.
   */
  logout(): void {
    this.quickOpen.set(false);
    this.quickMessage.set(null);
    this.spaceStore.clear();
    this.authStore.clear();

    void this.router.navigateByUrl('/login');
  }

  /**
   * Abre el registro rápido sin cambiar de ruta.
   */
  openQuickTransaction(): void {
    if (
      this.quickOpen() ||
      this.spaceStore.loading() ||
      this.spaceStore.selectedId() === null ||
      this.authStore.token() === null ||
      this.authStore.user() === null
    ) {
      return;
    }

    this.quickMessage.set(null);
    this.quickOpen.set(true);
  }

  /**
   * Cierra el registro rápido cuando no se está guardando.
   */
  closeQuickTransaction(): void {
    if (this.quickSubmitting()) {
      return;
    }

    this.quickOpen.set(false);
  }

  /**
   * Gestiona el cierre del diálogo PrimeNG.
   */
  onQuickVisibilityChange(visible: boolean): void {
    if (!visible) {
      this.closeQuickTransaction();
    }
  }

  /**
   * Reintenta la carga de categorías.
   */
  retryQuickCategories(): void {
    if (!this.quickOpen() || this.quickLoading()) {
      return;
    }

    this.quickRefreshVersion.update((version: number): number => version + 1);
  }

  /**
   * Recibe un movimiento guardado correctamente.
   */
  onQuickTransactionCreated(transaction: Transaction): void {
    if (
      !this.quickOpen() ||
      transaction.space_id !== this.spaceStore.selectedId() ||
      transaction.user_id !== this.authStore.user()?.id ||
      this.authStore.token() === null
    ) {
      return;
    }

    this.quickOpen.set(false);

    this.quickMessage.set(
      `Se ha creado el movimiento «${transaction.concept || transaction.amount + ' €'}».`,
    );

    this.transactionRefresh.notifyChanged();
  }

  /**
   * Protege el diálogo de cambios de espacio y sesión.
   */
  private isCurrentQuickContext(spaceId: number, token: string, userId: number): boolean {
    return (
      this.quickOpen() &&
      this.spaceStore.selectedId() === spaceId &&
      this.authStore.token() === token &&
      this.authStore.user()?.id === userId
    );
  }
}
