import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards';
import { LandingComponent } from './landing/landing.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent,
    title: 'EduFlow — Informatique du secondaire, 100% en ligne',
  },
  {
    // login, register, request-access
    path: '',
    loadChildren: () => import('./features/auth/auth.routes'),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    loadChildren: () => import('./features/workspace/workspace.routes'),
  },
  { path: '**', redirectTo: '' },
];
