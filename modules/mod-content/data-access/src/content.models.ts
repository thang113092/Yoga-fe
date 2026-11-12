/** Video library (VOD) contracts; field names match the backend VideoDto records. */

export type VideoLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL_LEVELS';
export type VideoStatus = 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED' | 'ARCHIVED' | 'FAILED';

// ---- Student library ----

export interface VideoAccess {
  hasPass: boolean;
  passEndDate: string | null;
  waiverAccepted: boolean;
  waiverVersion: string | null;
  maxDevices: number;
}

export interface LibraryVideo {
  id: string;
  title: string;
  description: string | null;
  level: VideoLevel | null;
  durationSeconds: number | null;
  instructorName: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  isFreePreview: boolean;
  locked: boolean;
  positionSeconds: number;
  watchedSeconds: number;
  completed: boolean;
  publishedAt: string | null;
}

export interface LibraryPage {
  items: LibraryVideo[];
  page: number;
  size: number;
  total: number;
}

export interface VideoDetail {
  video: LibraryVideo;
  contraindications: string | null;
  warnings: string[];
  access: VideoAccess;
}

export interface PlaybackReq {
  deviceKey: string;
}

export interface Playback {
  sessionId: string;
  embedUrl: string;
  expiresAt: string;
  heartbeatSeconds: number;
  startAtSeconds: number;
  watermark: string | null;
  warnings: string[];
}

export interface ProgressReq {
  sessionId: string;
  positionSeconds: number;
  watchedSeconds: number;
}

export interface Progress {
  positionSeconds: number;
  watchedSeconds: number;
  completed: boolean;
  sessionExpiresAt: string | null;
}

export interface StudentCollection {
  id: string;
  title: string;
  description: string | null;
  level: VideoLevel | null;
  total: number;
  completed: number;
  items: LibraryVideo[];
}

/** Filters of the student library grid. */
export interface LibraryFilters {
  level?: string | null;
  tag?: string | null;
  maxMinutes?: number | null;
  q?: string | null;
  inProgress?: boolean;
  page?: number;
  size?: number;
}

// ---- Content management ----

export interface SaveVideoReq {
  title: string;
  description?: string | null;
  level?: VideoLevel | null;
  instructorId?: string | null;
  classTypeId?: string | null;
  isFreePreview?: boolean;
  notForPregnancy?: boolean;
  notForHeartBp?: boolean;
  notForInjuries?: boolean;
  contraindications?: string | null;
  tagIds?: string[];
}

export interface AdminVideo {
  id: string;
  title: string;
  description: string | null;
  level: VideoLevel | null;
  durationSeconds: number | null;
  instructorId: string | null;
  instructorName: string | null;
  classTypeId: string | null;
  status: VideoStatus;
  processingError: string | null;
  isFreePreview: boolean;
  notForPregnancy: boolean;
  notForHeartBp: boolean;
  notForInjuries: boolean;
  contraindications: string | null;
  thumbnailUrl: string | null;
  tagIds: string[];
  createdBy: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  viewers: number;
  canEdit: boolean;
}

export interface UploadSession {
  videoId: string;
  endpoint: string;
  libraryId: string;
  providerVideoId: string;
  signature: string;
  expiresEpochSeconds: number;
}

export interface VideoPreview {
  embedUrl: string;
  expiresAt: string;
}

export interface VideoTag {
  id: string;
  code: string;
  name: string;
  videoCount: number;
}

export interface SaveTagReq {
  code: string;
  name: string;
}

export interface CollectionItem {
  videoId: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  status: VideoStatus;
}

export interface AdminCollection {
  id: string;
  title: string;
  description: string | null;
  level: VideoLevel | null;
  isPublished: boolean;
  items: CollectionItem[];
  updatedAt: string | null;
}

export interface SaveCollectionReq {
  title: string;
  description?: string | null;
  level?: VideoLevel | null;
  isPublished?: boolean;
  videoIds: string[];
}
