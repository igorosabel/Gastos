
import {
  email,
  maxLength,
  required,
  validate,
  type SchemaPathTree,
} from '@angular/forms/signals';
import type CreateInvitationFormModel from '@model/spaces/create-invitation-form.model';

export default function createInvitationFormSchema(
  path: SchemaPathTree<CreateInvitationFormModel>,
): void {
  required(path.email, {
    message: 'El correo electrónico es obligatorio.',
  });

  email(path.email, {
    message: 'Introduce un correo electrónico válido.',
  });

  maxLength(path.email, 254, {
    message: 'El correo electrónico no puede superar los 254 caracteres.',
  });

  validate(path.email, ({ value }) => {
    if (value().trim().length === 0) {
      return {
        kind: 'blankEmail',
        message: 'El correo electrónico es obligatorio.',
      };
    }

    return undefined;
  });
}
