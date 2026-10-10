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
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    title: 'Mot de passe oublié · EduFlow',
    loadComponent: () =>
      import('./pages/forgot-password.component').then((m) => m.ForgotPasswordComponent),
  },
  {
    // No guest guard: the link from the e-mail must work even in a browser that is signed in
    path: 'reset-password',
    title: 'Nouveau mot de passe · EduFlow',
    loadComponent: () =>
      import('./pages/reset-password.component').then((m) => m.ResetPasswordComponent),
  },
];

export default routes;
