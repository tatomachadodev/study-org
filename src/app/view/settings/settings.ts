import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCircleInfo, faShield } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { UsersService } from '../../core/services/users.service';
import { UserPreferences } from '../../core/models/user.model';
import { AppLayout } from '../../shared/components/layout/app-layout/app-layout';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-settings',
  imports: [AppLayout, FontAwesomeModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly themeService = inject(ThemeService);
  private readonly usersService = inject(UsersService);
  private readonly storageKey = 'study-org-settings-fallback';

  readonly search = signal('');
  readonly emailNotifications = signal(true);
  readonly pushNotifications = signal(false);
  readonly dailySummary = signal(true);
  readonly fullName = signal('');
  readonly email = signal('');
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly saveMessage = signal('');

  readonly isDark = this.themeService.isDark;

  readonly infoIcon = faCircleInfo;
  readonly shieldIcon = faShield;

  constructor() {
    this.loadUser();
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  toggleEmail(): void {
    this.emailNotifications.update((value) => !value);
  }

  togglePush(): void {
    this.pushNotifications.update((value) => !value);
  }

  toggleSummary(): void {
    this.dailySummary.update((value) => !value);
  }

  setLightMode(): void {
    this.themeService.setTheme('light');
  }

  setDarkMode(): void {
    this.themeService.setTheme('dark');
  }

  saveSettings(): void {
    const payload: UserPreferences = {
      theme: this.isDark() ? 'dark' : 'light',
      emailNotifications: this.emailNotifications(),
      pushNotifications: this.pushNotifications(),
      dailySummary: this.dailySummary(),
    };

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.saveMessage.set('');

    this.usersService
      .updatePreferences(payload)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (preferences) => {
          this.applyPreferences(preferences);
          this.saveMessage.set('Preferencias salvas no backend.');
        },
        error: (error: unknown) => {
          this.persistPreferencesLocally(payload);

          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.saveMessage.set('Backend ainda nao expoe preferencias. Configuracoes salvas localmente.');
            return;
          }

          this.errorMessage.set('Nao foi possivel salvar as configuracoes.');
        },
      });
  }

  private loadUser(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.usersService
      .getCurrentUser()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (user) => {
          this.fullName.set(user.name);
          this.email.set(user.email);
          this.applyPreferences(user.preferences);
          this.restoreFallbackPreferences();
        },
        error: () => {
          this.errorMessage.set('Nao foi possivel carregar as configuracoes do usuario.');
          this.restoreFallbackPreferences();
        },
      });
  }

  private applyPreferences(preferences: UserPreferences): void {
    this.emailNotifications.set(preferences.emailNotifications);
    this.pushNotifications.set(preferences.pushNotifications);
    this.dailySummary.set(preferences.dailySummary);

    if (preferences.theme === 'dark') {
      this.themeService.setTheme('dark');
    } else {
      this.themeService.setTheme('light');
    }
  }

  private persistPreferencesLocally(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preferences));
    } catch {
      // Ignore storage errors.
    }
  }

  private restoreFallbackPreferences(): void {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return;
      }

      this.applyPreferences(JSON.parse(rawValue) as UserPreferences);
    } catch {
      // Ignore storage errors.
    }
  }
}
