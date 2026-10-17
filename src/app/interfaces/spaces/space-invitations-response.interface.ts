
import type { ApiResponse } from '@interfaces/auth.interfaces';
import type SpaceInvitation from '@model/spaces/space-invitation.model';

export default interface SpaceInvitationsResponse extends ApiResponse {
  invitations: SpaceInvitation[];
}
