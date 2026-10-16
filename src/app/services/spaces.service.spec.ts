import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import type SpacesResponse from '@interfaces/spaces-response.interface';
import SpacesService from '@services/spaces.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
});
