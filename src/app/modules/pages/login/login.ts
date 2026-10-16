import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
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
import AuthStore from '@auth/auth.store';
import type { LoginResponse } from '@interfaces/auth.interfaces';
import createLoginFormInitialValue from '@model/auth/login-form.initial-value';
import createLoginRequest from '@model/auth/login-form.mapper';
import type LoginFormModel from '@model/auth/login-form.model';
import loginFormSchema from '@model/auth/login-form.schema';
import AuthService from '@services/auth.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Login {
  private readonly authService: AuthService = inject(AuthService);
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  readonly registered: boolean = this.route.snapshot.queryParamMap.get('registered') === '1';

  readonly loginModel: WritableSignal<LoginFormModel> = signal<LoginFormModel>(
    createLoginFormInitialValue(),
  );

  readonly loginForm: FieldTree<LoginFormModel> = form(this.loginModel, loginFormSchema, {
    submission: {
      action: async (field: FieldTree<LoginFormModel>): Promise<TreeValidationResult> => {
        try {
          const response: LoginResponse = await firstValueFrom(
            this.authService.login(createLoginRequest(field().value())),
          );

          if (!this.authStore.start(response)) {
            return {
              kind: 'serverError',
              message: 'No se ha podido iniciar la sesión.',
            };
          }

          await this.router.navigateByUrl(this.getDestination());
          return undefined;
        } catch (error: unknown) {
          if (error instanceof HttpErrorResponse) {
            if (error.status === 401) {
              return {
                kind: 'serverError',
                message: 'Correo electrónico o contraseña incorrectos.',
                fieldTree: field.password,
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
            message: 'No se ha podido iniciar sesión. Inténtalo de nuevo.',
          };
        }
      },
    },
  });

  /**
   * Obtiene una ruta interna segura después del login.
   */
  private getDestination(): string {
    const requested: string | null = this.route.snapshot.queryParamMap.get('returnUrl');

    if (
      requested === null ||
      !requested.startsWith('/') ||
      requested.startsWith('//') ||
      requested.includes('\\') ||
      /^\/(?:login|register)(?:\/|[?#]|$)/.test(requested)
    ) {
      return '/dashboard';
    }

    return requested;
  }
}
