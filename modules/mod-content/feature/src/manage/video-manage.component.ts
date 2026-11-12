import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { InstructorItem, ScheduleApi } from '@yoga/mod-schedule/data-access';
import {
  AdminVideo,
  SaveVideoReq,
  UploadSession,
  VideoAdminApi,
  videoErrorMessage,
  VideoLevel,
  VideoStatus,
  VideoTag
} from '@yoga/mod-content/data-access';
import { formatDuration, LEVEL_OPTIONS, levelLabel, STATUS_OPTIONS, statusLabel, statusTone } from '../shared/video-format';
import { TUS_LOADER, TusUpload, TusUploadFactory } from '../shared/video-loaders';

export interface VideoForm {
  title: string;
  description: string;
  level: VideoLevel | '';
  instructorId: string;
  isFreePreview: boolean;
  notForPregnancy: boolean;
  notForHeartBp: boolean;
  notForInjuries: boolean;
  contraindications: string;
  tagIds: string[];
}

export interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'processing' | 'error';
  percent: number;
  message?: string;
}

export type VideoAction = 'edit' | 'upload' | 'refresh' | 'publish' | 'unpublish' | 'archive' | 'restore' | 'delete' | 'preview';

export const TUS_RETRY_DELAYS = [0, 3000, 5000, 10000, 20000];
const POLL_EVERY_MS = 10_000;
const POLL_MAX_TRIES = 18;

const EMPTY_FORM: VideoForm = {
  title: '', description: '', level: '', instructorId: '', isFreePreview: false,
  notForPregnancy: false, notForHeartBp: false, notForInjuries: false, contraindications: '', tagIds: []
};

