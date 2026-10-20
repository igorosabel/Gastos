import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  Signal,
  signal,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  type TreeValidationResult,
} from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { RegisterResponse } from '@interfaces/auth.interfaces';
import createRegisterFormInitialValue from '@model/auth/register-form.initial-value';
import createRegisterRequest from '@model/auth/register-form.mapper';
import type RegisterFormModel from '@model/auth/register-form.model';
import registerFormSchema from '@model/auth/register-form.schema';
import AuthService from '@services/auth.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export default class Register {
  private readonly authService: AuthService = inject(AuthService);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  readonly invitationReturnUrl: string | null =
    this.route.snapshot.queryParamMap.get('returnUrl') === '/invitacion' ? '/invitacion' : null;

  readonly registerModel: WritableSignal<RegisterFormModel> = signal<RegisterFormModel>(
    createRegisterFormInitialValue(),
  );

  readonly registerForm: FieldTree<RegisterFormModel> = form(
    this.registerModel,
    registerFormSchema,
    {
      submission: {
        action: async (field: FieldTree<RegisterFormModel>): Promise<TreeValidationResult> => {
          try {
            const response: RegisterResponse = await firstValueFrom(
              this.authService.register(createRegisterRequest(field().value())),
            );

            if (!response.success) {
              return {
                kind: 'serverError',
                message: 'No se ha podido crear la cuenta.',
              };
            }

            await this.router.navigate(['/login'], {
              queryParams:
                this.invitationReturnUrl === null
                  ? { registered: '1' }
                  : {
                      registered: '1',
                      returnUrl: this.invitationReturnUrl,
                    },
            });

            return undefined;
          } catch (error: unknown) {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 409) {
                return {
                  kind: 'serverError',
                  message: 'Ya existe una cuenta con ese correo electrónico.',
                  fieldTree: field.email,
                };
              }

              if (error.status === 400) {
                return {
                  kind: 'serverError',
                  message: 'Los datos introducidos no son válidos.',
                };
              }

              if (error.status === 0) {
                return {
                  kind: 'serverError',
                  message: 'No se ha podido conectar con el servidor.',
                };
              }
            }

            return {
              kind: 'serverError',
              message: 'No se ha podido completar el registro. Inténtalo de nuevo.',
            };
          }
        },
      },
    },
  );

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender((): void => {
      this.nameInput()?.nativeElement.focus();
    });
  }
}
