import { AuthUser } from '@interfaces/auth.interfaces';

export default interface StoredSession {
  token: string;
  expires_at: number;
  user: AuthUser;
}
