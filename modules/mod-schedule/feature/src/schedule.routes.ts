import { Routes } from '@angular/router';
import { roleGuard } from '@yoga/platform/auth';

export const SCHEDULE_ROUTES: Routes = [
  ...(['subjects', 'timetable'] as const).map(path => ({
    path, data: {trainingTab: path === 'subjects' ? 'class-types' : 'schedules'},
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'INSTRUCTOR'])],
    loadComponent: () => import('./class-management/class-management.component').then(m => m.ClassManagementComponent),
    title: path === 'subjects' ? 'Bộ môn - An Yên' : 'Lịch học - An Yên'
  })),
  {
    path: 'courses',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'INSTRUCTOR', 'STUDENT'])],
    loadComponent: () => import('./courses/courses.component').then(m => m.CoursesComponent),
    title: 'Khóa học - An Yên'
  },
  {
    path: '',
    redirectTo: 'calendar',
    pathMatch: 'full'
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./schedule-calendar/schedule-calendar.component').then(
        (m) => m.ScheduleCalendarComponent
      ),
    title: 'Lịch Tập Lớp Học - Yoga Center'
  },
  {
    path: 'check-in',
    canActivate: [roleGuard(['INSTRUCTOR'])],
    loadComponent: () =>
      import('./qr-scanner/qr-scanner.component').then(
        (m) => m.QrScannerComponent
      ),
    title: 'Điểm Danh - Yoga Center'
  },
  {
    path: 'manage',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'INSTRUCTOR'])],
    loadComponent: () =>
      import('./class-management/class-management.component').then(
        (m) => m.ClassManagementComponent
      ),
    title: 'Quản Lý Lớp & Ca Học - Yoga Center'
  }
];
