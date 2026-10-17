import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import type CreateSpaceInvitationRequest from '@interfaces/create-space-invitation-request.interface';
import type CreateSpaceInvitationResponse from '@interfaces/create-space-invitation-response.interface';
import CreateSpaceRequest from '@interfaces/create-space-request.interface';
import CreateSpaceResponse from '@interfaces/create-space-response.interface';
import RevokeSpaceInvitationRequest from '@interfaces/revoke-space-invitation-request.interface';
import RevokeSpaceInvitationResponse from '@interfaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';
import type SpacesResponse from '@interfaces/spaces-response.interface';
import type { Observable } from 'rxjs';

@Service()
export default class SpacesService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly apiUrl: string = environment.apiUrl;

  /**
   * Obtiene los espacios accesibles para el usuario autenticado.
   */
  getSpaces(): Observable<SpacesResponse> {
    return this.http.get<SpacesResponse>(`${this.apiUrl}/spaces`);
  }

  /**
   * Crea un espacio compartido del usuario autenticado.
   */
  createSpace(data: CreateSpaceRequest): Observable<CreateSpaceResponse> {
    return this.http.post<CreateSpaceResponse>(`${this.apiUrl}/spaces`, data);
  }

  /**
   * Obtiene las invitaciones de un espacio compartido.
   */
  getInvitations(spaceId: number): Observable<SpaceInvitationsResponse> {
    return this.http.get<SpaceInvitationsResponse>(`${this.apiUrl}/spaces/invitations`, {
      params: {
        spaceId: String(spaceId),
      },
    });
  }

  /**
   * Crea una invitación dirigida a una dirección de correo.
   */
  createInvitation(data: CreateSpaceInvitationRequest): Observable<CreateSpaceInvitationResponse> {
    return this.http.post<CreateSpaceInvitationResponse>(`${this.apiUrl}/spaces/invitations`, data);
  }

  /**
   * Revoca una invitación pendiente.
   */
  revokeInvitation(data: RevokeSpaceInvitationRequest): Observable<RevokeSpaceInvitationResponse> {
    return this.http.post<RevokeSpaceInvitationResponse>(
      `${this.apiUrl}/spaces/invitations/revoke`,
      data,
    );
  }
}
