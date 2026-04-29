import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faArrowRight, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { InputLogin } from "../input-login/input-login";
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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

  emailIcon = faEnvelope;
  arrowIcon = faArrowRight;
  lockIcon: IconDefinition = faLock;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    void this.router.navigate(['/dashboard']);
  }
}
