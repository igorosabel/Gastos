import { email, required, type SchemaPathTree } from '@angular/forms/signals';
import type LoginFormModel from '@model/auth/login-form.model';

/**
 * Define las restricciones del formulario de acceso.
 */
export default function loginFormSchema(path: SchemaPathTree<LoginFormModel>): void {
  required(path.email, {
    message: 'El correo electrónico es obligatorio.',
  });

  email(path.email, {
    message: 'Introduce un correo electrónico válido.',
  });

  required(path.password, {
    message: 'La contraseña es obligatoria.',
  });
}
