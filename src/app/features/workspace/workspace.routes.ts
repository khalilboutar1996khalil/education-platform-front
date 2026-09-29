import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/guards';
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Tableau de bord · EduFlow',
    loadComponent: () =>
      import('../dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
  {
    path: 'courses',
    title: 'Modules · EduFlow',
    loadComponent: () =>
      import('../courses/course-list.component').then((m) => m.CourseListComponent),
  },
  {
    path: 'courses/:id',
    title: 'Module · EduFlow',
    loadComponent: () =>
      import('../courses/course-detail.component').then((m) => m.CourseDetailComponent),
  },
  {
    path: 'quizzes',
    title: 'Quiz · EduFlow',
    loadComponent: () =>
      import('../quizzes/quizzes-page.component').then((m) => m.QuizzesPageComponent),
  },
  {
    path: 'quizzes/:id',
    title: 'Quiz · EduFlow',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('../quizzes/quiz-detail.component').then((m) => m.QuizDetailComponent),
  },
  {
    path: 'assignments',
    title: 'TP & devoirs · EduFlow',
    loadComponent: () =>
      import('../assignments/assignments-page.component').then((m) => m.AssignmentsPageComponent),
  },
  {
    path: 'corrections',
    title: 'Corrections · EduFlow',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('../assignments/corrections.component').then((m) => m.CorrectionsComponent),
  },
  {
    path: 'resources',
    title: 'Ressources · EduFlow',
    loadComponent: () =>
      import('../resources/resource-list.component').then((m) => m.ResourceListComponent),
  },
  {
    path: 'students',
    title: 'Élèves · EduFlow',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('../students/students-page.component').then((m) => m.StudentsPageComponent),
  },
  {
    path: 'grades',
    title: 'Notes · EduFlow',
    loadComponent: () =>
      import('../grades/grades-page.component').then((m) => m.GradesPageComponent),
  },
  {
    path: 'class-codes',
    title: 'Codes de classe · EduFlow',
    canActivate: [roleGuard('ADMIN')],
    loadComponent: () =>
      import('../class-codes/class-codes-page.component').then((m) => m.ClassCodesPageComponent),
  },
  {
    path: 'announcements',
    title: 'Annonces · EduFlow',
    loadComponent: () =>
      import('../announcements/announcements-page.component').then((m) => m.AnnouncementsPageComponent),
  },
  {
    path: 'blog',
    title: 'Blog · EduFlow',
    loadComponent: () =>
      import('../blog/blog-list.component').then((m) => m.BlogListComponent),
  },
  {
    path: 'blog/:id',
    title: 'Article · EduFlow',
    loadComponent: () =>
      import('../blog/post-detail.component').then((m) => m.PostDetailComponent),
  },
  {
    path: 'settings',
    title: 'Paramètres · EduFlow',
    loadComponent: () =>
      import('../settings/settings-page.component').then((m) => m.SettingsPageComponent),
  },
];

export default routes;
