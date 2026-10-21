import type { ApiResponse } from '@interfaces/auth.interfaces';

export default interface CreateSpaceInvitationResponse extends ApiResponse {
  invitation: {
    id: number;
    space_id: number;
    email: string;
    token: string;
    expires_at: string;
  };
  email_sent: boolean;
}
