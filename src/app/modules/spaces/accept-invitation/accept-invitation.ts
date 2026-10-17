import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  type FieldTree,
  type TreeValidationResult,
} from '@angular/forms/signals';
import AuthStore from '@auth/auth.store';
import type AcceptSpaceInvitationResponse from '@interfaces/spaces/accept-space-invitation-response.interface';
import createAcceptInvitationFormInitialValue from '@model/spaces/accept-invitation-form.initial-value';
import createAcceptInvitationRequest from '@model/spaces/accept-invitation-form.mapper';
import type AcceptInvitationFormModel from '@model/spaces/accept-invitation-form.model';
import acceptInvitationFormSchema from '@model/spaces/accept-invitation-form.schema';
import type Space from '@model/spaces/space.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-accept-invitation',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule],
  templateUrl: './accept-invitation.html',
  styleUrl: './accept-invitation.scss',
})
export default class AcceptInvitation {
  private readonly authStore: AuthStore = inject(AuthStore);
  private readonly spacesService: SpacesService = inject(SpacesService);

  readonly accepted: OutputEmitterRef<Space> = output<Space>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly invitationModel: WritableSignal<AcceptInvitationFormModel> =
    signal<AcceptInvitationFormModel>(createAcceptInvitationFormInitialValue());

  readonly invitationForm: FieldTree<AcceptInvitationFormModel> = form(
    this.invitationModel,
    acceptInvitationFormSchema,
    {
      submission: {
        action: async (
          field: FieldTree<AcceptInvitationFormModel>,
        ): Promise<TreeValidationResult> => {
          const sessionToken: string | null = this.authStore.token();

          if (sessionToken === null) {
            return {
              kind: 'serverError',
              message: 'Debes iniciar sesión para aceptar una invitación.',
            };
          }

          try {
            const response: AcceptSpaceInvitationResponse = await firstValueFrom(
              this.spacesService.acceptInvitation(createAcceptInvitationRequest(field().value())),
            );

            // La respuesta no debe afectar a una sesión diferente.
            if (this.authStore.token() !== sessionToken) {
              return undefined;
            }

            if (!response.success || response.space === null || response.space.type !== 'shared') {
              return {
                kind: 'serverError',
                message: 'No se ha podido confirmar la aceptación.',
              };
            }

            const space: Space = response.space;

            // El token no debe permanecer en el modelo tras aceptarse.
            this.invitationModel.set(createAcceptInvitationFormInitialValue());

            this.accepted.emit(space);
            return undefined;
          } catch (error: unknown) {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 400) {
                return {
                  kind: 'serverError',
                  message: 'El token de invitación no es válido.',
                  fieldTree: field.token,
                };
              }

              if (error.status === 403) {
                return {
                  kind: 'serverError',
                  message:
                    'Esta invitación pertenece a otra cuenta. Comprueba con qué usuario has iniciado sesión.',
                };
              }

              if (error.status === 409) {
                return {
                  kind: 'serverError',
                  message: 'La invitación no está disponible, ya ha caducado o ya fue utilizada.',
                };
              }

              if (error.status === 401) {
                return {
                  kind: 'serverError',
                  message: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
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
              message: 'No se ha podido aceptar la invitación. Inténtalo de nuevo.',
            };
          }
        },
      },
    },
  );

  private readonly tokenInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('tokenInput');

  constructor() {
    afterNextRender((): void => {
      this.tokenInput()?.nativeElement.focus();
    });
  }

  cancel(): void {
    if (!this.invitationForm().submitting()) {
      this.cancelled.emit();
    }
  }
}
