import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { SupabaseService } from '@yoga/platform/supabase';
import type { Session } from '@supabase/supabase-js';
import { Observable, defer, firstValueFrom, forkJoin } from 'rxjs';
import { CurrentUser, LoginReq, RegisterReq, UserToken } from './auth.models';
@Injectable({ providedIn: 'root' })
export class AuthService {
 private readonly api=inject(ApiClient); private readonly supabase=inject(SupabaseService);
 private readonly session=signal<Session|null>(null);
 readonly profile=signal<CurrentUser|null>(null); readonly branchIds=signal<string[]>([]);
 readonly sessionError=signal<string|null>(null);
 private version=0; private initialized=false;
 private profileRequest?: { id:string; promise:Promise<void> };
 readonly currentUser=computed<UserToken|null>(()=>{const s=this.session(),p=this.profile();return s&&p ? {accessToken:s.access_token,tokenType:'Bearer',expiresIn:s.expires_in,userId:p.id,fullName:p.fullName,roleCode:p.roleCode,homeBranchId:p.homeBranchId}:null;});
 readonly isAuthenticated=computed(()=>!!this.currentUser());
 readonly userRole=computed(()=>this.profile()?.roleCode.toUpperCase()??null);
 readonly currentUserId=computed(()=>this.profile()?.id??null);
 readonly userHomeBranchId=computed(()=>this.profile()?.homeBranchId??null);
 readonly userFullName=computed(()=>this.profile()?.fullName??'Người dùng');
 readonly isSuperAdmin=computed(()=>this.userRole()==='SUPER_ADMIN'); readonly isBranchManager=computed(()=>this.userRole()==='BRANCH_MANAGER');
 readonly isReceptionist=computed(()=>this.userRole()==='RECEPTIONIST'); readonly isInstructor=computed(()=>this.userRole()==='INSTRUCTOR'); readonly isStudent=computed(()=>this.userRole()==='STUDENT');
 readonly canManageUsers=computed(()=>this.isSuperAdmin()||this.isBranchManager()); readonly canAccessPos=computed(()=>this.canManageUsers()||this.isReceptionist());
 readonly canAccessCheckIn=computed(()=>this.isInstructor()); readonly canAccessStudentPortal=computed(()=>this.isStudent());
 readonly canManageClasses=computed(()=>this.isSuperAdmin()||this.isBranchManager()||this.isReceptionist()||this.isInstructor());
 login(req:LoginReq):Observable<UserToken>{return defer(async()=>{const {data,error}=await this.supabase.client.auth.signInWithPassword({email:req.email.trim(),password:req.password});if(error)throw error;this.acceptSession(data.session);await this.loadProfile();const user=this.currentUser();if(!user)throw new Error(this.sessionError()??'Không tải được hồ sơ tài khoản.');return user;});}
 register(req:RegisterReq):Observable<{confirmationRequired:boolean}>{return defer(async()=>{const {data,error}=await this.supabase.client.auth.signUp({email:req.email.trim(),password:req.password,options:{emailRedirectTo:location.origin+'/auth/login',data:{full_name:req.fullName.trim(),phone:req.phone.trim(),gender:req.gender,dob:req.dob}}});if(error)throw error;if(data.session){this.acceptSession(data.session);await this.loadProfile();if(!this.isAuthenticated())throw new Error(this.sessionError()??'Không tải được hồ sơ.');}return {confirmationRequired:!data.session};});}
 async requestPasswordReset(email:string):Promise<void>{const {error}=await this.supabase.client.auth.resetPasswordForEmail(email.trim(),{redirectTo:location.origin+'/auth/reset-password'});if(error)throw error;}
 async updatePassword(password:string):Promise<void>{const {data,error:sessionError}=await this.supabase.client.auth.getSession();if(sessionError||!data.session)throw new Error('Mở liên kết khôi phục từ email trước khi đổi mật khẩu.');const {error}=await this.supabase.client.auth.updateUser({password});if(error)throw error;this.logout();}
 async resendConfirmation(email:string):Promise<void>{const {error}=await this.supabase.client.auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:location.origin+'/auth/login'}});if(error)throw error;}
 fetchMe():Observable<CurrentUser>{return this.api.get<CurrentUser>('/auth/me');}
 async restoreSession():Promise<void>{
  try {
   try {localStorage.removeItem('yoga_token');} catch { /* previous local JWT is no longer used */ }
   if(!this.initialized){this.initialized=true;this.supabase.client.auth.onAuthStateChange((_event,session)=>{this.acceptSession(session);if(!session){this.clearProfile();return;}setTimeout(()=>{void this.loadProfile();},0);});}
   const {data,error}=await this.supabase.client.auth.getSession();if(error)throw error;this.acceptSession(data.session);if(data.session)await this.loadProfile();else this.clearProfile();
  }catch(err){this.sessionError.set(err instanceof Error?err.message:'Không tải được phiên Supabase.');this.clearProfile();}
 }
 private loadProfile():Promise<void>{
  const id=this.session()?.user.id;if(!id){this.clearProfile();return Promise.resolve();}
  if(this.profileRequest?.id===id)return this.profileRequest.promise;
  const promise=this.performLoadProfile().finally(()=>{if(this.profileRequest?.promise===promise)this.profileRequest=undefined;});
  this.profileRequest={id,promise};return promise;
 }
 private acceptSession(session:Session|null):void{if(this.session()?.user.id!==session?.user.id)this.clearProfile();this.session.set(session);}
 private async performLoadProfile():Promise<void>{
  const version=++this.version;const expected=this.session()?.user.id;if(!expected){this.clearProfile();return;}
  try{const [me,ids]=await firstValueFrom(forkJoin([this.fetchMe(),this.api.get<string[]>('/auth/branches')]));if(version!==this.version||this.session()?.user.id!==expected)return;if(!me.isActive)throw new Error('Tài khoản đã bị khóa.');this.profile.set(me);this.branchIds.set(ids);this.sessionError.set(null);}
  catch(err:any){if(version!==this.version)return;this.profile.set(null);this.branchIds.set([]);this.sessionError.set(err?.error?.message||err?.message||'Không tải được hồ sơ tài khoản.');}
 }
 logout():void{this.session.set(null);this.clearProfile();void this.supabase.client.auth.signOut({scope:'local'}).catch(()=>{});}
 private clearProfile():void{++this.version;this.profile.set(null);this.branchIds.set([]);}
 async getAccessToken():Promise<string|null>{const {data,error}=await this.supabase.client.auth.getSession();if(error)return null;this.acceptSession(data.session);return data.session?.access_token??null;}
}
