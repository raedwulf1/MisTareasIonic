import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';

import { FeatureFlagsService } from './application/feature-flags.service';

/** Bloquea la gestión de categorías cuando el feature flag está apagado. */
const categoriesEnabledGuard = () =>
  inject(FeatureFlagsService).categoriesEnabled() || inject(Router).parseUrl('/tasks');

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tasks' },
  {
    path: 'tasks',
    loadComponent: () => import('./pages/tasks/tasks.page').then((m) => m.TasksPage),
  },
  {
    path: 'categories',
    canMatch: [categoriesEnabledGuard],
    loadComponent: () => import('./pages/categories/categories.page').then((m) => m.CategoriesPage),
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  { path: '**', redirectTo: 'tasks' },
];