/** Content management: video list, metadata, direct upload to Bunny (tus), publishing and tags. */
@Component({
  selector: 'yoga-video-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ...ZEN_UI],
  templateUrl: './video-manage.component.html',
  styleUrls: ['./video-manage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoManageComponent implements OnInit, OnDestroy {
  private readonly api = inject(VideoAdminApi);
  private readonly scheduleApi = inject(ScheduleApi);
  private readonly toast = inject(ZenToastService);
  private readonly confirm = inject(ZenConfirmService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly loadTus = inject(TUS_LOADER);
  protected readonly auth = inject(AuthService);

  readonly videos = signal<AdminVideo[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly statusFilter = signal<VideoStatus | ''>('');
  readonly q = signal('');
  readonly busyId = signal<string | null>(null);

  readonly tags = signal<VideoTag[]>([]);
  readonly instructors = signal<InstructorItem[]>([]);

  readonly formOpen = signal(false);
  readonly editing = signal<AdminVideo | null>(null);
  readonly form = signal<VideoForm>({ ...EMPTY_FORM });
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly uploads = signal<Record<string, UploadProgress>>({});

  readonly previewUrl = signal<SafeResourceUrl | null>(null);
  readonly previewTitle = signal('');

  readonly tagsOpen = signal(false);
  readonly newTagCode = signal('');
  readonly newTagName = signal('');
  readonly tagError = signal<string | null>(null);
  readonly savingTag = signal(false);

  readonly canManage = computed(() => this.auth.isSuperAdmin() || this.auth.isBranchManager());
  readonly statusOptions = [{ value: '', label: 'Mọi trạng thái' }, ...STATUS_OPTIONS.map(o => ({ value: o.value, label: o.label }))];
  readonly levelOptions = [{ value: '', label: 'Chưa chọn' }, ...LEVEL_OPTIONS];
  readonly instructorOptions = computed(() => [
    { value: '', label: 'Chưa gán huấn luyện viên' },
    ...this.instructors().map(i => ({ value: i.id, label: i.fullName, sublabel: i.phone }))
  ]);
  readonly tagNames = computed(() => new Map(this.tags().map(t => [t.id, t.name])));
  readonly stats = computed(() => {
    const list = this.videos();
    return {
      total: list.length,
      published: list.filter(v => v.status === 'PUBLISHED').length,
      processing: list.filter(v => v.status === 'PROCESSING').length,
      failed: list.filter(v => v.status === 'FAILED').length
    };
  });

  readonly statusLabel = statusLabel;
  readonly statusTone = statusTone;
  readonly levelLabel = levelLabel;
  readonly formatDuration = formatDuration;

  private readonly activeUploads = new Map<string, TusUpload>();
  private readonly pollTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private destroyed = false;

  ngOnInit(): void {
    this.load();
    this.loadTags();
    if (this.canManage()) {
      this.scheduleApi.getInstructors().subscribe({ next: list => this.instructors.set(list ?? []), error: () => this.instructors.set([]) });
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.pollTimers.forEach(t => clearTimeout(t));
    this.pollTimers.clear();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.statusFilter() || null, this.q()).subscribe({
      next: list => { this.videos.set(list ?? []); this.loading.set(false); },
      error: err => {
        this.videos.set([]);
        this.loading.set(false);
        this.error.set(videoErrorMessage(err, 'Không tải được danh sách video.'));
      }
    });
  }

  loadTags(): void {
    this.api.tags().subscribe({ next: list => this.tags.set(list ?? []), error: () => this.tags.set([]) });
  }

  setStatus(value: VideoStatus | ''): void { this.statusFilter.set(value ?? ''); this.load(); }
  search(value: string): void { this.q.set(value ?? ''); this.load(); }

  /** Which actions a row offers, from its status and the user's role. The backend re-checks every one. */
  actions(v: AdminVideo): Set<VideoAction> {
    const manager = this.canManage();
    const s = v.status;
    const out = new Set<VideoAction>();
    if (v.canEdit && s !== 'ARCHIVED') out.add('edit');
    if (v.canEdit && (s === 'DRAFT' || s === 'FAILED' || s === 'PROCESSING')) out.add('upload');
    if ((manager || v.canEdit) && (s === 'PROCESSING' || s === 'FAILED')) out.add('refresh');
    if ((manager || v.canEdit) && v.durationSeconds !== null && v.durationSeconds !== undefined && s !== 'DRAFT' && s !== 'PROCESSING') out.add('preview');
    if (manager && s === 'READY') out.add('publish');
    if (manager && s === 'PUBLISHED') out.add('unpublish');
    if (manager && s !== 'ARCHIVED' && s !== 'PROCESSING') out.add('archive');
    if (manager && s === 'ARCHIVED') out.add('restore');
    if (v.canEdit && (s === 'DRAFT' || s === 'FAILED') && !v.viewers) out.add('delete');
    return out;
  }

  // ---- create / edit ----

  openCreate(): void {
    this.editing.set(null);
    this.form.set({ ...EMPTY_FORM, tagIds: [] });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEdit(v: AdminVideo): void {
    this.editing.set(v);
    this.form.set({
      title: v.title ?? '',
      description: v.description ?? '',
      level: v.level ?? '',
      instructorId: v.instructorId ?? '',
      isFreePreview: !!v.isFreePreview,
      notForPregnancy: !!v.notForPregnancy,
      notForHeartBp: !!v.notForHeartBp,
      notForInjuries: !!v.notForInjuries,
      contraindications: v.contraindications ?? '',
      tagIds: [...(v.tagIds ?? [])]
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  patchForm(patch: Partial<VideoForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  toggleTag(id: string): void {
    this.form.update(f => ({ ...f, tagIds: f.tagIds.includes(id) ? f.tagIds.filter(t => t !== id) : [...f.tagIds, id] }));
  }

  buildRequest(f: VideoForm): SaveVideoReq {
    const editing = this.editing();
    const req: SaveVideoReq = {
      title: f.title.trim(),
      description: f.description.trim() || null,
      level: f.level || null,
      classTypeId: editing?.classTypeId ?? null,
      notForPregnancy: f.notForPregnancy,
      notForHeartBp: f.notForHeartBp,
      notForInjuries: f.notForInjuries,
      contraindications: f.contraindications.trim() || null,
      tagIds: f.tagIds
    };
    if (this.canManage()) {
      req.instructorId = f.instructorId || null;
      req.isFreePreview = f.isFreePreview;
    }
    return req;
  }

  submit(): void {
    const f = this.form();
    if (this.saving()) return;
    if (!f.title.trim()) {
      this.formError.set('Vui lòng nhập tiêu đề video.');
      return;
    }
    if (f.title.trim().length > 200) {
      this.formError.set('Tiêu đề tối đa 200 ký tự.');
      return;
    }
    const editing = this.editing();
    const req = this.buildRequest(f);
    this.saving.set(true);
    this.formError.set(null);
    const call$ = editing ? this.api.update(editing.id, req) : this.api.create(req);
    call$.subscribe({
      next: saved => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.upsert(saved);
        this.toast.success(editing ? 'Đã cập nhật video.' : 'Đã tạo video nháp. Hãy tải file video lên.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(videoErrorMessage(err, 'Không lưu được video.'));
      }
    });
  }

  // ---- upload ----

  onFileSelected(v: AdminVideo, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.upload(v, file);
  }

  /** Gets tus credentials from our API, then uploads the file straight to Bunny. */
  async upload(v: AdminVideo, file: File): Promise<void> {
    if (!file.type.startsWith('video/')) {
      this.toast.error('Vui lòng chọn một file video.');
      return;
    }
    if (this.activeUploads.has(v.id)) return;
    this.setUpload(v.id, { phase: 'preparing', percent: 0 });
    let session: UploadSession;
    try {
      session = await firstValueFrom(this.api.uploadSession(v.id));
    } catch (err) {
      this.setUpload(v.id, { phase: 'error', percent: 0, message: videoErrorMessage(err, 'Không lấy được thông tin tải lên.') });
      return;
    }
    let factory: TusUploadFactory;
    try {
      factory = await this.loadTus();
    } catch {
      this.setUpload(v.id, { phase: 'error', percent: 0, message: 'Không tải được thư viện tải lên. Vui lòng thử lại.' });
      return;
    }
    const upload = factory(file, {
      endpoint: session.endpoint,
      retryDelays: TUS_RETRY_DELAYS,
      headers: {
        AuthorizationSignature: session.signature,
        AuthorizationExpire: String(session.expiresEpochSeconds),
        VideoId: session.providerVideoId,
        LibraryId: session.libraryId
      },
      metadata: { filetype: file.type, title: v.title },
      onProgress: (sent, total) => this.setUpload(v.id, { phase: 'uploading', percent: total > 0 ? Math.floor((sent / total) * 100) : 0 }),
      onError: error => {
        this.activeUploads.delete(v.id);
        this.setUpload(v.id, { phase: 'error', percent: 0, message: 'Tải lên thất bại: ' + (error?.message || 'lỗi mạng') });
        this.toast.error('Tải file video lên thất bại. Bạn có thể chọn lại file để thử tiếp.');
      },
      onSuccess: () => {
        this.activeUploads.delete(v.id);
        this.setUpload(v.id, { phase: 'processing', percent: 100 });
        this.toast.success('Đã tải lên. Video đang được chuyển mã, thường mất vài phút.');
        this.poll(v.id, 0);
      }
    });
    this.activeUploads.set(v.id, upload);
    this.setUpload(v.id, { phase: 'uploading', percent: 0 });
    upload.start();
  }

  cancelUpload(id: string): void {
    const upload = this.activeUploads.get(id);
    this.activeUploads.delete(id);
    void upload?.abort();
    this.clearUpload(id);
  }

  /** Asks the backend to sync the transcoding state, then again every 10 s while still processing. */
  private poll(id: string, attempt: number): void {
    if (this.destroyed) return;
    this.api.refresh(id).subscribe({
      next: v => {
        this.upsert(v);
        if (v.status === 'PROCESSING' && attempt + 1 < POLL_MAX_TRIES) {
          this.schedulePoll(id, attempt + 1);
          return;
        }
        this.pollTimers.delete(id);
        this.clearUpload(id);
        if (v.status === 'READY') this.toast.success(`“${v.title}” đã sẵn sàng để xuất bản.`);
        else if (v.status === 'FAILED') this.toast.error(v.processingError || 'Chuyển mã video thất bại.');
      },
      error: () => {
        if (attempt + 1 < POLL_MAX_TRIES) this.schedulePoll(id, attempt + 1);
        else this.clearUpload(id);
      }
    });
  }

  private schedulePoll(id: string, attempt: number): void {
    if (this.destroyed) return;
    const timer = setTimeout(() => this.poll(id, attempt), POLL_EVERY_MS);
    this.pollTimers.set(id, timer);
  }

  private setUpload(id: string, progress: UploadProgress): void {
    this.uploads.update(all => ({ ...all, [id]: progress }));
  }

  private clearUpload(id: string): void {
    this.uploads.update(all => {
      const next = { ...all };
      delete next[id];
      return next;
    });
  }

  // ---- status actions ----

  refresh(v: AdminVideo): void {
    this.run(v, this.api.refresh(v.id), next => {
      this.toast.info(`Trạng thái: ${statusLabel(next.status)}.`);
    });
  }

  publish(v: AdminVideo): void {
    this.run(v, this.api.publish(v.id), () => this.toast.success('Đã xuất bản video cho học viên.'));
  }

  async unpublish(v: AdminVideo): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Ngừng xuất bản',
      message: 'Học viên sẽ không thấy video này trong thư viện nữa.',
      itemName: v.title,
      confirmText: 'Ngừng xuất bản',
      type: 'warning'
    });
    if (ok) this.run(v, this.api.unpublish(v.id), () => this.toast.success('Đã ngừng xuất bản video.'));
  }

  async archive(v: AdminVideo): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Ẩn video',
      message: 'Video được lưu trữ, không hiện trong thư viện và không thêm được vào lộ trình. Tiến độ xem của học viên vẫn được giữ.',
      itemName: v.title,
      confirmText: 'Ẩn video',
      type: 'warning'
    });
    if (ok) this.run(v, this.api.archive(v.id), () => this.toast.success('Đã ẩn video.'));
  }

  restore(v: AdminVideo): void {
    this.run(v, this.api.restore(v.id), () => this.toast.success('Đã khôi phục video.'));
  }

  async remove(v: AdminVideo): Promise<void> {
    const ok = await this.confirm.confirmDelete({
      title: 'Xóa video',
      itemName: v.title,
      details: 'File trên máy chủ video cũng bị xóa. Không thể hoàn tác.'
    });
    if (!ok) return;
    this.busyId.set(v.id);
    this.api.delete(v.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.videos.update(list => list.filter(x => x.id !== v.id));
        this.toast.success('Đã xóa video.');
      },
      error: err => {
        this.busyId.set(null);
        this.toast.error(videoErrorMessage(err, 'Không xóa được video.'));
      }
    });
  }

  preview(v: AdminVideo): void {
    this.busyId.set(v.id);
    this.api.preview(v.id).subscribe({
      next: p => {
        this.busyId.set(null);
        const url = this.trustEmbedUrl(p.embedUrl);
        if (!url) {
          this.toast.error('Địa chỉ xem thử không hợp lệ.');
          return;
        }
        this.previewTitle.set(v.title);
        this.previewUrl.set(url);
      },
      error: err => {
        this.busyId.set(null);
        this.toast.error(videoErrorMessage(err, 'Không mở được bản xem thử.'));
      }
    });
  }

  closePreview(): void {
    this.previewUrl.set(null);
  }

  // ---- tags ----

  createTag(): void {
    const code = this.newTagCode().trim().toUpperCase();
    const name = this.newTagName().trim();
    if (!/^[A-Z0-9_]{1,50}$/.test(code)) {
      this.tagError.set('Mã chủ đề chỉ gồm chữ không dấu A-Z, số và dấu gạch dưới (tối đa 50 ký tự).');
      return;
    }
    if (!name || name.length > 100) {
      this.tagError.set('Vui lòng nhập tên chủ đề (tối đa 100 ký tự).');
      return;
    }
    this.savingTag.set(true);
    this.tagError.set(null);
    this.api.createTag({ code, name }).subscribe({
      next: tag => {
        this.savingTag.set(false);
        this.tags.update(list => [...list, tag].sort((a, b) => a.name.localeCompare(b.name, 'vi')));
        this.newTagCode.set('');
        this.newTagName.set('');
        this.toast.success('Đã thêm chủ đề.');
      },
      error: err => {
        this.savingTag.set(false);
        this.tagError.set(videoErrorMessage(err, 'Không thêm được chủ đề.'));
      }
    });
  }

  async deleteTag(tag: VideoTag): Promise<void> {
    const ok = await this.confirm.confirmDelete({
      title: 'Xóa chủ đề',
      itemName: tag.name,
      details: tag.videoCount > 0 ? `Chủ đề đang gắn với ${tag.videoCount} video; các video sẽ bị bỏ chủ đề này.` : undefined
    });
    if (!ok) return;
    this.api.deleteTag(tag.id).subscribe({
      next: () => {
        this.tags.update(list => list.filter(t => t.id !== tag.id));
        this.toast.success('Đã xóa chủ đề.');
      },
      error: err => this.toast.error(videoErrorMessage(err, 'Không xóa được chủ đề.'))
    });
  }

  // ---- helpers ----

  private run(v: AdminVideo, call$: Observable<AdminVideo>, done: (next: AdminVideo) => void): void {
    this.busyId.set(v.id);
    call$.subscribe({
      next: next => {
        this.busyId.set(null);
        this.upsert(next);
        done(next);
      },
      error: err => {
        this.busyId.set(null);
        this.toast.error(videoErrorMessage(err, 'Thao tác không thành công.'));
      }
    });
  }

  private upsert(v: AdminVideo): void {
    if (!v?.id) return;
    this.videos.update(list => list.some(x => x.id === v.id) ? list.map(x => x.id === v.id ? v : x) : [v, ...list]);
  }

  private trustEmbedUrl(url: string): SafeResourceUrl | null {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? this.sanitizer.bypassSecurityTrustResourceUrl(parsed.toString()) : null;
    } catch {
      return null;
    }
  }
}
