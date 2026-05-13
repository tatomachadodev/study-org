import { computed, Injectable, signal } from '@angular/core';

const TOKEN_STORAGE_KEY = 'study-org-access-token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenSignal = signal<string | null>(this.readToken());

  readonly token = computed(() => this.tokenSignal());
  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);

  setToken(token: string): void {
    this.tokenSignal.set(token);

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }
  }

  clearToken(): void {
    this.tokenSignal.set(null);

    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage failures in private/incognito contexts.
    }
  }

  private readToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
