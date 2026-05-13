import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowRight, faEnvelope, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { InputLogin } from "../input-login/input-login";
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { apiFetch, getApiErrorMessage } from '../../services/api.service';

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

  @Output() success = new EventEmitter<void>();

  emailIcon = faEnvelope;
  passwordIcon = faLock;
  arrowIcon = faArrowRight;
  lockIcon: IconDefinition = faLock;
  nameIcon: IconDefinition = faUser;
  readonly isSubmitting = signal(false);
  readonly formError = signal('');
  readonly formSuccess = signal('');

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

  async submit(): Promise<void> {
    this.formError.set('');
    this.formSuccess.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const payload = this.registerForm.getRawValue();

      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          password: payload.password,
          confirmPassword: payload.confirmPassword,
          acceptTerms: payload.terms,
        }),
      });

      this.formSuccess.set('Conta criada com sucesso. Agora faca o login.');
      this.registerForm.reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: false,
      });
      this.success.emit();
    } catch (error) {
      this.formError.set(getApiErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
