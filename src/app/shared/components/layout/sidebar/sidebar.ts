import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRightFromBracket,
  faCalendarDays,
  faCircleCheck,
  faCirclePlus,
  faCog,
  faTableColumns,
} from '@fortawesome/free-solid-svg-icons';
import { AuthSessionService } from '../../../../core/services/auth-session.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, FontAwesomeModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly router = inject(Router);
  private readonly session = inject(AuthSessionService);

  readonly dashboardIcon = faTableColumns;
  readonly createTaskIcon = faCirclePlus;
  readonly calendarIcon = faCalendarDays;
  readonly completedIcon = faCircleCheck;
  readonly settingsIcon = faCog;
  readonly logoutIcon = faArrowRightFromBracket;

  logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
