import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { LoginPayload, LoginResponse, Tokens } from '@interfaces/interfaces';
import { UserResponse } from '@interfaces/user.interfaces';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export default class AuthService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  async login(payload: LoginPayload): Promise<LoginResponse> {
    const url = `${this.apiUrl}/auth/login`;
    return await firstValueFrom(this.http.post<LoginResponse>(url, payload));
  }

  async refresh(refresh_token: string): Promise<Tokens> {
    return firstValueFrom(
      this.http.post<Tokens>(`${this.apiUrl}/auth/refresh`, {
        refreshToken: refresh_token,
      }),
    );
  }

  async logout(refresh_token: string, allDevices = false): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(`${this.apiUrl}/auth/logout`, {
        refreshToken: refresh_token,
        allDevices,
      }),
    );
  }

  async getUserInfo(id: number): Promise<UserResponse> {
    return await firstValueFrom(
      this.http.post<UserResponse>(`${this.apiUrl}/auth/get-user-info`, {
        id,
      }),
    );
  }
}
