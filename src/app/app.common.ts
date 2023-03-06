/*
 * Servicios
 */
import { ApiService } from "./services/api.service";
import { AuthService } from "./services/auth.service";
import { DataShareService } from "./services/data-share.service";
import { DialogService } from "./services/dialog.service";
import { UserService } from "./services/user.service";

export const SERVICES: any[] = [
  ApiService,
  DataShareService,
  DialogService,
  UserService,
  AuthService,
];
