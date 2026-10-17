
import type CreateSpaceInvitationRequest from '@interfaces/create-space-invitation-request.interface';
import type CreateInvitationFormModel from '@model/spaces/create-invitation-form.model';

export default function createInvitationRequest(
  model: CreateInvitationFormModel,
  spaceId: number,
): CreateSpaceInvitationRequest {
  return {
    spaceId,
    email: model.email.trim().toLowerCase(),
  };
}
