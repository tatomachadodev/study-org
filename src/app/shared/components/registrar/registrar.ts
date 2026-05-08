import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowRight, faEnvelope, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { InputLogin } from "../input-login/input-login";

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const group = control as {
    controls?: {
      password?: AbstractControl;
      confirmPassword?: AbstractControl;
    };
  };

  const password = group.controls?.password?.value as string | null | undefined;
  const confirmPassword = group.controls?.confirmPassword?.value as string | null | undefined;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-registrar',
  imports: [FontAwesomeModule, InputLogin, ReactiveFormsModule],
  templateUrl: './registrar.html',
  styleUrl: './registrar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Registrar {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  emailIcon = faEnvelope;
  passwordIcon = faLock;
  arrowIcon = faArrowRight;
  lockIcon: IconDefinition = faLock;
  nameIcon: IconDefinition = faUser;
  isSubmitting = false;
  errorMessage = '';

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [passwordsMatchValidator] },
  );

  submit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const formValue = this.registerForm.getRawValue();

    this.authService
      .register({
        name: formValue.name,
        email: formValue.email,
        password: formValue.password,
        confirmPassword: formValue.confirmPassword,
        acceptTerms: formValue.terms,
      })
      .pipe(
        switchMap(() =>
          this.authService.login({
            email: formValue.email,
            password: formValue.password,
            rememberMe: true,
          }),
        ),
        finalize(() => (this.isSubmitting = false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return 'Nao foi possivel concluir o cadastro.';
  }
}
