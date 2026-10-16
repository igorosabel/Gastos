import type { RegisterRequest } from '@interfaces/auth.interfaces';
import type RegisterFormModel from '@model/auth/register-form.model';

/**
 * Transforma los valores del formulario en una petición de registro.
 */
export default function createRegisterRequest(model: RegisterFormModel): RegisterRequest {
  return {
    name: model.name.trim(),
    email: model.email.trim().toLowerCase(),
    password: model.password,
  };
}
