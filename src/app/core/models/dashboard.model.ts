import { TaskPriority, TaskStatus } from './task.model';

export interface DashboardSummary {
  userName: string;
  stats: {
    todayTasks: number;
    overdueTasks: number;
    nextDeadlineIn: string | null;
    weeklyAverage: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    course: string;
    deadlineLabel: string;
    priority: TaskPriority;
    status: TaskStatus;
  }>;
  focusItems: Array<{
    id: string;
    title: string;
    subtitle: string;
    tone: 'amber' | 'cyan';
  }>;
}
