import createLoginRequest from '@model/auth/login-form.mapper';
import type LoginFormModel from '@model/auth/login-form.model';
import { describe, expect, it } from 'vitest';

describe('createLoginRequest', () => {
  it('normaliza el correo y conserva exactamente la contraseña', (): void => {
    const model: LoginFormModel = {
      email: '  USUARIO@EXAMPLE.COM  ',
      password: ' contraseña original ',
    };

    expect(createLoginRequest(model)).toEqual({
      email: 'usuario@example.com',
      password: ' contraseña original ',
    });
  });
});
