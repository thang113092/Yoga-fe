import { ApplicationConfig, inject, provideAppInitializer, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideToastr } from 'ngx-toastr';
import { appRoutes } from './app.routes';
import { SUPABASE_CONFIG } from '@yoga/platform/supabase';
import { environment } from '../environments/environment';
import { AuthService, authInterceptor } from '@yoga/platform/auth';
import { API_BASE_URL } from '@yoga/platform/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(AuthService).restoreSession()),
    provideExperimentalZonelessChangeDetection(),
    provideAnimationsAsync(),
    provideToastr({
      timeOut: 3500,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      closeButton: true,
      progressBar: true,
      newestOnTop: true,
      easeTime: 250
    }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    {
      provide: API_BASE_URL,
      useValue: environment.apiUrl
    },
    {
      provide: SUPABASE_CONFIG,
      useValue: environment.supabase
    }
  ]
};
