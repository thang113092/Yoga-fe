import { Routes } from '@angular/router';
import { roleGuard } from '@yoga/platform/auth';

export const MEMBERSHIP_ROUTES: Routes = [
  {
    path: 'orders',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER'])],
    loadComponent: () => import('./order-list/order-list.component').then(m => m.OrderListComponent),
    title: 'Danh Sách Đơn Hàng - An Yên Yoga'
  },
  {
    path: '',
    redirectTo: 'pos',
    pathMatch: 'full'
  },
  {
    path: 'pos',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST'])],
    loadComponent: () => import('./pos-checkout/pos-checkout.component').then(m => m.PosCheckoutComponent),
    title: 'POS Bán Thẻ - Yoga Center'
  },
  {
    path: 'plans',
    loadComponent: () => import('./plan-management/plan-management.component').then(m => m.PlanManagementComponent),
    title: 'Gói Thẻ Tập & Bảng Giá - An Yên Yoga'
  },
  {
    path: 'my-passes',
    canActivate: [roleGuard(['STUDENT'])],
    loadComponent: () => import('./student-passes/student-passes.component').then(m => m.StudentPassesComponent),
    title: 'Thẻ Hội Viên & Lịch Sử Tập - An Yên Yoga'
  },
  {
    path: 'history',
    canActivate: [roleGuard(['STUDENT'])],
    loadComponent: () => import('./workout-history/workout-history.component').then(m => m.WorkoutHistoryComponent),
    title: 'Lịch Sử Tập Luyện - An Yên Yoga'
  },
  {
    path: 'revenue',
    canActivate: [roleGuard(['SUPER_ADMIN', 'BRANCH_MANAGER'])],
    loadComponent: () => import('./revenue-report/revenue-report.component').then(m => m.RevenueReportComponent),
    title: 'Báo Cáo Doanh Thu - An Yên Yoga'
  }
];
