import { email, required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type RegisterFormModel from '@model/auth/register-form.model';

/**
 * Define las restricciones del formulario de registro.
 */
export default function registerFormSchema(path: SchemaPathTree<RegisterFormModel>): void {
  required(path.name, {
    message: 'El nombre es obligatorio.',
  });

  validate(path.name, ({ value }) => {
    const name: string = value().trim();

    if (name.length === 0) {
      return {
        kind: 'blankName',
        message: 'El nombre no puede contener solamente espacios.',
      };
    }

    if (Array.from(name).length > 100) {
      return {
        kind: 'nameTooLong',
        message: 'El nombre no puede superar los 100 caracteres.',
      };
    }

    return undefined;
  });

  required(path.email, {
    message: 'El correo electrónico es obligatorio.',
  });

  email(path.email, {
    message: 'Introduce un correo electrónico válido.',
  });

  validate(path.email, ({ value }) => {
    const emailBytes: number = new TextEncoder().encode(value().trim()).length;

    if (emailBytes > 254) {
      return {
        kind: 'emailTooLong',
        message: 'El correo electrónico es demasiado largo.',
      };
    }

    return undefined;
  });

  required(path.password, {
    message: 'La contraseña es obligatoria.',
  });

  validate(path.password, ({ value }) => {
    const password: string = value();

    if (password.length === 0) {
      return undefined;
    }

    const passwordBytes: number = new TextEncoder().encode(password).length;

    if (passwordBytes < 12) {
      return {
        kind: 'passwordTooShort',
        message: 'La contraseña debe tener al menos 12 bytes.',
      };
    }

    if (passwordBytes > 1024) {
      return {
        kind: 'passwordTooLong',
        message: 'La contraseña no puede superar los 1024 bytes.',
      };
    }

    return undefined;
  });
}
