import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';

export type NotificationType = 'MEMBERSHIP_EXPIRING' | 'MEMBERSHIP_EXPIRED' | 'SESSIONS_LOW' | 'COURSE_STARTING' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  /** App path to open when the notification is clicked, e.g. `/membership/plans`. */
  link: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationInbox {
  items: NotificationItem[];
  unread: number;
}

/** In-app notifications (header bell) of the signed-in user. */
@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private readonly api = inject(ApiClient);

  mine(limit = 20): Observable<NotificationInbox> {
    return this.api.get<NotificationInbox>('/me/notifications', { limit });
  }

  markRead(id: string): Observable<void> {
    return this.api.post<void>(`/me/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.api.post<void>('/me/notifications/read-all', {});
  }
}

/** "vừa xong", "25 phút trước", "3 giờ trước", "Hôm qua", "4 ngày trước", then dd/MM/yyyy. */
export function relativeTimeVi(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const minutes = Math.floor(Math.max(0, now - t) / 60_000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(t));
}
