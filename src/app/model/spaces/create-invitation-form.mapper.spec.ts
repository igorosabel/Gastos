
import createInvitationRequest from '@model/spaces/create-invitation-form.mapper';
import type CreateInvitationFormModel from '@model/spaces/create-invitation-form.model';
import { describe, expect, it } from 'vitest';

describe('createInvitationRequest', (): void => {
  it('normaliza el correo y conserva el espacio indicado', (): void => {
    const model: CreateInvitationFormModel = {
      email: '  INVITADO@EXAMPLE.COM  ',
    };

    expect(createInvitationRequest(model, 8)).toEqual({
      spaceId: 8,
      email: 'invitado@example.com',
    });
  });
});
