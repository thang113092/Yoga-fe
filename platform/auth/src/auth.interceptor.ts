import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, from, switchMap } from 'rxjs';
import { Router } from '@angular/router';
import { API_BASE_URL } from '@yoga/platform/api';
import { AuthService } from './auth.service';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService); const router = inject(Router); const base = inject(API_BASE_URL);
  const target = new URL(req.url, location.origin); const api = new URL(base, location.origin);
  const ownApi = target.origin === api.origin && (target.pathname === api.pathname || target.pathname.startsWith(api.pathname + '/'));
  return from(ownApi ? auth.getAccessToken() : Promise.resolve(null)).pipe(switchMap(token => next(token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req)), catchError(err => {
    if (ownApi && err.status === 401 && !req.url.endsWith('/auth/login')) {
      auth.sessionError.set(err.error?.code === 'AUTH_401'
        ? 'Backend đang chạy bản xác thực cũ. Hãy khởi động lại backend với bản hỗ trợ Supabase rồi đăng nhập lại.'
        : err.error?.message || 'Backend không xác minh được phiên Supabase. Vui lòng đăng nhập lại.');
      auth.logout(); void router.navigate(['/auth/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => err);
  }));
};
