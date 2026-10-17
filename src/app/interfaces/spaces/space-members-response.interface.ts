import type { ApiResponse } from '@interfaces/auth.interfaces';
import type SpaceMember from '@model/spaces/space-member.model';

export default interface SpaceMembersResponse extends ApiResponse {
  members: SpaceMember[];
}
