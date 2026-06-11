import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell, faMoon } from '@fortawesome/free-solid-svg-icons';
import { ThemeService } from '../../../services/theme.service';

interface NotificationItem {
  id: string;
  title: string;
  course: string;
  deadlineLabel: string;
  priority: string;
  status: string;
}

@Component({
  selector: 'app-topbar',
  imports: [FontAwesomeModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Topbar {
  private readonly themeService = inject(ThemeService);

  readonly searchValue = input('');
  readonly searchPlaceholder = input('Buscar tarefas, cursos...');
  readonly searchValueChange = output<string>();
  readonly notificationCount = input(0);
  readonly notificationItems = input<NotificationItem[]>([]);

  readonly showNotificationPopup = signal(false);

  readonly isDark = this.themeService.isDark;

  readonly bellIcon = faBell;
  readonly moonIcon = faMoon;

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchValueChange.emit(input.value ?? '');
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleNotificationPopup(): void {
    this.showNotificationPopup.update((current) => !current);
  }

  notificationPriorityClass(priority: string): string {
    if (priority === 'alta') {
      return 'border border-red-200 bg-red-100 text-red-800';
    }

    if (priority === 'media') {
      return 'border border-amber-200 bg-amber-100 text-amber-800';
    }

    return 'border border-emerald-200 bg-emerald-100 text-emerald-800';
  }
}
