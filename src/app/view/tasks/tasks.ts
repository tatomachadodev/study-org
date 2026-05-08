import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCalendarDays,
  faCircleInfo,
  faPlus,
  faTags,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Task, TaskPriority, TaskRecurrence } from '../../core/models/task.model';
import { TasksService } from '../../core/services/tasks.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';

interface PriorityOption {
  value: TaskPriority;
  label: string;
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
  private readonly tasksService = inject(TasksService);
  private readonly destroyRef = inject(DestroyRef);

  readonly search = signal('');
  readonly selectedTags = signal<string[]>([]);
  readonly saveMessage = signal('');
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);
  readonly recentTasks = signal<Task[]>([]);
  readonly isFormValid = signal(false);

  readonly priorities: PriorityOption[] = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
  ];

  readonly recurrenceOptions: Array<{ value: TaskRecurrence; label: string }> = [
    { value: 'none', label: 'Nenhuma' },
    { value: 'daily', label: 'Diaria' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
  ];

  readonly taskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(4)]],
    description: [''],
    course: ['', [Validators.required, Validators.minLength(2)]],
    priority: ['media' as TaskPriority, [Validators.required]],
    dueDate: [this.getTodayDate(), [Validators.required]],
    dueTime: ['14:00', [Validators.required]],
    estimatedHours: [''],
    recurrence: ['none' as TaskRecurrence, [Validators.required]],
    newTag: [''],
  });

  readonly infoIcon = faCircleInfo;
  readonly tagsIcon = faTags;
  readonly calendarIcon = faCalendarDays;
  readonly plusIcon = faPlus;
  readonly removeIcon = faXmark;

  constructor() {
    this.isFormValid.set(this.taskForm.valid);
    this.taskForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.isFormValid.set(this.taskForm.valid);
      });

    this.loadRecentTasks();
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  selectPriority(priority: TaskPriority): void {
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

  saveTask(): void {
    if (!this.isFormValid()) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.saveMessage.set('');

    const task = this.taskForm.getRawValue();
    const estimatedHours = task.estimatedHours.trim() ? Number(task.estimatedHours.replace(',', '.')) : null;
    const normalizedRecurrence = this.normalizeRecurrence(task.recurrence);

    this.tasksService
      .createTask({
        title: task.title.trim(),
        description: task.description.trim(),
        course: task.course.trim(),
        priority: task.priority,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        estimatedHours,
        recurrence: normalizedRecurrence,
        tags: this.selectedTags(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (createdTask) => {
          this.saveMessage.set(`Tarefa "${createdTask.title}" criada com sucesso.`);
          this.taskForm.reset({
            title: '',
            description: '',
            course: '',
            priority: 'media',
            dueDate: this.getTodayDate(),
            dueTime: '14:00',
            estimatedHours: '',
            recurrence: 'none',
            newTag: '',
          });
          this.selectedTags.set([]);
          this.loadRecentTasks();
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  private loadRecentTasks(): void {
    this.tasksService.getTasks({ status: 'pending' }).subscribe({
      next: (response) => {
        this.recentTasks.set(response.items.slice(0, 5));
      },
      error: () => {
        this.recentTasks.set([]);
      },
    });
  }

  private getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeRecurrence(value: string): TaskRecurrence {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'diaria' || normalized === 'daily') {
      return 'daily';
    }

    if (normalized === 'semanal' || normalized === 'weekly') {
      return 'weekly';
    }

    if (normalized === 'mensal' || normalized === 'monthly') {
      return 'monthly';
    }

    return 'none';
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error?.message === 'string') {
        const fieldErrors = error.error?.errors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const details = Object.values(fieldErrors).flat().join(' ');
          return details ? `${error.error.message} ${details}` : error.error.message;
        }

        return error.error.message;
      }
    }

    return 'Nao foi possivel criar a tarefa.';
  }
}
