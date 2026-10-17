import createAcceptInvitationRequest from '@model/spaces/accept-invitation-form.mapper';
import type AcceptInvitationFormModel from '@model/spaces/accept-invitation-form.model';
import { describe, expect, it } from 'vitest';

describe('createAcceptInvitationRequest', (): void => {
  it('normaliza el token recibido', (): void => {
    const model: AcceptInvitationFormModel = {
      token: `  ${'A'.repeat(64)}  `,
    };

    expect(createAcceptInvitationRequest(model)).toEqual({
      token: 'a'.repeat(64),
    });
  });
});
