import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell, faMoon, faUser } from '@fortawesome/free-solid-svg-icons';
import { ThemeService } from '../../../services/theme.service';

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

  readonly showNotificationPopup = signal(false);

  readonly isDark = this.themeService.isDark;

  readonly bellIcon = faBell;
  readonly moonIcon = faMoon;
  readonly userIcon = faUser;

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
}
