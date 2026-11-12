import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ZEN_UI } from '@yoga/platform/ui';
import { LibraryVideo } from '@yoga/mod-content/data-access';
import { formatDuration, levelLabel, progressPercent } from './video-format';

/** Library tile: thumbnail, duration, level, tags, lock / free badges and watch progress. */
@Component({
  selector: 'yoga-video-card',
  standalone: true,
  inputs: ['video', 'collectionId'],
  imports: [RouterModule, ...ZEN_UI],
  template: `
    @let v = video;
    <a class="video-card" [routerLink]="['/videos', v.id]" [queryParams]="collectionId ? { collection: collectionId } : null"
       [class.is-locked]="v.locked" [attr.aria-label]="v.title">
      <div class="thumb">
        @if (v.thumbnailUrl) {
          <img [src]="v.thumbnailUrl" [alt]="v.title" loading="lazy" />
        } @else {
          <div class="thumb-placeholder"><zen-icon name="play" [size]="32" /></div>
        }
        <span class="duration zen-num">{{ duration }}</span>
        @if (v.locked) {
          <span class="lock" title="Cần gói Online hoặc Kết hợp"><zen-icon name="lock" [size]="16" /></span>
        }
        @if (v.isFreePreview) {
          <span class="free"><zen-badge tone="success" size="sm">Miễn phí</zen-badge></span>
        }
        @if (percent > 0 && !v.completed) {
          <div class="progress" role="progressbar" [attr.aria-valuenow]="percent" aria-valuemin="0" aria-valuemax="100">
            <span [style.width.%]="percent"></span>
          </div>
        }
      </div>
      <div class="body">
        <h3 class="title">{{ v.title }}</h3>
        <div class="meta">
          @if (level) { <span>{{ level }}</span> }
          @if (v.instructorName) { <span>· {{ v.instructorName }}</span> }
        </div>
        <div class="tags">
          @if (v.completed) {
            <zen-badge tone="success" size="sm"><zen-icon name="check" [size]="12" /> Đã xong</zen-badge>
          }
          @for (tag of v.tags; track tag) {
            <span class="tag">{{ tag }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .video-card {
      display: flex; flex-direction: column; height: 100%; overflow: hidden; text-decoration: none; color: inherit;
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
      transition: box-shadow var(--duration-fast) ease, transform var(--duration-fast) ease;
      &:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
      &:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus-ring); }
    }
    .thumb { position: relative; aspect-ratio: 16 / 9; background: var(--color-surface-variant); overflow: hidden; }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .is-locked .thumb img { filter: grayscale(0.4) brightness(0.8); }
    .thumb-placeholder { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--color-text-subtle); }
    .duration {
      position: absolute; right: 8px; bottom: 10px; padding: 2px 6px; border-radius: var(--radius-sm);
      background: rgba(0, 0, 0, 0.72); color: #fff; font-size: var(--text-2xs); font-weight: var(--weight-semibold);
    }
    .lock {
      position: absolute; top: 8px; right: 8px; display: inline-flex; padding: 6px; border-radius: var(--radius-full);
      background: rgba(0, 0, 0, 0.65); color: #fff;
    }
    .free { position: absolute; top: 8px; left: 8px; }
    .progress { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255, 255, 255, 0.35); }
    .progress span { display: block; height: 100%; background: var(--color-primary); }
    .body { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 14px; }
    .title {
      margin: 0; font-size: var(--text-base); font-weight: var(--weight-semibold); color: var(--color-text-main); line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .meta { display: flex; gap: 4px; flex-wrap: wrap; font-size: var(--text-xs); color: var(--color-text-muted); }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .tag {
      padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-neutral-bg);
      font-size: var(--text-2xs); color: var(--color-text-secondary);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoCardComponent {
  video!: LibraryVideo;
  /** When set, the player shows the next lesson of this collection. */
  collectionId: string | null = null;

  protected get duration(): string { return formatDuration(this.video.durationSeconds); }
  protected get level(): string { return levelLabel(this.video.level); }
  protected get percent(): number { return progressPercent(this.video.positionSeconds, this.video.durationSeconds); }
}
