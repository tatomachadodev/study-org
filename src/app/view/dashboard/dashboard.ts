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
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { TaskPriority, TaskStatus } from '../../core/models/task.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { TasksService } from '../../core/services/tasks.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';
import { apiFetch, getApiErrorMessage } from '../../shared/services/api.service';
import { AuthService } from '../../shared/services/auth.service';

type Priority = 'alta' | 'media' | 'baixa';
type TaskStatus = 'pending' | 'completed' | 'overdue';

interface StudyTask {
  id: string;
  title: string;
  course: string;
  date: string;
  time: string | null;
  deadlineLabel: string;
  priority: Priority;
  status: TaskStatus;
  done: boolean;
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
    course: string;
    dueDate: string;
    dueTime: string | null;
    status: TaskStatus;
    priority: Priority;
  }>;
}

interface ToggleTaskResponse {
  id: string;
  status: TaskStatus;
  completedAt: string | null;
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
  private readonly authService = inject(AuthService);

  readonly userName = signal('');
  readonly search = signal('');
  readonly hoveredTaskId = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly loadError = signal('');
  readonly summary = signal<DashboardSummary['stats']>({
    todayTasks: 0,
    overdueTasks: 0,
    nextDeadlineIn: null,
    weeklyAverage: 0,
  });
  readonly tasks = signal<StudyTask[]>([]);
  readonly focusItems = signal<FocusItem[]>([]);
  readonly togglingTaskId = signal<string | null>(null);

  readonly filteredTasks = computed(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) {
      return tasks;
    }

    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(term) ||
        task.course.toLowerCase().includes(term) ||
        task.deadlineLabel.toLowerCase().includes(term)
      );
    });
  });

  readonly pendingTasks = computed(() => this.tasks().filter((task) => !task.done));
  readonly lateTasks = computed(() => this.tasks().filter((task) => task.status === 'overdue'));
  readonly tasksNext30Days = computed(() => this.tasks().filter((task) => !task.done && (task.status === 'overdue' || this.isWithinDays(task.date, 30))));
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

  constructor() {
    void this.loadDashboard();
  }

  updateSearch(value: string): void {
    this.search.set(value ?? '');
  }

  openCreateTask(): void {
    void this.router.navigate(['/tasks']);
  }

  async toggleTask(taskId: string): Promise<void> {
    const token = this.authService.token();
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
                status: response.status,
                done: response.status === 'completed',
              }
            : task,
        ),
      );
      // Recarrega o resumo para atualizar cartões e estatísticas
      await this.loadDashboard();
    } catch (error) {
      this.loadError.set(getApiErrorMessage(error));
    } finally {
      this.togglingTaskId.set(null);
    }
  }

  setHoveredTask(taskId: string | null): void {
    this.hoveredTaskId.set(taskId);
  }

  priorityClass(priority: TaskPriority): string {
    if (priority === 'alta') {
      return 'bg-red-500 text-white';
    }
    if (priority === 'media') {
      return 'bg-neutral-300 text-neutral-700';
    }
    return 'bg-emerald-200 text-emerald-800';
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
    const token = this.authService.token();

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

  private toStudyTask(task: TasksResponse['items'][number]): StudyTask {
    // Recalculate status based on date if not completed
    let status = task.status;
    if (task.status !== 'completed') {
      const dueDate = Date.parse(`${task.dueDate}T${task.dueTime ?? '23:59'}:00Z`);
      const now = Date.now();
      if (dueDate < now) {
        status = 'overdue';
      } else {
        status = 'pending';
      }
    }

    return {
      id: task.id,
      title: task.title,
      course: task.course,
      date: task.dueDate,
      time: task.dueTime,
      deadlineLabel: this.formatDeadlineLabel(task.dueDate, task.dueTime),
      priority: task.priority,
      status,
      done: task.status === 'completed',
    };
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
}
