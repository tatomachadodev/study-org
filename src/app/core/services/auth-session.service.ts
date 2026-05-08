import { Injectable, computed, signal } from '@angular/core';
import { AuthUser } from '../models/auth.model';

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly storageKey = 'study-org-session';
  private readonly session = signal<StoredSession | null>(this.readSession());

  readonly token = computed(() => this.session()?.accessToken ?? null);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => !!this.token());

  setSession(session: StoredSession): void {
    this.session.set(session);

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session));
    } catch {
      // Ignore storage errors and keep in-memory session.
    }
  }

  clear(): void {
    this.session.set(null);

    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Ignore storage errors.
    }
  }

  private readSession(): StoredSession | null {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as StoredSession;
    } catch {
      return null;
    }
  }
}
