export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface ApiResponse {
  success: boolean;
  error: string | null;
  message: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse extends ApiResponse {
  token: string | null;
  expires_at: number | null;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse extends ApiResponse {
  user_id: number | null;
  space_id: number | null;
}

export interface MeResponse {
  success: boolean;
  user: AuthUser;
}
