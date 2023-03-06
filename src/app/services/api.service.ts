import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "src/environments/environment";

import {
  LoginData,
  LoginResult,
  RegisterData,
} from "src/app/interfaces/interfaces";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  apiUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {}

  login(data: LoginData): Observable<LoginResult> {
    return this.http.post<LoginResult>(this.apiUrl + "login", data);
  }

  register(data: RegisterData): Observable<LoginResult> {
    return this.http.post<LoginResult>(this.apiUrl + "register", data);
  }
}
