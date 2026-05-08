import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CurrentUser, UserPreferences } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  getCurrentUser(): Observable<CurrentUser> {
    return this.http.get<CurrentUser>(`${API_BASE_URL}/users/me`);
  }

  updatePreferences(payload: UserPreferences): Observable<UserPreferences> {
    return this.http.patch<UserPreferences>(`${API_BASE_URL}/users/me/preferences`, payload);
  }
}
