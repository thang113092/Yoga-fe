import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ZEN_UI } from '@yoga/platform/ui';
import { StudentCollection, VideoLibraryApi, videoErrorMessage } from '@yoga/mod-content/data-access';
import { formatDuration, levelLabel } from '../shared/video-format';

/** One learning path: ordered lessons with completion ticks. */
@Component({
  selector: 'yoga-video-collection',
  standalone: true,
  imports: [RouterModule, ...ZEN_UI],
  template: `
    <div class="zen-page zen-page--narrow">
      <a routerLink="/videos" class="zen-btn zen-btn--ghost zen-btn--sm back-link">
        <zen-icon name="arrow-left" [size]="15" />
        <span>Thư viện video</span>
      </a>

      @if (loading()) {
        <zen-loading message="Đang tải lộ trình..." />
      } @else if (error()) {
        <zen-alert tone="danger">{{ error() }}</zen-alert>
      } @else if (collection()) {
        @let c = collection()!;
        <zen-page-header eyebrow="Lộ trình" [heading]="c.title" [subtitle]="c.description || ''" [count]="c.total" countLabel="bài" />
        <zen-card padding="md">
          <div class="summary">
            @if (c.level) { <zen-badge tone="primary">{{ levelLabel(c.level) }}</zen-badge> }
            <span class="zen-num">Đã hoàn thành {{ c.completed }}/{{ c.total }} bài</span>
          </div>
          <div class="bar" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
            <span [style.width.%]="percent()"></span>
          </div>
        </zen-card>

        @if (!c.items.length) {
          <zen-empty-state icon="list" heading="Lộ trình chưa có bài nào" />
        } @else {
          <ol class="lessons">
            @for (v of c.items; track v.id; let i = $index) {
              <li>
                <a class="lesson" [routerLink]="['/videos', v.id]" [queryParams]="{ collection: c.id }" [class.is-done]="v.completed">
                  <span class="index" [attr.aria-label]="v.completed ? 'Đã xong' : 'Bài ' + (i + 1)">
                    @if (v.completed) { <zen-icon name="check" [size]="16" /> } @else { {{ i + 1 }} }
                  </span>
                  <span class="lesson-body">
                    <span class="lesson-title">{{ v.title }}</span>
                    <span class="lesson-meta">
                      <span class="zen-num">{{ formatDuration(v.durationSeconds) }}</span>
                      @if (v.level) { <span>· {{ levelLabel(v.level) }}</span> }
                      @if (v.instructorName) { <span>· {{ v.instructorName }}</span> }
                    </span>
                  </span>
                  @if (v.locked) {
                    <zen-icon name="lock" [size]="16" class="lesson-lock" />
                  } @else if (v.isFreePreview) {
                    <zen-badge tone="success" size="sm">Miễn phí</zen-badge>
                  }
                  <zen-icon name="chevron-right" [size]="16" class="lesson-go" />
                </a>
              </li>
            }
          </ol>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .back-link { align-self: flex-start; }
    .summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; font-size: var(--text-sm); }
    .bar { height: 6px; border-radius: var(--radius-full); background: var(--color-neutral-bg); overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--color-primary); }
    .lessons { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .lesson {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px; text-decoration: none; color: inherit;
      border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface);
      &:hover { background: var(--color-surface-hover); }
    }
    .index {
      display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 30px; height: 30px;
      border-radius: var(--radius-full); background: var(--color-neutral-bg); font-size: var(--text-sm); font-weight: var(--weight-semibold);
    }
    .is-done .index { background: var(--color-success-bg); color: var(--color-success); }
    .lesson-body { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .lesson-title { font-weight: var(--weight-semibold); color: var(--color-text-main); }
    .lesson-meta { display: flex; gap: 4px; flex-wrap: wrap; font-size: var(--text-xs); color: var(--color-text-muted); }
    .lesson-lock, .lesson-go { color: var(--color-text-subtle); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoCollectionComponent implements OnInit {
  private readonly api = inject(VideoLibraryApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly collection = signal<StudentCollection | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly percent = computed(() => {
    const c = this.collection();
    return c && c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
  });
  readonly formatDuration = formatDuration;
  readonly levelLabel = levelLabel;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.collection(id).subscribe({
      next: c => { this.collection.set(c); this.loading.set(false); },
      error: err => {
        this.collection.set(null);
        this.loading.set(false);
        this.error.set(videoErrorMessage(err, 'Không tải được lộ trình.'));
      }
    });
  }
}
