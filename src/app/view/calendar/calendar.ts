import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFilter, faPlus } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { CalendarService } from '../../core/services/calendar.service';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';

interface CalendarDay {
  dayNumber: number;
  isoDate: string;
  items: Array<{
    id: string;
    title: string;
    course: string;
    time: string;
  }>;
}

interface DayTask {
  id: string;
  title: string;
  subject: string;
  time: string;
}

@Component({
  selector: 'app-calendar',
  imports: [AppLayout, FontAwesomeModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Calendar {
  private readonly calendarService = inject(CalendarService);
  private readonly now = new Date();

  readonly search = signal('');
  readonly days = signal<Array<Array<CalendarDay | null>>>([]);
  readonly agenda = signal<DayTask[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal('');

  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.now),
  );

  readonly plusIcon = faPlus;
  readonly filterIcon = faFilter;

  constructor() {
    this.loadCalendar();
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  private loadCalendar(): void {
    const month = this.now.getMonth() + 1;
    const year = this.now.getFullYear();

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.calendarService
      .getCalendar(month, year)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          const calendarDays = this.buildCalendarGrid(year, month, response.items);
          this.days.set(calendarDays);
          this.agenda.set(
            response.items.slice(0, 5).map((item) => ({
              id: item.id,
              title: item.title,
              subject: item.course,
              time: item.time,
            })),
          );
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar o calendario.');
        },
      });
  }

  private buildCalendarGrid(
    year: number,
    month: number,
    items: Array<{ id: string; title: string; course: string; date: string; time: string }>,
  ): Array<Array<CalendarDay | null>> {
    const taskMap = new Map<string, CalendarDay['items']>();

    for (const item of items) {
      const current = taskMap.get(item.date) ?? [];
      current.push({
        id: item.id,
        title: item.title,
        course: item.course,
        time: item.time,
      });
      taskMap.set(item.date, current);
    }

    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const startOffset = firstDayOfMonth.getDay();
    const weeks: Array<Array<CalendarDay | null>> = [];
    let currentWeek: Array<CalendarDay | null> = Array.from({ length: startOffset }, () => null);

    for (let day = 1; day <= lastDayOfMonth.getDate(); day += 1) {
      const isoDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
      currentWeek.push({
        dayNumber: day,
        isoDate,
        items: taskMap.get(isoDate) ?? [],
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }
}
