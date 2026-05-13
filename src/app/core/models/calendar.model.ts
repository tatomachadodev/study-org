import { TaskStatus } from './task.model';

export interface CalendarResponse {
  items: Array<{
    id: string;
    title: string;
    course: string;
    date: string;
    time: string;
    status: TaskStatus;
  }>;
}
