import createRegisterRequest from '@model/auth/register-form.mapper';
import type RegisterFormModel from '@model/auth/register-form.model';
import { describe, expect, it } from 'vitest';

describe('createRegisterRequest', () => {
  it('normaliza el nombre y el correo sin modificar la contraseña', (): void => {
    const model: RegisterFormModel = {
      name: '  Usuario  ',
      email: '  USUARIO@EXAMPLE.COM  ',
      password: ' contraseña de prueba ',
    };

    expect(createRegisterRequest(model)).toEqual({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: ' contraseña de prueba ',
    });
  });
});
