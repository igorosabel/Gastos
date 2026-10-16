import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';
import createRegisterFormInitialValue from '@model/auth/register-form.initial-value';
import type RegisterFormModel from '@model/auth/register-form.model';
import registerFormSchema from '@model/auth/register-form.schema';
import { beforeEach, describe, expect, it } from 'vitest';

describe('registerFormSchema', () => {
  let model: WritableSignal<RegisterFormModel>;
  let formTree: FieldTree<RegisterFormModel>;

  beforeEach((): void => {
    TestBed.configureTestingModule({});

    model = signal<RegisterFormModel>(createRegisterFormInitialValue());

    formTree = TestBed.runInInjectionContext(
      (): FieldTree<RegisterFormModel> => form(model, registerFormSchema),
    );
  });

  it('rechaza un formulario vacío', (): void => {
    expect(formTree().invalid()).toBe(true);
  });

  it('acepta valores válidos', (): void => {
    model.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    expect(formTree().valid()).toBe(true);
  });

  it('rechaza un nombre formado solo por espacios', (): void => {
    model.set({
      name: '   ',
      email: 'usuario@example.com',
      password: 'password-de-prueba',
    });

    expect(formTree.name().invalid()).toBe(true);
  });

  it('valida la contraseña según su longitud en bytes', (): void => {
    model.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: '12345678901',
    });

    expect(formTree.password().invalid()).toBe(true);

    model.update(
      (value: RegisterFormModel): RegisterFormModel => ({
        ...value,
        password: '123456789012',
      }),
    );

    expect(formTree.password().valid()).toBe(true);
  });

  it('rechaza una contraseña de más de 1024 bytes', (): void => {
    model.set({
      name: 'Usuario',
      email: 'usuario@example.com',
      password: 'a'.repeat(1025),
    });

    expect(formTree.password().invalid()).toBe(true);
  });
});
