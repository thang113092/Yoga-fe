import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CreateUserReq, UserResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly api = inject(ApiClient);

  lookupStudent(phone: string, branchId: string): Observable<UserResponse>;
  lookupStudent(params: { phone?: string; email?: string; branchId: string }): Observable<UserResponse>;
  lookupStudent(
    arg: string | { phone?: string; email?: string; branchId: string },
    branchId?: string
  ): Observable<UserResponse> {
    if (typeof arg === 'string') {
      return this.api.get<UserResponse>('/users/students/lookup', { phone: arg, branchId: branchId! });
    }
    const params: Record<string, string> = { branchId: arg.branchId };
    if (arg.phone) params['phone'] = arg.phone;
    if (arg.email) params['email'] = arg.email;
    return this.api.get<UserResponse>('/users/students/lookup', params);
  }

  searchStudents(query: string, branchId: string, limit = 10): Observable<UserResponse[]> {
    return this.api.get<UserResponse[]>('/users/students/search', { query, branchId, limit });
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
