import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarCheck,
  faCalendarDays,
  faChartLine,
  faCheck,
  faChevronRight,
  faClock,
  faFilter,
  faMagnifyingGlass,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { DashboardSummary } from '../../core/models/dashboard.model';
import { TaskPriority, TaskStatus } from '../../core/models/task.model';
import { DashboardService } from '../../core/services/dashboard.service';
import { TasksService } from '../../core/services/tasks.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';

@Component({
  selector: 'app-dashboard',
  imports: [FontAwesomeModule, AppLayout],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);
  private readonly tasksService = inject(TasksService);

  readonly search = signal('');
  readonly summary = signal<DashboardSummary | null>(null);
  readonly isLoading = signal(true);
  readonly isUpdatingTask = signal<string | null>(null);
  readonly errorMessage = signal('');

  readonly userName = computed(() => this.summary()?.userName ?? 'Estudante');
  readonly filteredTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    const tasks = this.summary()?.tasks ?? [];

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
  readonly pendingTasks = computed(() => (this.summary()?.tasks ?? []).filter((task) => task.status !== 'completed'));
  readonly lateTasks = computed(() => this.summary()?.stats.overdueTasks ?? 0);
  readonly focusItems = computed(() => this.summary()?.focusItems ?? []);

  readonly searchIcon = faMagnifyingGlass;
  readonly plusIcon = faPlus;
  readonly calendarIcon = faCalendarDays;
  readonly clockIcon = faClock;
  readonly deadlineIcon = faCalendarCheck;
  readonly chartIcon = faChartLine;
  readonly filterIcon = faFilter;
  readonly arrowIcon = faChevronRight;
  readonly checkIcon = faCheck;

  constructor() {
    this.loadSummary();
  }

  updateSearch(value: string): void {
    this.search.set(value ?? '');
  }

  openCreateTask(): void {
    void this.router.navigate(['/tasks']);
  }

  toggleTask(taskId: string): void {
    const task = (this.summary()?.tasks ?? []).find((item) => item.id === taskId);
    if (!task || this.isUpdatingTask()) {
      return;
    }

    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    this.isUpdatingTask.set(taskId);

    this.tasksService
      .updateStatus(taskId, nextStatus)
      .pipe(finalize(() => this.isUpdatingTask.set(null)))
      .subscribe({
        next: () => this.loadSummary(),
        error: () => {
          this.errorMessage.set('Nao foi possivel atualizar a tarefa.');
        },
      });
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

  private loadSummary(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.dashboardService
      .getSummary()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar o dashboard.');
        },
      });
  }
}
