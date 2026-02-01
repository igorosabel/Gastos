import { Provider } from '@angular/core';
import AuthService from '@services/auth.service';
import { MessageService } from 'primeng/api';
import { DialogService, DynamicDialogConfig } from 'primeng/dynamicdialog';

export default function provideCore(): Provider[] {
  return [AuthService, MessageService, DialogService, DynamicDialogConfig];
}
