import { Provider } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';

export default function provideCore(): Provider[] {
  return [MessageService, DialogService];
}
