import { Routes } from '@angular/router';

export const BRANCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./branch-list/branch-list.component').then(m => m.BranchListComponent)
  }
];
