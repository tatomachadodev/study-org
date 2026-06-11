import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { CalendarResponse } from '../../core/models/calendar.model';
import { TaskPriority, TaskRecurrence, TaskStatus } from '../../core/models/task.model';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { apiFetch, getApiErrorMessage } from '../../shared/services/api.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';

type CalendarTask = CalendarResponse['items'][number];

interface CalendarDay {
  dayNumber: number;
  isoDate: string;
  items: CalendarTask[];
}

interface ToggleTaskResponse {
  id: string;
  status: TaskStatus;
  completedAt: string | null;
}

@Component({
  selector: 'app-calendar',
  imports: [AppLayout, FontAwesomeModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  private readonly calendarService = inject(CalendarService);
  private readonly session = inject(AuthSessionService);
  private readonly now = new Date();

  readonly search = signal('');
  readonly days = signal<Array<Array<CalendarDay | null>>>([]);
  readonly agenda = signal<CalendarTask[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly selectedTask = signal<CalendarTask | null>(null);
  readonly togglingTaskId = signal<string | null>(null);
  readonly deletingTaskId = signal<string | null>(null);

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.now),
  );

  readonly plusIcon = faPlus;
  readonly filterIcon = faFilter;
  readonly closeIcon = faXmark;

  constructor() {
    this.loadCalendar();
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  openTaskDetails(task: CalendarTask): void {
    this.selectedTask.set(task);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
  }

  async completeSelectedTask(taskId: string): Promise<void> {
    const token = this.session.token();

    if (!token) {
      return;
    }

    this.togglingTaskId.set(taskId);
    this.errorMessage.set('');

    try {
      const response = await apiFetch<ToggleTaskResponse>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: 'completed' }),
      });

      this.updateTask(taskId, {
        status: response.status,
        completedAt: response.completedAt,
      });
      this.selectedTask.set(null);
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error));
    } finally {
      this.togglingTaskId.set(null);
    }
  }

  async deleteSelectedTask(taskId: string): Promise<void> {
    const token = this.session.token();

    if (!token) {
      return;
    }

    this.deletingTaskId.set(taskId);
    this.errorMessage.set('');

    try {
      await apiFetch<void>(`/tasks/${taskId}`, {
        method: 'DELETE',
        token,
      });

      this.removeTask(taskId);
      this.selectedTask.set(null);
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error));
    } finally {
      this.deletingTaskId.set(null);
    }
  }

  statusLabel(status: TaskStatus): string {
    if (status === 'completed') {
      return 'concluida';
    }

    if (status === 'overdue') {
      return 'em atraso';
    }

    return 'pendente';
  }

  priorityClass(priority: TaskPriority): string {
    if (priority === 'alta') {
      return 'border border-red-200 bg-red-100 text-red-800';
    }

    if (priority === 'media') {
      return 'border border-amber-200 bg-amber-100 text-amber-800';
    }

    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  recurrenceLabel(recurrence: TaskRecurrence): string {
    const labels: Record<TaskRecurrence, string> = {
      none: 'Nenhuma',
      daily: 'Diaria',
      weekly: 'Semanal',
      monthly: 'Mensal',
    };

    return labels[recurrence];
  }

  formatHours(hours: number | string | null | undefined): string {
    const parsedHours = this.parseHours(hours);

    if (parsedHours === null) {
      return '-';
    }

    const wholeHours = Math.floor(parsedHours);
    const minutes = Math.round((parsedHours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours}h`;
    }

    return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  private loadCalendar(): void {
    const month = this.now.getMonth() + 1;
    const year = this.now.getFullYear();

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.calendarService
      .getCalendar(month, year)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const calendarDays = this.buildCalendarGrid(year, month, response.items);
          this.days.set(calendarDays);
          this.agenda.set(response.items.slice(0, 5));
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar o calendario.');
        },
      });
  }

  private buildCalendarGrid(
    year: number,
    month: number,
    items: CalendarTask[],
  ): Array<Array<CalendarDay | null>> {
    const taskMap = new Map<string, CalendarDay['items']>();

    for (const item of items) {
      const current = taskMap.get(item.date) ?? [];
      current.push(item);
      taskMap.set(item.date, current);
    }

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const startOffset = firstDayOfMonth.getDay();
    const weeks: Array<Array<CalendarDay | null>> = [];
    let currentWeek: Array<CalendarDay | null> = Array.from({ length: startOffset }, () => null);

    for (let day = 1; day <= lastDayOfMonth.getDate(); day += 1) {
      const isoDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      currentWeek.push({
        dayNumber: day,
        isoDate,
        items: taskMap.get(isoDate) ?? [],
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }

  private updateTask(taskId: string, changes: Partial<CalendarTask>): void {
    this.days.update((weeks) =>
      weeks.map((week) =>
        week.map((day) =>
          day
            ? {
                ...day,
                items: day.items.map((item) => (item.id === taskId ? { ...item, ...changes } : item)),
              }
            : day,
        ),
      ),
    );
    this.agenda.update((items) => items.map((item) => (item.id === taskId ? { ...item, ...changes } : item)));
  }

  private removeTask(taskId: string): void {
    this.days.update((weeks) =>
      weeks.map((week) =>
        week.map((day) =>
          day
            ? {
                ...day,
                items: day.items.filter((item) => item.id !== taskId),
              }
            : day,
        ),
      ),
    );
    this.agenda.update((items) => items.filter((item) => item.id !== taskId));
  }

  private parseHours(value: number | string | null | undefined): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsedValue = Number(value.replace(',', '.'));
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    return null;
  }
}
