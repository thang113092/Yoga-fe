import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthService, roleGuard } from '@yoga/platform/auth';

const STAFF = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR'];
const MANAGERS = ['SUPER_ADMIN', 'BRANCH_MANAGER'];

/**
 * Student pages. Content staff who open a student link (/videos, a video, a path) land on the management page
 * instead of being bounced to the home page, which looked like the link did nothing.
 */
const studentPage: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const role = auth.userRole();
  if (auth.isAuthenticated() && role && STAFF.includes(role)) {
    return inject(Router).createUrlTree(['/videos/manage']);
  }
  return roleGuard(['STUDENT'])(route, state);
};

export const CONTENT_ROUTES: Routes = [
  {
    path: 'manage/collections',
    canActivate: [roleGuard(MANAGERS)],
    loadComponent: () => import('./manage/video-collections-manage.component').then(m => m.VideoCollectionsManageComponent),
    title: 'Lộ trình video - An Yên'
  },
  {
    path: 'manage',
    canActivate: [roleGuard(STAFF)],
    loadComponent: () => import('./manage/video-manage.component').then(m => m.VideoManageComponent),
    title: 'Quản lý video - An Yên'
  },
  {
    path: 'collections/:id',
    canActivate: [studentPage],
    loadComponent: () => import('./collection/video-collection.component').then(m => m.VideoCollectionComponent),
    title: 'Lộ trình - An Yên'
  },
  {
    path: ':id',
    canActivate: [studentPage],
    loadComponent: () => import('./player/video-player.component').then(m => m.VideoPlayerComponent),
    title: 'Xem video - An Yên'
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [studentPage],
    loadComponent: () => import('./library/video-library.component').then(m => m.VideoLibraryComponent),
    title: 'Thư viện video - An Yên'
  }
];
