import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { VideoLevel } from './content.models';

/** Which AI features the backend has turned on (GET /ai/status). */
export interface AiStatus {
  videoTagging: boolean;
}

/** Gemini suggestion for a video; staff copy it into the form and save through the normal video API. */
export interface VideoTagSuggestion {
  id: string;
  videoId: string;
  tagIds: string[];
  tagCodes: string[];
  level: VideoLevel;
  description: string | null;
  contraindications: string | null;
  notForPregnancy: boolean;
  notForHeartBp: boolean;
  notForInjuries: boolean;
  model: string;
}

/** AI features of content management (mod-ai on the backend). */
@Injectable({ providedIn: 'root' })
export class VideoAiApi {
  private readonly api = inject(ApiClient);

  status(): Observable<AiStatus> {
    return this.api.get<AiStatus>('/ai/status');
  }

  /** Title/description are the unsaved values of the open form, so the suggestion matches what staff see. */
  suggestTags(videoId: string, title: string, description: string): Observable<VideoTagSuggestion> {
    return this.api.post<VideoTagSuggestion>(`/ai/videos/${videoId}/tag-suggestions`, { title, description });
  }

  review(suggestionId: string, status: 'APPLIED' | 'REJECTED'): Observable<void> {
    return this.api.post<void>(`/ai/tag-suggestions/${suggestionId}/review`, { status });
  }
}
