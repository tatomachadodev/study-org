import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MobileNav } from '../mobile-nav/mobile-nav';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-layout',
  imports: [Sidebar, Topbar, MobileNav],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppLayout {
  readonly searchValue = input('');
  readonly searchPlaceholder = input('Buscar tarefas, cursos...');
  readonly searchValueChange = output<string>();
  readonly notificationCount = input(0);

  onSearchValueChange(value: string): void {
    this.searchValueChange.emit(value);
  }
}
