import { ZenTone } from '@yoga/platform/ui';
import { VideoLevel, VideoStatus } from '@yoga/mod-content/data-access';

export const LEVEL_OPTIONS: { value: VideoLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Người mới' },
  { value: 'INTERMEDIATE', label: 'Trung cấp' },
  { value: 'ADVANCED', label: 'Nâng cao' },
  { value: 'ALL_LEVELS', label: 'Mọi cấp độ' }
];

export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 10, label: '≤ 10 phút' },
  { value: 20, label: '≤ 20 phút' },
  { value: 30, label: '≤ 30 phút' },
  { value: 45, label: '≤ 45 phút' }
];

export function levelLabel(level: string | null | undefined): string {
  return LEVEL_OPTIONS.find(o => o.value === level)?.label ?? '';
}

/** 75 → "01:15", 3725 → "1:02:05". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Watched share of the video, 0..100. */
export function progressPercent(position: number | null | undefined, duration: number | null | undefined): number {
  if (!duration || duration <= 0 || !position || position <= 0) return 0;
  return Math.min(100, Math.round((position / duration) * 100));
}

export const STATUS_OPTIONS: { value: VideoStatus; label: string; tone: ZenTone }[] = [
  { value: 'DRAFT', label: 'Nháp', tone: 'neutral' },
  { value: 'PROCESSING', label: 'Đang xử lý', tone: 'info' },
  { value: 'READY', label: 'Sẵn sàng', tone: 'primary' },
  { value: 'PUBLISHED', label: 'Đã xuất bản', tone: 'success' },
  { value: 'ARCHIVED', label: 'Đã ẩn', tone: 'neutral' },
  { value: 'FAILED', label: 'Lỗi', tone: 'danger' }
];

export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find(o => o.value === status)?.label ?? status;
}

export function statusTone(status: string): ZenTone {
  return STATUS_OPTIONS.find(o => o.value === status)?.tone ?? 'neutral';
}
