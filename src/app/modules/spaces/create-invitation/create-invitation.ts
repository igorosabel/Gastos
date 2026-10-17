
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
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
import type CreateSpaceInvitationResponse from '@interfaces/create-space-invitation-response.interface';
import createInvitationFormInitialValue from '@model/spaces/create-invitation-form.initial-value';
import createInvitationRequest from '@model/spaces/create-invitation-form.mapper';
import type CreateInvitationFormModel from '@model/spaces/create-invitation-form.model';
import createInvitationFormSchema from '@model/spaces/create-invitation-form.schema';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-invitation',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule],
  templateUrl: './create-invitation.html',
  styleUrl: './create-invitation.scss',
})
export default class CreateInvitation {
  private readonly spacesService: SpacesService = inject(SpacesService);

  readonly spaceId: InputSignal<number> = input.required<number>();

  readonly created: OutputEmitterRef<string> = output<string>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly invitationModel: WritableSignal<CreateInvitationFormModel> =
    signal<CreateInvitationFormModel>(createInvitationFormInitialValue());

  private readonly emailInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('emailInput');

  readonly invitationForm: FieldTree<CreateInvitationFormModel> = form(
    this.invitationModel,
    createInvitationFormSchema,
    {
      submission: {
        action: async (
          field: FieldTree<CreateInvitationFormModel>,
        ): Promise<TreeValidationResult> => {
          const requestedSpaceId: number = this.spaceId();

          try {
            const response: CreateSpaceInvitationResponse = await firstValueFrom(
              this.spacesService.createInvitation(
                createInvitationRequest(field().value(), requestedSpaceId),
              ),
            );

            if (!response.success || !response.invitation?.token) {
              return {
                kind: 'serverError',
                message: 'No se ha podido crear la invitación.',
              };
            }

            // No mostrar un token correspondiente a otro espacio.
            if (
              requestedSpaceId !== this.spaceId() ||
              response.invitation.space_id !== requestedSpaceId
            ) {
              return undefined;
            }

            this.created.emit(response.invitation.token);
            return undefined;
          } catch (error: unknown) {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 400) {
                return {
                  kind: 'serverError',
                  message: 'El correo electrónico no es válido.',
                  fieldTree: field.email,
                };
              }

              if (error.status === 403) {
                return {
                  kind: 'serverError',
                  message: 'No tienes permiso para invitar a este espacio.',
                };
              }

              if (error.status === 409) {
                return {
                  kind: 'serverError',
                  message:
                    'El usuario ya pertenece al espacio o tiene una invitación pendiente.',
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
              message: 'No se ha podido crear la invitación. Inténtalo de nuevo.',
            };
          }
        },
      },
    },
  );

  constructor() {
    afterNextRender((): void => {
      this.emailInput()?.nativeElement.focus();
    });
  }

  cancel(): void {
    if (!this.invitationForm().submitting()) {
      this.cancelled.emit();
    }
  }
}
