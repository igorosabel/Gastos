export interface LoginPayload {
  username: string;
  password: string;
}

export interface Tokens {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
}

export interface LoginResponse {
  status: string;
  user: UserSummary;
  tokens: Tokens;
}

export interface SessionData {
  user: UserSummary | null;
  refreshToken?: string;
  accessToken?: string;
  accessExpiresAt?: number;
}

export interface UserSummary {
  id: number;
  username: string;
}
