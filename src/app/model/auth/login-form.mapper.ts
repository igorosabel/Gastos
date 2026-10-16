import type { LoginRequest } from '@interfaces/auth.interfaces';
import type LoginFormModel from '@model/auth/login-form.model';

/**
 * Transforma los datos editables en una petición de login.
 */
export default function createLoginRequest(model: LoginFormModel): LoginRequest {
  return {
    email: model.email.trim().toLowerCase(),
    password: model.password,
  };
}
