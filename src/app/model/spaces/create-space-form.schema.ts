import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type CreateSpaceFormModel from '@model/spaces/create-space-form.model';

/**
 * Aplica las restricciones del nombre de un espacio compartido.
 */
export default function createSpaceFormSchema(path: SchemaPathTree<CreateSpaceFormModel>): void {
  required(path.name, {
    message: 'El nombre del espacio es obligatorio.',
  });

  validate(path.name, ({ value }) => {
    const name: string = value().trim();

    if (name.length === 0) {
      return {
        kind: 'blankName',
        message: 'El nombre no puede contener solamente espacios.',
      };
    }

    if (Array.from(name).length > 100) {
      return {
        kind: 'nameTooLong',
        message: 'El nombre no puede superar los 100 caracteres.',
      };
    }

    return undefined;
  });
}
