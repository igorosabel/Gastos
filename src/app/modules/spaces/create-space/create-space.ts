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
  FieldTree,
  form,
  FormField,
  FormRoot,
  type TreeValidationResult,
} from '@angular/forms/signals';
import type CreateSpaceResponse from '@interfaces/spaces/create-space-response.interface';
import createSpaceFormInitialValue from '@model/spaces/create-space-form.initial-value';
import createSpaceRequest from '@model/spaces/create-space-form.mapper';
import type CreateSpaceFormModel from '@model/spaces/create-space-form.model';
import createSpaceFormSchema from '@model/spaces/create-space-form.schema';
import type Space from '@model/spaces/space.model';
import SpacesService from '@services/spaces.service';
import { ButtonDirective } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-space',
  imports: [ButtonDirective, FormField, FormRoot, InputTextModule],
  templateUrl: './create-space.html',
  styleUrl: './create-space.scss',
})
export default class CreateSpace {
  private readonly spacesService: SpacesService = inject(SpacesService);

  readonly created: OutputEmitterRef<Space> = output<Space>();
  readonly cancelled: OutputEmitterRef<void> = output<void>();

  readonly spaceModel: WritableSignal<CreateSpaceFormModel> = signal<CreateSpaceFormModel>(
    createSpaceFormInitialValue(),
  );

  private readonly nameInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('nameInput');

  readonly spaceForm: FieldTree<CreateSpaceFormModel> = form(
    this.spaceModel,
    createSpaceFormSchema,
    {
      submission: {
        action: async (field: FieldTree<CreateSpaceFormModel>): Promise<TreeValidationResult> => {
          try {
            const response: CreateSpaceResponse = await firstValueFrom(
              this.spacesService.createSpace(createSpaceRequest(field().value())),
            );

            if (!response.success || response.space === null) {
              return {
                kind: 'serverError',
                message: 'No se ha podido crear el espacio.',
              };
            }

            this.created.emit(response.space);
            return undefined;
          } catch (error: unknown) {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 400) {
                return {
                  kind: 'serverError',
                  message: 'El nombre del espacio no es válido.',
                  fieldTree: field.name,
                };
              }

              if (error.status === 0) {
                return {
                  kind: 'serverError',
                  message: 'No se ha podido conectar con el servidor.',
                };
              }

              if (error.status === 401) {
                return {
                  kind: 'serverError',
                  message: 'Tu sesión ha caducado.',
                };
              }
            }

            return {
              kind: 'serverError',
              message: 'No se ha podido crear el espacio. Inténtalo de nuevo.',
            };
          }
        },
      },
    },
  );

  constructor() {
    afterNextRender((): void => {
      this.nameInput()?.nativeElement.focus();
    });
  }

  /**
   * Cancela la creación del espacio.
   */
  cancel(): void {
    if (this.spaceForm().submitting()) {
      return;
    }

    this.cancelled.emit();
  }
}
