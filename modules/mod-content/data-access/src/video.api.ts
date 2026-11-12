import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import {
  AdminCollection,
  AdminVideo,
  LibraryFilters,
  LibraryPage,
  Playback,
  Progress,
  ProgressReq,
  SaveCollectionReq,
  SaveTagReq,
  SaveVideoReq,
  StudentCollection,
  UploadSession,
  VideoAccess,
  VideoDetail,
  VideoPreview,
  VideoStatus,
  VideoTag
} from './content.models';

type QueryParams = Record<string, string | number | boolean>;

/** Builds the query of GET /me/videos: empty filters are left out, page/size always sent. */
export function buildLibraryQuery(filters: LibraryFilters): QueryParams {
  const params: QueryParams = {};
  if (filters.level) params['level'] = filters.level;
  if (filters.tag) params['tag'] = filters.tag;
  if (filters.maxMinutes && filters.maxMinutes > 0) params['maxMinutes'] = filters.maxMinutes;
  const q = filters.q?.trim();
  if (q) params['q'] = q;
  if (filters.inProgress) params['inProgress'] = true;
  params['page'] = Math.max(0, filters.page ?? 0);
  params['size'] = filters.size ?? 24;
  return params;
}

/** Student side of the video library. */
@Injectable({ providedIn: 'root' })
export class VideoLibraryApi {
  private readonly api = inject(ApiClient);

  access(): Observable<VideoAccess> {
    return this.api.get<VideoAccess>('/me/video-access');
  }

  acceptWaiver(): Observable<VideoAccess> {
    return this.api.post<VideoAccess>('/me/video-waiver', {});
  }

  list(filters: LibraryFilters = {}): Observable<LibraryPage> {
    return this.api.get<LibraryPage>('/me/videos', buildLibraryQuery(filters));
  }

  detail(id: string): Observable<VideoDetail> {
    return this.api.get<VideoDetail>(`/me/videos/${id}`);
  }

  startPlayback(id: string, deviceKey: string): Observable<Playback> {
    return this.api.post<Playback>(`/me/videos/${id}/playback`, { deviceKey });
  }

  reportProgress(id: string, req: ProgressReq): Observable<Progress> {
    return this.api.put<Progress>(`/me/videos/${id}/progress`, req);
  }

  endSession(sessionId: string): Observable<void> {
    return this.api.post<void>(`/me/playback-sessions/${sessionId}/end`, {});
  }

  collections(): Observable<StudentCollection[]> {
    return this.api.get<StudentCollection[]>('/me/video-collections');
  }

  collection(id: string): Observable<StudentCollection> {
    return this.api.get<StudentCollection>(`/me/video-collections/${id}`);
  }

  tags(): Observable<VideoTag[]> {
    return this.api.get<VideoTag[]>('/video-tags');
  }
}

/** Content management: videos, uploads, tags and collections. */
@Injectable({ providedIn: 'root' })
export class VideoAdminApi {
  private readonly api = inject(ApiClient);

  list(status?: VideoStatus | null, q?: string | null): Observable<AdminVideo[]> {
    const params: QueryParams = {};
    if (status) params['status'] = status;
    if (q?.trim()) params['q'] = q.trim();
    return this.api.get<AdminVideo[]>('/videos', params);
  }

  get(id: string): Observable<AdminVideo> {
    return this.api.get<AdminVideo>(`/videos/${id}`);
  }

  create(req: SaveVideoReq): Observable<AdminVideo> {
    return this.api.post<AdminVideo>('/videos', req);
  }

  update(id: string, req: SaveVideoReq): Observable<AdminVideo> {
    return this.api.put<AdminVideo>(`/videos/${id}`, req);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/videos/${id}`);
  }

  uploadSession(id: string): Observable<UploadSession> {
    return this.api.post<UploadSession>(`/videos/${id}/upload-session`, {});
  }

  refresh(id: string): Observable<AdminVideo> {
    return this.api.post<AdminVideo>(`/videos/${id}/refresh`, {});
  }

  publish(id: string): Observable<AdminVideo> {
    return this.api.post<AdminVideo>(`/videos/${id}/publish`, {});
  }

  unpublish(id: string): Observable<AdminVideo> {
    return this.api.post<AdminVideo>(`/videos/${id}/unpublish`, {});
  }

  archive(id: string): Observable<AdminVideo> {
    return this.api.post<AdminVideo>(`/videos/${id}/archive`, {});
  }

  restore(id: string): Observable<AdminVideo> {
    return this.api.post<AdminVideo>(`/videos/${id}/restore`, {});
  }

  preview(id: string): Observable<VideoPreview> {
    return this.api.post<VideoPreview>(`/videos/${id}/preview`, {});
  }

  tags(): Observable<VideoTag[]> {
    return this.api.get<VideoTag[]>('/video-tags');
  }

  createTag(req: SaveTagReq): Observable<VideoTag> {
    return this.api.post<VideoTag>('/video-tags', req);
  }

  deleteTag(id: string): Observable<void> {
    return this.api.delete<void>(`/video-tags/${id}`);
  }

  collections(): Observable<AdminCollection[]> {
    return this.api.get<AdminCollection[]>('/video-collections');
  }

  createCollection(req: SaveCollectionReq): Observable<AdminCollection> {
    return this.api.post<AdminCollection>('/video-collections', req);
  }

  updateCollection(id: string, req: SaveCollectionReq): Observable<AdminCollection> {
    return this.api.put<AdminCollection>(`/video-collections/${id}`, req);
  }

  deleteCollection(id: string): Observable<void> {
    return this.api.delete<void>(`/video-collections/${id}`);
  }
}
