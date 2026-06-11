import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faCircleInfo,
  faPlus,
  faTags,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';
import { apiFetch, getApiErrorMessage } from '../../shared/services/api.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { startWith } from 'rxjs';

type Priority = 'baixa' | 'media' | 'alta';
type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

interface PriorityOption {
  value: Priority;
  label: string;
}

interface RecurrenceOption {
  value: Recurrence;
  label: string;
}

interface RecentTask {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  dueTime: string | null;
}

interface TasksResponse {
  items: RecentTask[];
}

@Component({
  selector: 'app-tasks',
  imports: [AppLayout, FontAwesomeModule, ReactiveFormsModule, RouterLink],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tasks {
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = signal('');
  readonly isSubmitting = signal(false);
  readonly saveMessage = signal('');
  readonly saveError = signal('');
  readonly errorMessage = signal('');
  readonly recentTasks = signal<RecentTask[]>([]);

  readonly priorities: PriorityOption[] = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
  ];

  readonly recurrenceOptions: RecurrenceOption[] = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'daily', label: 'Diaria' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
  ];

  readonly selectedTags = signal<string[]>(['Provas', 'Urgente']);
  readonly formIsValid = signal(false);

  readonly date = new Date();
  readonly minDate = this.formatDate(this.date);

  readonly taskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    description: [''],
    course: ['', [Validators.required, Validators.minLength(2)]],
    priority: ['media' as Priority, [Validators.required]],
    dueDate: [this.minDate, [Validators.required]],
    dueTime: [this.formatTime(this.date)],
    estimatedHours: ['2.5', [Validators.pattern(/^(?:\d+|\d+[.,]\d+)$/)]],
    recurrence: ['none' as Recurrence, [Validators.required]],
    newTag: [''],
  });

  readonly canSubmit = computed(() => this.formIsValid() && this.selectedTags().length > 0);

  readonly infoIcon = faCircleInfo;
  readonly tagsIcon = faTags;
  readonly calendarIcon = faCalendarDays;
  readonly plusIcon = faPlus;
  readonly removeIcon = faXmark;

  constructor() {
    this.taskForm.statusChanges
      .pipe(startWith(this.taskForm.status), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.formIsValid.set(this.taskForm.valid);
      });

    void this.loadRecentTasks();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  selectPriority(priority: Priority): void {
    this.taskForm.controls.priority.setValue(priority);
  }

  addTag(): void {
    const rawValue = this.taskForm.controls.newTag.value;
    const nextTag = rawValue.trim();

    if (!nextTag) {
      return;
    }

    const exists = this.selectedTags().some((tag) => tag.toLowerCase() === nextTag.toLowerCase());
    if (exists) {
      this.taskForm.controls.newTag.setValue('');
      return;
    }

    this.selectedTags.update((current) => [...current, nextTag]);
    this.taskForm.controls.newTag.setValue('');
  }

  removeTag(tagToRemove: string): void {
    this.selectedTags.update((current) => current.filter((tag) => tag !== tagToRemove));
  }

  async saveTask(): Promise<void> {
    this.saveMessage.set('');
    this.saveError.set('');

    if (!this.canSubmit()) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const token = this.session.token();
    if (!token) {
      void this.router.navigate(['/login']);
      return;
    }

    this.isSubmitting.set(true);

    try {
      const task = this.taskForm.getRawValue();

      const estimatedHours = task.estimatedHours.trim();
      const description = task.description.trim();
      const dueTime = task.dueTime.trim();

      await apiFetch('/tasks', {
        method: 'POST',
        token,
        body: JSON.stringify({
          title: task.title,
          description: description ? description : undefined,
          course: task.course,
          priority: task.priority,
          dueDate: task.dueDate,
          dueTime: dueTime ? dueTime : undefined,
          estimatedHours: estimatedHours ? Number(estimatedHours.replace(',', '.')) : undefined,
          recurrence: task.recurrence,
          tags: this.selectedTags(),
        }),
      });

      this.saveMessage.set(`Tarefa "${task.title}" criada com sucesso.`);
      this.taskForm.reset({
        title: '',
        description: '',
        course: '',
        priority: 'media',
        dueDate: task.dueDate,
        dueTime: '',
        estimatedHours: '',
        recurrence: 'none',
        newTag: '',
      });
      this.selectedTags.set(['Provas', 'Urgente']);
      await this.loadRecentTasks();
    } catch (error) {
      this.saveError.set(getApiErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadRecentTasks(): Promise<void> {
    const token = this.session.token();

    if (!token) {
      this.recentTasks.set([]);
      return;
    }

    this.errorMessage.set('');

    try {
      const response = await apiFetch<TasksResponse>('/tasks', { token });
      this.recentTasks.set(response.items.slice(0, 4));
    } catch (error) {
      this.errorMessage.set(getApiErrorMessage(error));
    }
  }
}
