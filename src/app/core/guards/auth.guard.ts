import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export const authGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  // Allow anonymous navigation during local development (localhost/127.0.0.1)
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }
  } catch {
    // ignore
  }

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
