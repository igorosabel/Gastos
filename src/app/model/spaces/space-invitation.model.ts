
export default interface SpaceInvitation {
  id: number;
  space_id: number;
  email: string;
  invited_by: number;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}
