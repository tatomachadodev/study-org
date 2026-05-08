import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { CalendarResponse } from '../models/calendar.model';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly http = inject(HttpClient);

  getCalendar(month: number, year: number): Observable<CalendarResponse> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<CalendarResponse>(`${API_BASE_URL}/calendar`, { params });
  }
}
