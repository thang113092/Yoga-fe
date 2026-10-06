import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import {
  Branch,
  CreateBranchReq,
  CreateRoomReq,
  Room,
  UpdateBranchReq,
  UpdateRoomReq
} from './branch.model';

@Injectable({ providedIn: 'root' })
export class BranchApi {
  private readonly client = inject(ApiClient);

  getAll(): Observable<Branch[]> {
    return this.client.get<Branch[]>('/branches');
  }

  getById(id: string): Observable<Branch> {
    return this.client.get<Branch>(`/branches/${id}`);
  }

  create(req: CreateBranchReq): Observable<Branch> {
    return this.client.post<Branch, CreateBranchReq>('/branches', req);
  }

  update(id: string, req: UpdateBranchReq): Observable<Branch> {
    return this.client.put<Branch, UpdateBranchReq>(`/branches/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.client.delete<void>(`/branches/${id}`);
  }

  getRooms(branchId: string, all: boolean = true): Observable<Room[]> {
    return this.client.get<Room[]>(`/branches/${branchId}/rooms`, { all });
  }

  createRoom(branchId: string, req: CreateRoomReq): Observable<Room> {
    return this.client.post<Room, CreateRoomReq>(`/branches/${branchId}/rooms`, req);
  }

  updateRoom(roomId: string, req: UpdateRoomReq): Observable<Room> {
    return this.client.put<Room, UpdateRoomReq>(`/branches/rooms/${roomId}`, req);
  }

  deleteRoom(roomId: string): Observable<void> {
    return this.client.delete<void>(`/branches/rooms/${roomId}`);
  }
}
