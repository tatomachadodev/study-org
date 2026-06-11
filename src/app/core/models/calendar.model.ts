import { TaskPriority, TaskRecurrence, TaskStatus } from './task.model';

export interface CalendarResponse {
  items: Array<{
    id: string;
    title: string;
    description: string | null;
    course: string;
    date: string;
    time: string | null;
    dueDate: string;
    dueTime: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    estimatedHours: number | null;
    recurrence: TaskRecurrence;
    tags: string[];
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}
