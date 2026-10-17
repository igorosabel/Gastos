import { required, validate, type SchemaPathTree } from '@angular/forms/signals';
import type AcceptInvitationFormModel from '@model/spaces/accept-invitation-form.model';

/**
 * Valida el token de una invitación.
 */
export default function acceptInvitationFormSchema(
  path: SchemaPathTree<AcceptInvitationFormModel>,
): void {
  required(path.token, {
    message: 'El token de invitación es obligatorio.',
  });

  validate(path.token, ({ value }) => {
    const token: string = value().trim().toLowerCase();

    if (token.length === 0) {
      return undefined;
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return {
        kind: 'invalidInvitationToken',
        message: 'El token debe contener 64 caracteres hexadecimales.',
      };
    }

    return undefined;
  });
}
