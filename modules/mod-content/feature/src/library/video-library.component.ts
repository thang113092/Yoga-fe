import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ZEN_UI } from '@yoga/platform/ui';
import {
  LibraryFilters,
  LibraryVideo,
  StudentCollection,
  VideoAccess,
  VideoLibraryApi,
  videoErrorMessage,
  VideoTag
} from '@yoga/mod-content/data-access';
import { VideoCardComponent } from '../shared/video-card.component';
import { VideoPassBannerComponent } from '../shared/video-pass-banner.component';
import { DURATION_OPTIONS, LEVEL_OPTIONS, levelLabel } from '../shared/video-format';

const PAGE_SIZE = 24;

/** Student video library: access banner, "continue watching", collections and the filtered grid. */
@Component({
  selector: 'yoga-video-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, VideoCardComponent, VideoPassBannerComponent, ...ZEN_UI],
  templateUrl: './video-library.component.html',
  styleUrls: ['./video-library.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoLibraryComponent implements OnInit {
  private readonly api = inject(VideoLibraryApi);

  readonly access = signal<VideoAccess | null>(null);
  readonly continueWatching = signal<LibraryVideo[]>([]);
  readonly collections = signal<StudentCollection[]>([]);
  readonly tags = signal<VideoTag[]>([]);

  readonly videos = signal<LibraryVideo[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly level = signal<string>('');
  readonly tag = signal<string>('');
  readonly maxMinutes = signal<number>(0);
  readonly q = signal('');

  readonly levelOptions = [{ value: '', label: 'Tất cả cấp độ' }, ...LEVEL_OPTIONS];
  readonly durationOptions = [{ value: 0, label: 'Mọi thời lượng' }, ...DURATION_OPTIONS];
  readonly tagOptions = computed(() => [{ value: '', label: 'Mọi chủ đề' }, ...this.tags().map(t => ({ value: t.code, label: t.name }))]);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  readonly hasFilters = computed(() => !!(this.level() || this.tag() || this.maxMinutes() || this.q().trim()));
  readonly levelLabel = levelLabel;

  /** Query of the grid for the current filters and page. */
  readonly filters = computed<LibraryFilters>(() => ({
    level: this.level() || null,
    tag: this.tag() || null,
    maxMinutes: this.maxMinutes() || null,
    q: this.q() || null,
    page: this.page(),
    size: PAGE_SIZE
  }));

  ngOnInit(): void {
    this.api.access().subscribe({ next: a => this.access.set(a), error: () => this.access.set(null) });
    this.api.list({ inProgress: true, size: 6 }).subscribe({
      next: p => this.continueWatching.set(p.items ?? []),
      error: () => this.continueWatching.set([])
    });
    this.api.collections().subscribe({ next: list => this.collections.set(list ?? []), error: () => this.collections.set([]) });
    this.api.tags().subscribe({ next: list => this.tags.set(list ?? []), error: () => this.tags.set([]) });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.filters()).subscribe({
      next: p => {
        this.videos.set(p.items ?? []);
        this.total.set(p.total ?? 0);
        this.loading.set(false);
      },
      error: err => {
        this.videos.set([]);
        this.total.set(0);
        this.loading.set(false);
        this.error.set(videoErrorMessage(err, 'Không tải được thư viện video.'));
      }
    });
  }

  setLevel(value: string): void { this.level.set(value ?? ''); this.applyFilters(); }
  setTag(value: string): void { this.tag.set(value ?? ''); this.applyFilters(); }
  setMaxMinutes(value: number): void { this.maxMinutes.set(Number(value) || 0); this.applyFilters(); }
  search(value: string): void { this.q.set(value ?? ''); this.applyFilters(); }

  clearFilters(): void {
    this.level.set('');
    this.tag.set('');
    this.maxMinutes.set(0);
    this.q.set('');
    this.applyFilters();
  }

  goToPage(page: number): void {
    this.page.set(Math.max(0, Math.min(page, this.totalPages() - 1)));
    this.load();
  }

  collectionPercent(c: StudentCollection): number {
    return c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
  }

  private applyFilters(): void {
    this.page.set(0);
    this.load();
  }
}
