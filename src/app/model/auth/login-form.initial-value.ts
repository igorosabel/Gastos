import type LoginFormModel from '@model/auth/login-form.model';

export default function createLoginFormInitialValue(): LoginFormModel {
  return {
    email: '',
    password: '',
  };
}
