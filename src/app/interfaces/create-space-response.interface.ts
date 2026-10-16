import type { ApiResponse } from '@interfaces/auth.interfaces';
import type Space from '@model/spaces/space.model';

export default interface CreateSpaceResponse extends ApiResponse {
  space: Space | null;
}
