import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import SpaceStore from '@app/spaces/space.store';
import AuthStore from '@auth/auth.store';
import { ChartBar, Cog, Home, List, Plus, SignOut, Tags } from '@primeicons/angular';
import { ButtonDirective } from 'primeng/button';
import { SelectModule } from 'primeng/select';

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
  ],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss',
})
export default class PrivateLayout implements OnInit {
  readonly authStore: AuthStore = inject(AuthStore);
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  private readonly router: Router = inject(Router);

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
    this.spaceStore.clear();
    this.authStore.clear();

    void this.router.navigateByUrl('/login');
  }
}
