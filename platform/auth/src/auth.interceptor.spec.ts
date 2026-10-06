import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { firstValueFrom, throwError } from 'rxjs';
import { expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

it('retains a useful explanation when a legacy backend rejects the Supabase session', async () => {
  const auth = { getAccessToken: vi.fn().mockResolvedValue('test-token'), sessionError: signal<string | null>(null), logout: vi.fn() };
  TestBed.configureTestingModule({ providers: [provideExperimentalZonelessChangeDetection(),
    { provide: AuthService, useValue: auth },
    { provide: Router, useValue: { url: '/auth/login', navigate: vi.fn() } }
  ] });
  const error = new HttpErrorResponse({ status: 401, error: { code: 'AUTH_401', message: 'Old credentials rejected' } });
  const result = TestBed.runInInjectionContext(() => authInterceptor(
    new HttpRequest('GET', '/api/v1/auth/me'), () => throwError(() => error)
  ));
  await expect(firstValueFrom(result)).rejects.toBe(error);
  expect(auth.logout).toHaveBeenCalledOnce();
  expect(auth.sessionError()).toContain('Backend đang chạy bản xác thực cũ');
});

