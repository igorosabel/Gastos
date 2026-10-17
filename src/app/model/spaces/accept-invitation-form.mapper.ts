import type AcceptSpaceInvitationRequest from '@interfaces/accept-space-invitation-request.interface';
import type AcceptInvitationFormModel from '@model/spaces/accept-invitation-form.model';

export default function createAcceptInvitationRequest(
  model: AcceptInvitationFormModel,
): AcceptSpaceInvitationRequest {
  return {
    token: model.token.trim().toLowerCase(),
  };
}
