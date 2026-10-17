import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import CreateSpaceRequest from '@interfaces/create-space-request.interface';
import CreateSpaceResponse from '@interfaces/create-space-response.interface';
import type SpacesResponse from '@interfaces/spaces-response.interface';
import SpacesService from '@services/spaces.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type CreateSpaceInvitationRequest from '@interfaces/create-space-invitation-request.interface';
import type CreateSpaceInvitationResponse from '@interfaces/create-space-invitation-response.interface';
import type SpaceInvitationsResponse from '@interfaces/space-invitations-response.interface';

describe('SpacesService', () => {
  let service: SpacesService;
  let httpTesting: HttpTestingController;

  beforeEach((): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SpacesService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach((): void => {
    httpTesting.verify();
  });

  it('consulta GET /spaces sin parámetros de usuario', (): void => {
    const response: SpacesResponse = {
      success: true,
      spaces: [
        {
          id: 1,
          name: 'Personal',
          type: 'personal',
          owner_id: 4,
          is_owner: true,
        },
      ],
    };

    let result: SpacesResponse | undefined;

    service.getSpaces().subscribe((data: SpacesResponse): void => {
      result = data;
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);

    request.flush(response);

    expect(result).toEqual(response);
  });

  it('crea un espacio mediante POST /spaces', (): void => {
    const requestData: CreateSpaceRequest = {
      name: 'Familia',
    };

    const response: CreateSpaceResponse = {
      success: true,
      space: {
        id: 8,
        name: 'Familia',
        type: 'shared',
        owner_id: 4,
        is_owner: true,
      },
      error: null,
      message: null,
    };

    let result: CreateSpaceResponse | undefined;

    service.createSpace(requestData).subscribe((data: CreateSpaceResponse): void => {
      result = data;
    });

    const request = httpTesting.expectOne(`${environment.apiUrl}/spaces`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Familia' });

    request.flush(response, {
      status: 201,
      statusText: 'Created',
    });

    expect(result).toEqual(response);
  });
  
it('consulta las invitaciones del espacio indicado', (): void => {
  const response: SpaceInvitationsResponse = {
    success: true,
    invitations: [
      {
        id: 15,
        space_id: 8,
        email: 'invitado@example.com',
        invited_by: 4,
        expires_at: '2026-10-24 10:00:00',
        accepted_at: null,
        revoked_at: null,
        status: 'pending',
      },
    ],
    error: null,
    message: null,
  };

  let result: SpaceInvitationsResponse | undefined;

  service.getInvitations(8).subscribe(
    (data: SpaceInvitationsResponse): void => {
      result = data;
    },
  );

  const request = httpTesting.expectOne(
    (req): boolean =>
      req.url === `${environment.apiUrl}/spaces/invitations` &&
      req.params.get('spaceId') === '8',
  );

  expect(request.request.method).toBe('GET');

  request.flush(response);

  expect(result).toEqual(response);
});

it('crea una invitación mediante POST /spaces/invitations', (): void => {
  const data: CreateSpaceInvitationRequest = {
    spaceId: 8,
    email: 'invitado@example.com',
  };

  const response: CreateSpaceInvitationResponse = {
    success: true,
    invitation: {
      id: 15,
      space_id: 8,
      email: 'invitado@example.com',
      token: 'token-de-prueba',
      expires_at: '2026-10-24 10:00:00',
    },
    error: null,
    message: null,
  };

  let result: CreateSpaceInvitationResponse | undefined;

  service.createInvitation(data).subscribe(
    (value: CreateSpaceInvitationResponse): void => {
      result = value;
    },
  );

  const request = httpTesting.expectOne(
    `${environment.apiUrl}/spaces/invitations`,
  );

  expect(request.request.method).toBe('POST');
  expect(request.request.body).toEqual(data);

  request.flush(response, {
    status: 201,
    statusText: 'Created',
  });

  expect(result).toEqual(response);
});
});
