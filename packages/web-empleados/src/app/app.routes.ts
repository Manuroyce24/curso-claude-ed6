import { Routes } from '@angular/router';
import { LoginComponent } from '@resttek/web-shared';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard, roleGuard } from '@resttek/web-shared';
import { defaultRouteGuard } from './core/default-route.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@resttek/web-shared').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        canActivate: [defaultRouteGuard],
        children: []
      },
      {
        path: 'cocina',
        canActivate: [roleGuard],
        data: { roles: ['cocinero', 'manager'], forbiddenRedirect: '/' },
        loadComponent: () => import('./features/orders/pages/cocina/cocina.component').then(m => m.CocinaComponent),
      },
      {
        path: 'barra',
        canActivate: [roleGuard],
        data: { roles: ['camarero', 'manager'], forbiddenRedirect: '/' },
        loadComponent: () => import('./features/orders/pages/barra/barra.component').then(m => m.BarraComponent),
      },
      {
        path: 'salon',
        canActivate: [roleGuard],
        data: { roles: ['camarero', 'manager'], forbiddenRedirect: '/' },
        loadComponent: () => import('./features/orders/pages/salon/salon.component').then(m => m.SalonComponent),
      },
      {
        path: 'mesas',
        canActivate: [roleGuard],
        data: { roles: ['camarero', 'manager'], forbiddenRedirect: '/' },
        loadComponent: () => import('./features/tables/pages/mesas/mesas.component').then(m => m.MesasComponent),
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./core/layout/not-found.component').then(m => m.NotFoundComponent)
  }
];
