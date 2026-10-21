import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '@env/environment';
import { ApiResponse } from '@interfaces/auth.interfaces';
import AcceptSpaceInvitationRequest from '@interfaces/spaces/accept-space-invitation-request.interface';
import AcceptSpaceInvitationResponse from '@interfaces/spaces/accept-space-invitation-response.interface';
import type CreateSpaceInvitationRequest from '@interfaces/spaces/create-space-invitation-request.interface';
import type CreateSpaceInvitationResponse from '@interfaces/spaces/create-space-invitation-response.interface';
import CreateSpaceRequest from '@interfaces/spaces/create-space-request.interface';
import CreateSpaceResponse from '@interfaces/spaces/create-space-response.interface';
import LeaveSpaceRequest from '@interfaces/spaces/leave-space-request.interface';
import RemoveSpaceMemberRequest from '@interfaces/spaces/remove-space-member-request.interface';
import ResendSpaceInvitationRequest from '@interfaces/spaces/resend-space-invitation-request.interface';
import RevokeSpaceInvitationRequest from '@interfaces/spaces/revoke-space-invitation-request.interface';
import RevokeSpaceInvitationResponse from '@interfaces/spaces/revoke-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/spaces/space-invitations-response.interface';
import type SpaceMembersResponse from '@interfaces/spaces/space-members-response.interface';
import type SpacesResponse from '@interfaces/spaces/spaces-response.interface';
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
   * Regenera el enlace de una invitación pendiente
   * y solicita un nuevo envío SMTP.
   *
   * ApiGastos devuelve la misma estructura que al crearla.
   */
  resendInvitation(data: ResendSpaceInvitationRequest): Observable<CreateSpaceInvitationResponse> {
    return this.http.post<CreateSpaceInvitationResponse>(
      `${this.apiUrl}/spaces/invitations/resend`,
      data,
    );
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

  /**
   * Acepta una invitación del usuario autenticado.
   */
  acceptInvitation(data: AcceptSpaceInvitationRequest): Observable<AcceptSpaceInvitationResponse> {
    return this.http.post<AcceptSpaceInvitationResponse>(
      `${this.apiUrl}/spaces/invitations/accept`,
      data,
    );
  }

  /**
   * Consulta los miembros activos de un espacio compartido.
   * Solo el propietario está autorizado por ApiGastos.
   */
  getMembers(spaceId: number): Observable<SpaceMembersResponse> {
    return this.http.get<SpaceMembersResponse>(`${this.apiUrl}/spaces/members`, {
      params: {
        spaceId: String(spaceId),
      },
    });
  }

  /**
   * Abandona un espacio compartido del que el usuario
   * autenticado es miembro, pero no propietario.
   */
  leaveSpace(data: LeaveSpaceRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/spaces/members/leave`, data);
  }

  /**
   * Expulsa a un miembro de un espacio compartido.
   * La API comprueba que el usuario autenticado es el propietario.
   */
  removeMember(data: RemoveSpaceMemberRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/spaces/members/remove`, data);
  }
}
