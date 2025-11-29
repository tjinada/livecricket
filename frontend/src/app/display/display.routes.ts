import { Routes } from '@angular/router';

export const DISPLAY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/display-home/display-home.component').then(m => m.DisplayHomeComponent)
  },
  {
    path: ':matchId',
    loadComponent: () => import('./pages/match-display/match-display.component').then(m => m.MatchDisplayComponent)
  }
];
