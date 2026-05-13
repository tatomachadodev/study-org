import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRight, faEnvelope, faLock } from '@fortawesome/free-solid-svg-icons';
import { Logo } from '../../shared/components/logo/logo';
import { Entrar } from "../../shared/components/entrar/entrar";
import { NgIf } from "@angular/common";
import { Registrar } from "../../shared/components/registrar/registrar";
@Component({
  selector: 'app-login',
  imports: [Logo, FontAwesomeModule, Entrar, NgIf, Registrar],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  logo = Logo;
  emailIcon = faEnvelope;
  passwordIcon = faLock;
  arrowIcon = faArrowRight;
  activeTab: 'entrar' | 'cadastrar' = 'entrar';

  switchTab(tab: 'entrar' | 'cadastrar') {
    this.activeTab = tab;
  }
}
