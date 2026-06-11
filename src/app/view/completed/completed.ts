import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBroom, faCalendarDays, faDownload, faFilter } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { TaskPriority } from '../../core/models/task.model';
import { TasksService } from '../../core/services/tasks.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';

interface CompletedTaskView {
  id: string;
  title: string;
  course: string;
  date: string;
  duration: string;
  priority: TaskPriority;
}

@Component({
  selector: 'app-completed',
  imports: [AppLayout, FontAwesomeModule],
  templateUrl: './completed.html',
  styleUrl: './completed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Completed {
  private readonly tasksService = inject(TasksService);

  readonly search = signal('');
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly tasks = signal<CompletedTaskView[]>([]);

  readonly filteredTasks = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.tasks();
    }

    return this.tasks().filter((task) => {
      return task.title.toLowerCase().includes(term) || task.course.toLowerCase().includes(term);
    });
  });

  readonly totalCompleted = computed(() => this.tasks().length);
  readonly totalHours = computed(() =>
    this.tasks().reduce((sum, task) => sum + this.durationToHours(task.duration), 0),
  );

  readonly downloadIcon = faDownload;
  readonly broomIcon = faBroom;
  readonly filterIcon = faFilter;
  readonly calendarIcon = faCalendarDays;

  constructor() {
    this.loadCompletedTasks();
  }

  updateSearch(value: string): void {
    this.search.set(value);
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

  private loadCompletedTasks(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.tasksService
      .getCompletedTasks()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          this.tasks.set(
            response.items.map((task) => ({
              id: task.id,
              title: task.title,
              course: task.course,
              date: this.formatDate(task.completedAt),
              duration: this.formatDuration(task.durationHours),
              priority: task.priority,
            })),
          );
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar as tarefas concluidas.');
        },
      });
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private formatDuration(hours: number | string | null | undefined): string {
    const parsedHours = this.parseHours(hours);

    if (parsedHours === null) {
      return '-';
    }

    const wholeHours = Math.floor(parsedHours);
    const minutes = Math.round((parsedHours - wholeHours) * 60);
    return `${wholeHours}h ${minutes.toString().padStart(2, '0')}m`;
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

  private durationToHours(duration: string): number {
    const match = duration.match(/(\d+)h\s+(\d+)m/);
    if (!match) {
      return 0;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours + minutes / 60;
  }
}
