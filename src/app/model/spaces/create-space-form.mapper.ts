import type CreateSpaceRequest from '@interfaces/create-space-request.interface';
import type CreateSpaceFormModel from '@model/spaces/create-space-form.model';

/**
 * Prepara los datos del formulario para ApiGastos.
 */
export default function createSpaceRequest(model: CreateSpaceFormModel): CreateSpaceRequest {
  return {
    name: model.name.trim(),
  };
}
