import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import AuthStore from '@auth/auth.store';
import { ButtonDirective } from 'primeng/button';

@Component({
  selector: 'app-dashboard',
  imports: [ButtonDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Dashboard {
  readonly store: AuthStore = inject(AuthStore);
  private readonly router: Router = inject(Router);

  /**
   * Elimina la sesión local y vuelve al login.
   */
  logout(): void {
    this.store.clear();
    void this.router.navigateByUrl('/login');
  }
}
