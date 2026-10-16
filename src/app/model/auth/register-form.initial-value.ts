import type RegisterFormModel from '@model/auth/register-form.model';

export default function createRegisterFormInitialValue(): RegisterFormModel {
  return {
    name: '',
    email: '',
    password: '',
  };
}
