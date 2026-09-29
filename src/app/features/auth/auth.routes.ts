import { Routes } from '@angular/router';
import { guestGuard } from '../../core/auth/guards';

const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Connexion · EduFlow',
    loadComponent: () => import('./pages/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Créer mon compte · EduFlow',
    loadComponent: () => import('./pages/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'request-access',
    canActivate: [guestGuard],
    title: "Demander un accès · EduFlow",
    loadComponent: () =>
      import('./pages/request-access.component').then((m) => m.RequestAccessComponent),
  },
];

export default routes;
