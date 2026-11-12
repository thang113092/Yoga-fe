import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ZEN_UI, ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { AdminCollection, AdminVideo, VideoAdminApi, videoErrorMessage, VideoLevel } from '@yoga/mod-content/data-access';
import { formatDuration, LEVEL_OPTIONS, levelLabel, statusLabel } from '../shared/video-format';

interface CollectionForm {
  title: string;
  description: string;
  level: VideoLevel | '';
  isPublished: boolean;
  videoIds: string[];
}

/** Learning paths: ordered lists of transcoded videos. Managers only. */
@Component({
  selector: 'yoga-video-collections-manage',
  standalone: true,
  imports: [FormsModule, RouterModule, ...ZEN_UI],
  template: `
    <div class="zen-page">
      <zen-page-header eyebrow="Thư viện video" heading="Lộ trình học" subtitle="Nhóm các video theo thứ tự để học viên tập dần" [count]="collections().length" countLabel="lộ trình">
        <div actions class="header-actions">
          <a routerLink="/videos/manage" class="zen-btn zen-btn--outline">
            <zen-icon name="arrow-left" />
            <span>Danh sách video</span>
          </a>
          <button type="button" class="zen-btn zen-btn--primary" (click)="openCreate()">
            <zen-icon name="plus" />
            <span>Tạo lộ trình</span>
          </button>
        </div>
      </zen-page-header>

      @if (error()) { <zen-alert tone="danger" dismissible (dismissed)="error.set(null)">{{ error() }}</zen-alert> }

      @if (loading()) {
        <zen-loading message="Đang tải lộ trình..." />
      } @else if (!collections().length) {
        <zen-empty-state icon="list" heading="Chưa có lộ trình" description="Tạo lộ trình từ các video đã chuyển mã xong." />
      } @else {
        <div class="zen-grid">
          @for (c of collections(); track c.id) {
            <zen-card padding="md">
              <div class="col-head">
                <h3>{{ c.title }}</h3>
                <zen-badge [tone]="c.isPublished ? 'success' : 'neutral'" dot>{{ c.isPublished ? 'Đã xuất bản' : 'Nháp' }}</zen-badge>
              </div>
              @if (c.description) { <p class="col-desc">{{ c.description }}</p> }
              <p class="zen-text-sm zen-text-muted">{{ c.items.length }} bài{{ c.level ? ' · ' + levelLabel(c.level) : '' }}</p>
              <ol class="col-items">
                @for (it of c.items; track it.videoId) {
                  <li>{{ it.title }} <span class="zen-text-muted zen-num">{{ formatDuration(it.durationSeconds) }}</span></li>
                }
              </ol>
              <div class="col-actions">
                <button type="button" class="zen-btn zen-btn--outline zen-btn--sm" (click)="openEdit(c)">
                  <zen-icon name="edit" [size]="14" />
                  <span>Sửa</span>
                </button>
                <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm danger" (click)="remove(c)">
                  <zen-icon name="trash" [size]="14" />
                  <span>Xóa</span>
                </button>
              </div>
            </zen-card>
          }
        </div>
      }
    </div>

    @if (formOpen()) {
      <zen-modal [heading]="editing() ? 'Sửa lộ trình' : 'Tạo lộ trình'" icon="list" size="lg" [closable]="!saving()" (closed)="closeForm()">
        @let f = form();
        <div class="zen-form-grid">
          <label class="zen-field zen-field--full">
            <span class="zen-label">Tên lộ trình <span class="zen-required">*</span></span>
            <input class="zen-control" maxlength="200" [ngModel]="f.title" (ngModelChange)="patch({ title: $event })" />
          </label>
          <label class="zen-field zen-field--full">
            <span class="zen-label">Mô tả</span>
            <textarea class="zen-control" rows="2" [ngModel]="f.description" (ngModelChange)="patch({ description: $event })"></textarea>
          </label>
          <div class="zen-field">
            <span class="zen-label">Cấp độ</span>
            <zen-select [options]="levelOptions" [ngModel]="f.level" (ngModelChange)="patch({ level: $event })" placeholder="Chọn cấp độ" />
          </div>
          <label class="zen-check publish-check">
            <input type="checkbox" [checked]="f.isPublished" (change)="patch({ isPublished: !f.isPublished })" />
            <span>Hiện cho học viên</span>
          </label>
        </div>

        <h4 class="picker-title">Bài trong lộ trình ({{ f.videoIds.length }})</h4>
        @if (!f.videoIds.length) {
          <p class="zen-hint">Chọn video ở danh sách bên dưới.</p>
        } @else {
          <ol class="picked">
            @for (id of f.videoIds; track id; let i = $index, first = $first, last = $last) {
              <li>
                <span class="picked-index zen-num">{{ i + 1 }}</span>
                <span class="picked-title">{{ titleOf(id) }}</span>
                <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm" [disabled]="first" (click)="move(i, -1)" title="Lên" aria-label="Chuyển lên">
                  <zen-icon name="chevron-up" [size]="14" />
                </button>
                <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm" [disabled]="last" (click)="move(i, 1)" title="Xuống" aria-label="Chuyển xuống">
                  <zen-icon name="chevron-down" [size]="14" />
                </button>
                <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm danger" (click)="toggle(id)" title="Bỏ khỏi lộ trình" aria-label="Bỏ khỏi lộ trình">
                  <zen-icon name="close" [size]="14" />
                </button>
              </li>
            }
          </ol>
        }

        <h4 class="picker-title">Video có thể thêm</h4>
        @if (!available().length) {
          <p class="zen-hint">Chưa có video nào đã chuyển mã xong (Sẵn sàng hoặc Đã xuất bản).</p>
        } @else {
          <ul class="available">
            @for (v of available(); track v.id) {
              <li>
                <label class="zen-check">
                  <input type="checkbox" [checked]="f.videoIds.includes(v.id)" (change)="toggle(v.id)" />
                  <span>{{ v.title }}</span>
                </label>
                <span class="zen-text-muted zen-text-xs">{{ statusLabel(v.status) }} · {{ formatDuration(v.durationSeconds) }}</span>
              </li>
            }
          </ul>
        }
        @if (formError()) { <p class="zen-error">{{ formError() }}</p> }
        <ng-container modal-footer>
          <button type="button" class="zen-btn zen-btn--outline" (click)="closeForm()" [disabled]="saving()">Hủy</button>
          <button type="button" class="zen-btn zen-btn--primary" (click)="submit()" [disabled]="saving()">{{ saving() ? 'Đang lưu...' : 'Lưu lộ trình' }}</button>
        </ng-container>
      </zen-modal>
    }
  `,
  styles: [`
    :host { display: block; }
    .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .col-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .col-head h3 { margin: 0; font-size: var(--text-base); font-weight: var(--weight-semibold); }
    .col-desc { margin: 8px 0 0; font-size: var(--text-sm); color: var(--color-text-secondary); }
    .col-items { margin: 8px 0; padding-left: 20px; font-size: var(--text-sm); display: flex; flex-direction: column; gap: 2px; }
    .col-actions { display: flex; gap: 6px; justify-content: flex-end; }
    .danger { color: var(--color-error); }
    .publish-check { align-self: end; min-height: var(--control-height-md); }
    .picker-title { margin: 18px 0 8px; font-size: var(--text-sm); font-weight: var(--weight-semibold); color: var(--color-text-secondary); }
    .picked, .available { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .picked li { display: flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
    .picked-index { width: 24px; text-align: center; font-weight: var(--weight-semibold); color: var(--color-primary); }
    .picked-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .available { max-height: 260px; overflow-y: auto; }
    .available li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoCollectionsManageComponent implements OnInit {
  private readonly api = inject(VideoAdminApi);
  private readonly toast = inject(ZenToastService);
  private readonly confirm = inject(ZenConfirmService);

  readonly collections = signal<AdminCollection[]>([]);
  readonly videos = signal<AdminVideo[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly editing = signal<AdminCollection | null>(null);
  readonly form = signal<CollectionForm>({ title: '', description: '', level: '', isPublished: false, videoIds: [] });
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly levelOptions = [{ value: '', label: 'Chưa chọn' }, ...LEVEL_OPTIONS];
  /** Only transcoded videos can go in a collection. */
  readonly available = computed(() => this.videos().filter(v => v.status === 'READY' || v.status === 'PUBLISHED'));
  private readonly titles = computed(() => {
    const map = new Map(this.videos().map(v => [v.id, v.title]));
    for (const c of this.collections()) for (const it of c.items) if (!map.has(it.videoId)) map.set(it.videoId, it.title);
    return map;
  });

  readonly levelLabel = levelLabel;
  readonly statusLabel = statusLabel;
  readonly formatDuration = formatDuration;

  ngOnInit(): void {
    this.load();
    this.api.list().subscribe({ next: list => this.videos.set(list ?? []), error: () => this.videos.set([]) });
  }

  load(): void {
    this.loading.set(true);
    this.api.collections().subscribe({
      next: list => { this.collections.set(list ?? []); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.error.set(videoErrorMessage(err, 'Không tải được lộ trình.'));
      }
    });
  }

  titleOf(id: string): string {
    return this.titles().get(id) ?? 'Video';
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.set({ title: '', description: '', level: '', isPublished: false, videoIds: [] });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEdit(c: AdminCollection): void {
    this.editing.set(c);
    this.form.set({
      title: c.title,
      description: c.description ?? '',
      level: c.level ?? '',
      isPublished: c.isPublished,
      videoIds: [...c.items].sort((a, b) => a.position - b.position).map(i => i.videoId)
    });
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  patch(p: Partial<CollectionForm>): void {
    this.form.update(f => ({ ...f, ...p }));
  }

  toggle(id: string): void {
    this.form.update(f => ({ ...f, videoIds: f.videoIds.includes(id) ? f.videoIds.filter(x => x !== id) : [...f.videoIds, id] }));
  }

  /** Moves the video at `index` up (-1) or down (+1). */
  move(index: number, delta: -1 | 1): void {
    this.form.update(f => {
      const target = index + delta;
      if (target < 0 || target >= f.videoIds.length) return f;
      const ids = [...f.videoIds];
      [ids[index], ids[target]] = [ids[target], ids[index]];
      return { ...f, videoIds: ids };
    });
  }

  submit(): void {
    const f = this.form();
    if (this.saving()) return;
    if (!f.title.trim()) {
      this.formError.set('Vui lòng nhập tên lộ trình.');
      return;
    }
    const req = { title: f.title.trim(), description: f.description.trim() || null, level: f.level || null, isPublished: f.isPublished, videoIds: f.videoIds };
    const editing = this.editing();
    this.saving.set(true);
    this.formError.set(null);
    (editing ? this.api.updateCollection(editing.id, req) : this.api.createCollection(req)).subscribe({
      next: saved => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.collections.update(list => list.some(c => c.id === saved.id) ? list.map(c => c.id === saved.id ? saved : c) : [saved, ...list]);
        this.toast.success(editing ? 'Đã cập nhật lộ trình.' : 'Đã tạo lộ trình.');
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(videoErrorMessage(err, 'Không lưu được lộ trình.'));
      }
    });
  }

  async remove(c: AdminCollection): Promise<void> {
    const ok = await this.confirm.confirmDelete({ title: 'Xóa lộ trình', itemName: c.title, details: 'Các video trong lộ trình không bị xóa.' });
    if (!ok) return;
    this.api.deleteCollection(c.id).subscribe({
      next: () => {
        this.collections.update(list => list.filter(x => x.id !== c.id));
        this.toast.success('Đã xóa lộ trình.');
      },
      error: err => this.toast.error(videoErrorMessage(err, 'Không xóa được lộ trình.'))
    });
  }
}
