export type TaskPriority = 'baixa' | 'media' | 'alta';
export type TaskStatus = 'pending' | 'completed' | 'overdue';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description: string;
  course: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  dueTime: string | null;
  estimatedHours: number | null;
  recurrence: TaskRecurrence;
  tags: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  items: Task[];
  page: number;
  limit: number;
  total: number;
}

export interface CompletedTasksResponse {
  items: Array<{
    id: string;
    title: string;
    course: string;
    completedAt: string;
    durationHours: number;
    priority: TaskPriority;
  }>;
}

export interface TaskCreateRequest {
  title: string;
  description: string;
  course: string;
  priority: TaskPriority;
  dueDate: string;
  dueTime: string;
  estimatedHours: number | null;
  recurrence: TaskRecurrence;
  tags: string[];
}
