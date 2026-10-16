import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { ButtonDirective } from 'primeng/button';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-dashboard',
  imports: [ButtonDirective, FormsModule, SelectModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Dashboard implements OnInit {
  readonly authStore: AuthStore = inject(AuthStore);
  readonly spaceStore: SpaceStore = inject(SpaceStore);
  private readonly router: Router = inject(Router);

  /**
   * Recupera los espacios al entrar en el dashboard.
   */
  ngOnInit(): void {
    void this.spaceStore.load();
  }

  /**
   * Actualiza la selección del espacio activo.
   */
  selectSpace(spaceId: number | null): void {
    if (typeof spaceId === 'number') {
      this.spaceStore.select(spaceId);
    }
  }

  /**
   * Reintenta la consulta de espacios.
   */
  reloadSpaces(): void {
    void this.spaceStore.load();
  }

  /**
   * Cierra la sesión y elimina los datos del espacio.
   */
  logout(): void {
    this.spaceStore.clear();
    this.authStore.clear();
    void this.router.navigateByUrl('/login');
  }
}
