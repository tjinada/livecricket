import { Routes } from '@angular/router';
import { authGuard } from '../core/guards/auth.guard';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'countries',
        loadComponent: () => import('./pages/countries/countries.component').then(m => m.CountriesComponent)
      },
      {
        path: 'players',
        loadComponent: () => import('./pages/players/players.component').then(m => m.PlayersComponent)
      },
      {
        path: 'matches',
        loadComponent: () => import('./pages/matches/matches.component').then(m => m.MatchesComponent)
      },
      {
        path: 'scoring/:matchId',
        loadComponent: () => import('./pages/scoring/scoring.component').then(m => m.ScoringComponent)
      }
    ]
  }
];
