import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'display',
    pathMatch: 'full'
  },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./admin/pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'display',
    loadChildren: () => import('./display/display.routes').then(m => m.DISPLAY_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'display'
  }
];
