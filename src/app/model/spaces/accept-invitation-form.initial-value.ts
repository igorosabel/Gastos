import type AcceptInvitationFormModel from '@model/spaces/accept-invitation-form.model';

export default function createAcceptInvitationFormInitialValue(): AcceptInvitationFormModel {
  return {
    token: '',
  };
}
