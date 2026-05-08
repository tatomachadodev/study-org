import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';


export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    {
        path: 'login',
        loadComponent: () => import('./view/login/login').then((m) => m.Login),
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./view/dashboard/dashboard').then((m) => m.Dashboard),
    },
    {
        path: 'tasks',
        canActivate: [authGuard],
        loadComponent: () => import('./view/tasks/tasks').then((m) => m.Tasks),
    },
    {
        path: 'calendar',
        canActivate: [authGuard],
        loadComponent: () => import('./view/calendar/calendar').then((m) => m.Calendar),
    },
    {
        path: 'completed',
        canActivate: [authGuard],
        loadComponent: () => import('./view/completed/completed').then((m) => m.Completed),
    },
    {
        path: 'settings',
        canActivate: [authGuard],
        loadComponent: () => import('./view/settings/settings').then((m) => m.Settings),
    },
    { path: '**', redirectTo: 'login' }
];
