import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CreateUserReq, UserResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly api = inject(ApiClient);

  lookupStudent(phone: string, branchId: string): Observable<UserResponse> {
    return this.api.get<UserResponse>('/users/students/lookup', { phone, branchId });
  }

  createUser(req: CreateUserReq): Observable<UserResponse> {
    return this.api.post<UserResponse>('/users', req);
  }

  getUsers(branchId?: string, roleCode?: string): Observable<UserResponse[]> {
    const params: Record<string, string> = {};
    if (branchId) params['branchId'] = branchId;
    if (roleCode) params['roleCode'] = roleCode;
    return this.api.get<UserResponse[]>('/users', params);
  }

  updateUserStatus(userId: string, isActive: boolean): Observable<UserResponse> {
    return this.api.patch<UserResponse>(`/users/${userId}/status`, { isActive });
  }
}
