import { Routes } from '@angular/router';
import { roleGuard } from '@yoga/platform/auth';

export const appRoutes: Routes = [
  {
    path: '',
    loadChildren: () => import('@yoga/mod-landing/feature').then(m => m.LANDING_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('@yoga/mod-identity/feature').then(m => m.IDENTITY_ROUTES)
  },
  {
    path: 'branches',
    loadChildren: () => import('@yoga/mod-branch/feature').then(m => m.BRANCH_ROUTES)
  },
  {
    path: 'membership',
    loadChildren: () => import('@yoga/mod-membership/feature').then(m => m.MEMBERSHIP_ROUTES)
  },
  {
    path: 'schedule',
    loadChildren: () => import('@yoga/mod-schedule/feature').then(m => m.SCHEDULE_ROUTES)
  },
  {
    path: 'users',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'])],
    loadComponent: () => import('@yoga/mod-identity/feature').then(m => m.UserManagementComponent),
    title: 'Quản Lý Học Viên & Người Dùng - Yoga Center'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
