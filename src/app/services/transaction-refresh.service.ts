import { Service, signal, type Signal, type WritableSignal } from '@angular/core';

@Service()
export default class TransactionRefreshService {
  private readonly versionState: WritableSignal<number> = signal<number>(0);

  readonly version: Signal<number> = this.versionState.asReadonly();

  /**
   * Notifica que han cambiado los movimientos.
   */
  notifyChanged(): void {
    this.versionState.update((version: number): number => version + 1);
  }
}
