import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { CurrentUser } from '../models/user.model';
import { AuthSessionService } from './auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);

  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE_URL}/auth/login`, payload).pipe(
      tap((response) => {
        this.session.setSession(response);
      }),
    );
  }

  register(payload: RegisterRequest): Observable<{ message: string; user: CurrentUser }> {
    return this.http.post<{ message: string; user: CurrentUser }>(`${API_BASE_URL}/auth/register`, payload);
  }

  logout(): void {
    this.session.clear();
  }
}
