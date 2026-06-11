import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck,
  faCalendarDays,
  faChartLine,
  faCheck,
  faClock,
  faPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';
import { apiFetch, getApiErrorMessage } from '../../shared/services/api.service';
import { AuthSessionService } from '../../core/services/auth-session.service';

type Priority = 'alta' | 'media' | 'baixa';
type TaskStatus = 'pending' | 'completed' | 'overdue';

interface StudyTask {
  id: string;
  title: string;
  description: string | null;
  course: string;
  date: string;
  time: string | null;
  deadlineLabel: string;
  priority: Priority;
  status: TaskStatus;
  done: boolean;
  estimatedHours: number | null;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FocusItem {
  id: string;
  title: string;
  subtitle: string;
  tone: 'amber' | 'cyan';
}

interface DashboardSummary {
  userName: string;
  stats: {
    todayTasks: number;
    overdueTasks: number;
    nextDeadlineIn: string | null;
    weeklyAverage: number;
  };
  focusItems: FocusItem[];
}

interface TasksResponse {
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    course: string;
    dueDate: string;
    dueTime: string | null;
    status: TaskStatus;
    priority: Priority;
    estimatedHours: number | null;
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
    tags: string[];
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface ToggleTaskResponse {
  id: string;
  status: TaskStatus;
  completedAt: string | null;
}

interface CompletedTask {
  id: string;
  title: string;
  course: string;
  completedAt: string;
  durationHours: number | null;
  priority: Priority;
}

interface CompletedTasksResponse {
  items: CompletedTask[];
}

@Component({
  selector: 'app-dashboard',
  imports: [FontAwesomeModule, AppLayout],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  readonly userName = signal('');
  readonly search = signal('');
  readonly hoveredTaskId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly completedTasks = signal<CompletedTask[]>([]);
  readonly completedTasksError = signal('');
  readonly isCompletedModalOpen = signal(false);
  readonly isLoadingCompletedTasks = signal(false);
  readonly selectedTask = signal<StudyTask | null>(null);
  readonly summary = signal<DashboardSummary['stats']>({
    todayTasks: 0,
    overdueTasks: 0,
    nextDeadlineIn: null,
    weeklyAverage: 0,
  });
  readonly tasks = signal<StudyTask[]>([]);
  readonly focusItems = signal<FocusItem[]>([]);
  readonly togglingTaskId = signal<string | null>(null);
  readonly deletingTaskId = signal<string | null>(null);

  readonly filteredTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tasks = [...this.tasks()]
      .filter((task) => !task.done)
      .sort((left, right) => this.sortByDeadline(left, right));

    if (!term) {
      return tasks;
    }

    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(term) ||
        task.course.toLowerCase().includes(term) ||
        task.deadlineLabel.toLowerCase().includes(term) ||
        task.priority.toLowerCase().includes(term) ||
        task.status.toLowerCase().includes(term) ||
        task.date.includes(term) ||
        this.statusLabel(task.status).toLowerCase().includes(term)
      );
    });
  });

  readonly visibleTasks = computed(() => this.filteredTasks().slice(0, 5));
  readonly hasHiddenFilteredTasks = computed(() => this.filteredTasks().length > this.visibleTasks().length);

  readonly pendingTasks = computed(() => this.tasks().filter((task) => !task.done));
  readonly lateTasks = computed(() => this.tasks().filter((task) => task.status === 'overdue'));
  readonly tasksNext30Days = computed(() => this.tasks().filter((task) => !task.done && task.status !== 'overdue' && this.isWithinDays(task.date, 30)));
  readonly tasksNext7Days = computed(() => this.tasks().filter((task) => !task.done && (task.status === 'overdue' || (this.isWithinDays(task.date, 7) && task.status !== 'completed'))));

  readonly nextDeadlineDisplay = computed(() => {
    return this.summary().nextDeadlineIn ?? '-';
  });

  readonly weeklyAverageDisplay = computed(() => `${this.summary().weeklyAverage}%`);

  readonly weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'] as const;

  readonly weeklyTasksIntensity = computed(() => {
    const intensity: Record<string, number> = {
      Seg: 0,
      Ter: 0,
      Qua: 0,
      Qui: 0,
      Sex: 0,
      Sab: 0,
      Dom: 0,
    };

    this.tasks().forEach((task) => {
      const day = this.formatWeekday(task.date);
      if (day in intensity) {
        intensity[day] += 1;
      }
    });

    return this.weekDays.map((day) => ({
      day,
      count: intensity[day],
    }));
  });

  readonly nextWeekTasks = computed(() => {
    return [...this.tasks()]
      .filter((task) => task.status !== 'completed')
      .sort((left, right) => this.sortByDeadline(left, right))
      .slice(0, 4);
  });

  readonly searchIcon = faPlus;
  readonly plusIcon = faPlus;
  readonly calendarIcon = faCalendarDays;
  readonly clockIcon = faClock;
  readonly deadlineIcon = faCalendarCheck;
  readonly chartIcon = faChartLine;
  readonly checkIcon = faCheck;
  readonly closeIcon = faXmark;

  constructor() {
    void this.loadDashboard();
  }

  updateSearch(value: string): void {
    this.search.set(value ?? '');
  }

  openCreateTask(): void {
    void this.router.navigate(['/tasks']);
  }

  openCompletedTasksModal(): void {
    this.isCompletedModalOpen.set(true);

    if (this.completedTasks().length === 0) {
      void this.loadCompletedTasks();
    }
  }

  closeCompletedTasksModal(): void {
    this.isCompletedModalOpen.set(false);
  }

  openTaskDetails(task: StudyTask): void {
    this.selectedTask.set(task);
  }

  closeTaskDetails(): void {
    this.selectedTask.set(null);
  }

  async toggleTask(taskId: string): Promise<void> {
    const token = this.session.token();
    const currentTask = this.tasks().find((task) => task.id === taskId);

    if (!token || !currentTask) {
      return;
    }

    // mark as toggling to disable the control
    this.togglingTaskId.set(taskId);

    const nextStatus: Exclude<TaskStatus, 'overdue'> = currentTask.done ? 'pending' : 'completed';

    try {
      const response = await apiFetch<ToggleTaskResponse>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: nextStatus }),
      });

      this.tasks.update((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: this.resolveTaskStatus(response.status, task.date, task.time),
                done: response.status === 'completed',
              }
            : task,
        ),
      );
      // Recarrega o resumo para atualizar cartões e estatísticas
      await this.refreshDashboardSummary();
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    } finally {
      this.togglingTaskId.set(null);
    }
  }

  setHoveredTask(taskId: string | null): void {
    this.hoveredTaskId.set(taskId);
  }

  priorityClass(priority: Priority): string {
    if (priority === 'alta') {
      return 'border border-red-200 bg-red-100 text-red-800';
    }
    if (priority === 'media') {
      return 'border border-amber-200 bg-amber-100 text-amber-800';
    }
    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }

  async completeSelectedTask(taskId: string): Promise<void> {
    const token = this.session.token();
    const currentTask = this.tasks().find((task) => task.id === taskId);

    if (!token || !currentTask || currentTask.done) {
      return;
    }

    this.togglingTaskId.set(taskId);
    this.loadError.set('');

    try {
      const response = await apiFetch<ToggleTaskResponse>(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: 'completed' }),
      });

      this.tasks.update((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: response.status,
                done: true,
                completedAt: response.completedAt,
              }
            : task,
        ),
      );
      this.selectedTask.set(null);
      await this.refreshDashboardSummary();
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    } finally {
      this.togglingTaskId.set(null);
    }
  }

  async deleteSelectedTask(taskId: string): Promise<void> {
    const token = this.session.token();

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.deletingTaskId.set(taskId);
    this.loadError.set('');

    try {
      await apiFetch<void>(`/tasks/${taskId}`, {
        method: 'DELETE',
        token,
      });

      this.tasks.update((current) => current.filter((task) => task.id !== taskId));
      this.selectedTask.set(null);
      await this.refreshDashboardSummary();
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
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

  recurrenceLabel(recurrence: StudyTask['recurrence']): string {
    const labels: Record<StudyTask['recurrence'], string> = {
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

  focusClass(tone: 'amber' | 'cyan'): string {
    if (tone === 'amber') {
      return 'border-amber-100 bg-amber-50';
    }
    return 'border-cyan-100 bg-cyan-50';
  }

  heatmapColor(count: number): string {
    if (count === 0) return 'bg-neutral-100 border-neutral-200';
    if (count === 1) return 'bg-cyan-100 border-cyan-200';
    if (count === 2) return 'bg-cyan-300 border-cyan-400';
    return 'bg-cyan-500 border-cyan-600';
  }

  getTaskEmoji(course: string): string {
    const emojiMap: Record<string, string> = {
      engenharia: '⚙️',
      'design digital': '🎨',
      filosofia: '📖',
      computacao: '💻',
      administracao: '📊',
      historia: '📜',
      ciencias: '🧪',
      fisica: '🔬',
      sociologia: '👥',
    };

    return emojiMap[course.toLowerCase()] || '📝';
  }

  async loadDashboard(): Promise<void> {
    const token = this.session.token();

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.isLoading.set(true);
    this.loadError.set('');

    try {
      const [summary, tasks] = await Promise.all([
        apiFetch<DashboardSummary>('/dashboard/summary', { token }),
        apiFetch<TasksResponse>('/tasks', { token }),
      ]);

      this.userName.set(summary.userName);
      this.summary.set(summary.stats);
      this.focusItems.set(summary.focusItems);
      this.tasks.set(tasks.items.map((task) => this.toStudyTask(task)));
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  formatCompletedDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  formatCompletedDuration(hours: number | string | null | undefined): string {
    const parsedHours = this.parseHours(hours);

    if (parsedHours === null) {
      return '-';
    }

    const wholeHours = Math.floor(parsedHours);
    const minutes = Math.round((parsedHours - wholeHours) * 60);
    return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  private async refreshDashboardSummary(): Promise<void> {
    const token = this.session.token();

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.loadError.set('');

    try {
      const summary = await apiFetch<DashboardSummary>('/dashboard/summary', { token });

      this.userName.set(summary.userName);
      this.summary.set(summary.stats);
      this.focusItems.set(summary.focusItems);
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    }
  }

  private async loadCompletedTasks(): Promise<void> {
    const token = this.session.token();

    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.isLoadingCompletedTasks.set(true);
    this.completedTasksError.set('');

    try {
      const response = await apiFetch<CompletedTasksResponse>('/tasks/completed', { token });
      this.completedTasks.set(response.items);
    } catch (error) {
      this.completedTasksError.set(getApiErrorMessage(error));
    } finally {
      this.isLoadingCompletedTasks.set(false);
    }
  }

  private toStudyTask(task: TasksResponse['items'][number]): StudyTask {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      course: task.course,
      date: task.dueDate,
      time: task.dueTime,
      deadlineLabel: this.formatDeadlineLabel(task.dueDate, task.dueTime),
      priority: task.priority,
      status: this.resolveTaskStatus(task.status, task.dueDate, task.dueTime),
      done: task.status === 'completed',
      estimatedHours: task.estimatedHours,
      recurrence: task.recurrence,
      tags: task.tags,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private resolveTaskStatus(status: TaskStatus, date: string, time: string | null): TaskStatus {
    if (status === 'completed') {
      return status;
    }

    const dueDate = Date.parse(`${date}T${time ?? '23:59'}:00Z`);
    return dueDate < Date.now() ? 'overdue' : 'pending';
  }

  private isWithinDays(date: string, days: number): boolean {
    const target = Date.parse(`${date}T00:00:00Z`);
    const today = this.startOfTodayUtc();
    const limit = today + days * 24 * 60 * 60 * 1000;

    return target >= today && target <= limit;
  }

  private sortByDeadline(left: StudyTask, right: StudyTask): number {
    const leftTime = Date.parse(`${left.date}T${left.time ?? '23:59'}:00Z`);
    const rightTime = Date.parse(`${right.date}T${right.time ?? '23:59'}:00Z`);
    return leftTime - rightTime;
  }

  private formatDeadlineLabel(date: string, time: string | null): string {
    const formattedDate = this.formatDateLabel(date);
    return time ? `${formattedDate}, ${time}` : formattedDate;
  }

  private formatDateLabel(date: string): string {
    const parsedDate = new Date(`${date}T12:00:00Z`);
    const today = this.formatDateOnly(new Date());

    if (date === today) {
      return 'Hoje';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      weekday: 'short',
    }).format(parsedDate);
  }

  private formatWeekday(date: string): string {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'] as const;
    return days[new Date(`${date}T12:00:00Z`).getUTCDay()];
  }

  private formatDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private startOfTodayUtc(): number {
    return Date.parse(`${this.formatDateOnly(new Date())}T00:00:00Z`);
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
