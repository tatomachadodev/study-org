import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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

  emailIcon = faEnvelope;
  passwordIcon = faLock;
  arrowIcon = faArrowRight;
  lockIcon: IconDefinition = faLock;
  nameIcon: IconDefinition = faUser;

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

    // Cadastro ainda não integrado a backend.
    // Mantemos apenas a validacao visual solicitada.
  }
}
