import { Component, inject } from '@angular/core';
import SpaceStore from '@app/spaces/space.store';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export default class Dashboard {
  readonly spaceStore: SpaceStore = inject(SpaceStore);

  readonly monthLabel: string = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());
}
