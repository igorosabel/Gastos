
import type CreateInvitationFormModel from '@model/spaces/create-invitation-form.model';

export default function createInvitationFormInitialValue(): CreateInvitationFormModel {
  return {
    email: '',
  };
}
