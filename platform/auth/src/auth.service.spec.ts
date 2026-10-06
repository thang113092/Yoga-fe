import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ApiClient } from '@yoga/platform/api';
import { SupabaseService } from '@yoga/platform/supabase';
import { AuthService } from './auth.service';
import { firstValueFrom, of } from 'rxjs';
import { beforeEach, it, expect, vi } from 'vitest';
const session={access_token:'supabase-token',expires_in:3600,user:{id:'supabase-id'}};
const profile={id:'business-id',fullName:'Student',roleCode:'STUDENT',isActive:true};
let sdk:any;let api:any;let service:AuthService;
beforeEach(()=>{sdk={signInWithPassword:vi.fn().mockResolvedValue({data:{session},error:null}),signUp:vi.fn(),updateUser:vi.fn().mockResolvedValue({error:null}),getSession:vi.fn().mockResolvedValue({data:{session},error:null}),signOut:vi.fn().mockResolvedValue({error:null}),onAuthStateChange:vi.fn()};api={get:vi.fn((path:string)=>of(path==='/auth/me'?profile:['branch-id'])),post:vi.fn()};TestBed.configureTestingModule({providers:[provideExperimentalZonelessChangeDetection(),{provide:ApiClient,useValue:api},{provide:SupabaseService,useValue:{client:{auth:sdk}}}]});service=TestBed.inject(AuthService);});
it('logs in through Supabase and retains the business user ID',async()=>{const user=await firstValueFrom(service.login({email:'student@example.com',password:'private-pass'}));expect(sdk.signInWithPassword).toHaveBeenCalledWith({email:'student@example.com',password:'private-pass'});expect(api.post).not.toHaveBeenCalled();expect(user.userId).toBe('business-id');expect(user.accessToken).toBe('supabase-token');});
it('reports confirmation required instead of inventing a session',async()=>{sdk.signUp.mockResolvedValue({data:{session:null},error:null});expect(await firstValueFrom(service.register({email:'student@example.com',password:'private-pass',phone:'0909111222',fullName:'Student'}))).toEqual({confirmationRequired:true});expect(service.isAuthenticated()).toBe(false);expect(api.get).not.toHaveBeenCalled();});
it('gets refreshed tokens from the Supabase SDK',async()=>{sdk.getSession.mockResolvedValue({data:{session:{...session,access_token:'refreshed-token'}},error:null});expect(await service.getAccessToken()).toBe('refreshed-token');});
it('clears business permissions when signing out',async()=>{await firstValueFrom(service.login({email:'student@example.com',password:'private-pass'}));service.logout();expect(service.currentUserId()).toBeNull();expect(service.branchIds()).toEqual([]);expect(sdk.signOut).toHaveBeenCalled();});

it('updates a recovered password through Supabase and signs out',async()=>{await service.updatePassword('new-private-password');expect(sdk.updateUser).toHaveBeenCalledWith({password:'new-private-password'});expect(sdk.signOut).toHaveBeenCalled();});
it('does not update a password without a Supabase session',async()=>{sdk.getSession.mockResolvedValue({data:{session:null},error:null});await expect(service.updatePassword('new-private-password')).rejects.toThrow();expect(sdk.updateUser).not.toHaveBeenCalled();});
