import { Service, signal, type Signal, type WritableSignal } from '@angular/core';

@Service()
export default class TransactionRefreshService {
  private readonly versionState: WritableSignal<number> = signal<number>(0);

  readonly version: Signal<number> = this.versionState.asReadonly();

  /**
   * Notifica cambios que afectan a los datos económicos:
   * movimientos reales u ocurrencias recurrentes pendientes.
   *
   * Las pantallas que consumen esta señal vuelven a consultar
   * sus datos al backend.
   */
  notifyChanged(): void {
    this.versionState.update((version: number): number => version + 1);
  }
}
