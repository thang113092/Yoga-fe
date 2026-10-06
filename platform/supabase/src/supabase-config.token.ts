import { InjectionToken } from '@angular/core';

export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG');
