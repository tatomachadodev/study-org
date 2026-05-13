import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import {
  CompletedTasksResponse,
  Task,
  TaskCreateRequest,
  TaskListResponse,
  TaskStatus,
} from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly http = inject(HttpClient);

  getTasks(filters?: { status?: TaskStatus; search?: string }): Observable<TaskListResponse> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (filters?.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }

    return this.http.get<TaskListResponse>(`${API_BASE_URL}/tasks`, { params });
  }

  createTask(payload: TaskCreateRequest): Observable<Task> {
    return this.http.post<Task>(`${API_BASE_URL}/tasks`, payload);
  }

  updateStatus(taskId: string, status: TaskStatus): Observable<{ id: string; status: TaskStatus; completedAt: string | null }> {
    return this.http.patch<{ id: string; status: TaskStatus; completedAt: string | null }>(
      `${API_BASE_URL}/tasks/${taskId}/status`,
      { status },
    );
  }

  getCompletedTasks(): Observable<CompletedTasksResponse> {
    return this.http.get<CompletedTasksResponse>(`${API_BASE_URL}/tasks/completed`);
  }
}
