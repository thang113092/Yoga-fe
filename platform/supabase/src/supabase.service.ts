import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './supabase-config.token';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly config = inject(SUPABASE_CONFIG, { optional: true });
  private clientInstance: SupabaseClient | null = null;

  get client(): SupabaseClient {
    if (!this.clientInstance) {
      if (!this.config?.url || !this.config?.publishableKey) {
        throw new Error('SupabaseConfig is not configured. Please provide SUPABASE_CONFIG in app.config.ts');
      }
      this.clientInstance = createClient(this.config.url, this.config.publishableKey);
    }
    return this.clientInstance;
  }
}
