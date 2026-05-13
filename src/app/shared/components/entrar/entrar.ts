import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowRight, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InputLogin } from "../input-login/input-login";
import { apiFetch, getApiErrorMessage } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

@Component({
  selector: 'app-entrar',
  imports: [FontAwesomeModule, InputLogin, ReactiveFormsModule],
  templateUrl: './entrar.html',
  styleUrl: './entrar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Entrar {
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  emailIcon = faEnvelope;
  arrowIcon = faArrowRight;
  lockIcon: IconDefinition = faLock;
  readonly isSubmitting = signal(false);
  readonly formError = signal('');

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  async submit(): Promise<void> {
    this.formError.set('');

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const payload = this.loginForm.getRawValue();
      const response = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          rememberMe: payload.rememberMe,
        }),
      });

      this.authService.setToken(response.accessToken);
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.formError.set(getApiErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
