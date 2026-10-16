import type Space from '@model/spaces/space.model';

export default interface SpacesResponse {
  success: boolean;
  spaces: Space[];
}
