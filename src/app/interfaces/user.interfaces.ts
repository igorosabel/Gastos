import { UserInterface } from '@interfaces/models/user.interfaces';

export interface UserResponse {
  status: string;
  user: UserInterface;
}
