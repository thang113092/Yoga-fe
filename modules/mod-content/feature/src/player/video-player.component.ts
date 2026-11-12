import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, concatMap, of } from 'rxjs';
import { API_BASE_URL } from '@yoga/platform/api';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI } from '@yoga/platform/ui';
import {
  LibraryVideo,
  Playback,
  VIDEO_ERRORS,
  VideoDetail,
  videoErrorCode,
  videoErrorMessage,
  VideoLibraryApi
} from '@yoga/mod-content/data-access';
import { EmbeddedPlayer, EmbeddedPlayerFactory, PLAYERJS_LOADER } from '../shared/video-loaders';
import { VideoPassBannerComponent } from '../shared/video-pass-banner.component';
import { formatDuration, levelLabel } from '../shared/video-format';
import { WatchTracker } from './watch-tracker';
import { videoDeviceKey } from './device-key';

/** What the player area shows. */
export type PlayerState = 'loading' | 'locked' | 'waiver' | 'starting' | 'playing' | 'devices' | 'config' | 'error';

const PLAYER_EVENTS = ['ready', 'play', 'pause', 'ended', 'timeupdate'] as const;
/** Spots the watermark moves between, as % of the player box. */
const WATERMARK_SPOTS = [
  { top: 8, left: 6 }, { top: 70, left: 58 }, { top: 40, left: 30 }, { top: 12, left: 60 }, { top: 78, left: 8 }, { top: 50, left: 64 }
];
const WATERMARK_MOVE_MS = 20_000;

/**
 * Lesson player: health warnings, safety commitment, Bunny iframe controlled through player.js,
 * moving watermark and watch-progress heartbeats.
 */
@Component({
  selector: 'yoga-video-player',
  standalone: true,
  imports: [RouterModule, VideoPassBannerComponent, ...ZEN_UI],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  private readonly api = inject(VideoLibraryApi);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly apiBase = inject(API_BASE_URL);
  private readonly loadPlayerJs = inject(PLAYERJS_LOADER);

  readonly state = signal<PlayerState>('loading');
  readonly detail = signal<VideoDetail | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly playback = signal<Playback | null>(null);
  readonly acceptingWaiver = signal(false);
  readonly completed = signal(false);
  readonly watermarkSpot = signal(WATERMARK_SPOTS[0]);
  readonly collectionId = signal<string | null>(null);
  readonly nextVideo = signal<LibraryVideo | null>(null);

  /** The iframe address is fixed for a playback; a renewed session keeps the running player. */
  readonly embedUrl = signal<SafeResourceUrl | null>(null);
  private playerFactory: EmbeddedPlayerFactory | null = null;
  private frameEl: HTMLIFrameElement | null = null;

  readonly video = computed(() => this.detail()?.video ?? null);
  readonly maxDevices = computed(() => this.detail()?.access.maxDevices ?? 0);
  readonly waiverVersion = computed(() => this.detail()?.access.waiverVersion ?? '');
  readonly warnings = computed(() => {
    const all = [...(this.detail()?.warnings ?? []), ...(this.playback()?.warnings ?? [])];
    return [...new Set(all.filter(Boolean))];
  });
  readonly levelLabel = levelLabel;
  readonly formatDuration = formatDuration;

  private videoId: string | null = null;
  private sessionId: string | null = null;
  private tracker: WatchTracker | null = null;
  private player: EmbeddedPlayer | null = null;
  private boundFrame: HTMLIFrameElement | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private watermarkTimer: ReturnType<typeof setInterval> | null = null;
  private reporting = false;
  private renewing = false;
  /** Bumped on every new lesson / playback so late responses of an old one are ignored. */
  private videoGen = 0;
  private playGen = 0;
  private readonly onPageHide = () => this.endWithKeepalive();
  /** Back from the back/forward cache: the session was ended on pagehide, open a new one. */
  private readonly onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted && this.tracker && !this.sessionId && this.state() === 'playing') this.renewSession();
  };

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('pageshow', this.onPageShow);
    }
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(q => this.collectionId.set(q.get('collection')));
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params.get('id');
      if (id) this.open(id);
    });
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
      window.removeEventListener('pageshow', this.onPageShow);
    }
    this.stopPlayback();
  }

  /** Loads a lesson (also when moving to the next lesson on the same page). */
  open(id: string): void {
    this.stopPlayback();
    this.playGen++;
    const gen = ++this.videoGen;
    this.videoId = id;
    this.state.set('loading');
    this.detail.set(null);
    this.errorMessage.set(null);
    this.completed.set(false);
    this.nextVideo.set(null);
    this.api.detail(id).subscribe({
      next: d => {
        if (gen !== this.videoGen) return;
        this.detail.set(d);
        this.completed.set(!!d.video.completed);
        this.loadNext(id);
        if (d.video.locked) this.state.set('locked');
        else if (!d.access.waiverAccepted) this.state.set('waiver');
        else this.start();
      },
      error: err => {
        if (gen !== this.videoGen) return;
        this.handleStartError(err, 'Không tải được video.');
      }
    });
  }

  /** Accepts the safety commitment, then starts playing. */
  acceptWaiver(): void {
    if (this.acceptingWaiver()) return;
    this.acceptingWaiver.set(true);
    this.api.acceptWaiver().subscribe({
      next: access => {
        this.acceptingWaiver.set(false);
        const d = this.detail();
        if (d) this.detail.set({ ...d, access });
        this.start();
      },
      error: err => {
        this.acceptingWaiver.set(false);
        this.errorMessage.set(videoErrorMessage(err, 'Chưa lưu được xác nhận. Vui lòng thử lại.'));
      }
    });
  }

  /** Opens a playback session and shows the player. */
  start(): void {
    const id = this.videoId;
    if (!id) return;
    this.stopPlayback();
    const gen = ++this.playGen;
    this.state.set('starting');
    this.errorMessage.set(null);
    if (!this.playerFactory) {
      this.loadPlayerJs().then(f => {
        this.playerFactory = f;
        this.tryBindPlayer();
      }).catch(() => {
        // Without player.js the video still plays; progress just is not tracked.
        this.playerFactory = null;
      });
    }
    this.api.startPlayback(id, videoDeviceKey()).subscribe({
      next: p => {
        if (gen !== this.playGen) return;
        const url = this.trustEmbedUrl(p.embedUrl);
        if (!url) {
          this.api.endSession(p.sessionId).pipe(catchError(() => of(null))).subscribe();
          this.errorMessage.set('Địa chỉ trình phát không hợp lệ.');
          this.state.set('error');
          return;
        }
        this.sessionId = p.sessionId;
        this.tracker = new WatchTracker(undefined, p.startAtSeconds ?? 0);
        this.playback.set(p);
        this.embedUrl.set(url);
        this.state.set('playing');
        this.startHeartbeat(p.heartbeatSeconds);
        this.startWatermark();
      },
      error: err => {
        if (gen !== this.playGen) return;
        this.handleStartError(err, 'Không mở được video. Vui lòng thử lại.');
      }
    });
  }

  /** Maps API error codes of detail/playback to what the page shows. */
  handleStartError(err: unknown, fallback: string): void {
    switch (videoErrorCode(err)) {
      case VIDEO_ERRORS.LOCKED:
        this.state.set('locked');
        break;
      case VIDEO_ERRORS.WAIVER:
        this.state.set('waiver');
        break;
      case VIDEO_ERRORS.DEVICES:
        this.state.set('devices');
        break;
      case VIDEO_ERRORS.NOT_CONFIGURED:
        this.state.set('config');
        break;
      default:
        this.errorMessage.set(videoErrorMessage(err, fallback));
        this.state.set('error');
    }
  }

  // ---- player.js ----

  /** Iframe 'load': player.js is bound as soon as both the iframe and the library are there. */
  onFrameLoad(frame: HTMLIFrameElement | null): void {
    this.frameEl = frame;
    this.tryBindPlayer();
  }

  private tryBindPlayer(): void {
    const frame = this.frameEl, factory = this.playerFactory;
    if (frame && !frame.isConnected) {
      this.frameEl = null;
      return;
    }
    if (frame && factory && this.embedUrl() && frame !== this.boundFrame) this.bindPlayer(frame, factory);
  }

  private bindPlayer(frame: HTMLIFrameElement, factory: EmbeddedPlayerFactory): void {
    this.unbindPlayer();
    this.boundFrame = frame;
    let player: EmbeddedPlayer;
    try {
      player = factory(frame);
    } catch {
      return;
    }
    this.player = player;
    player.on('ready', () => {
      const startAt = this.playback()?.startAtSeconds ?? 0;
      if (startAt > 0) player.setCurrentTime(startAt);
    });
    player.on('play', () => this.tracker?.play());
    player.on('pause', () => {
      this.tracker?.pause();
      this.report();
    });
    player.on('ended', () => {
      this.tracker?.ended();
      this.report();
    });
    player.on('timeupdate', (value?: { seconds?: number; duration?: number }) => {
      if (value && typeof value.seconds === 'number') this.tracker?.timeUpdate(value.seconds, value.duration);
    });
  }

  private unbindPlayer(): void {
    const player = this.player;
    this.player = null;
    this.boundFrame = null;
    if (!player) return;
    for (const event of PLAYER_EVENTS) {
      try { player.off(event); } catch { /* the iframe may already be gone */ }
    }
  }

  // ---- progress ----

  private startHeartbeat(seconds: number): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    const every = Math.max(5, seconds || 30) * 1000;
    this.heartbeat = setInterval(() => {
      if (this.tracker?.isPlaying) this.report();
    }, every);
  }

  /** Sends the position and the seconds watched since the previous report. */
  report(): void {
    const id = this.videoId, sessionId = this.sessionId, tracker = this.tracker;
    if (!id || !sessionId || !tracker || this.reporting || this.renewing) return;
    const watched = tracker.takeWatchedSeconds();
    this.reporting = true;
    this.api.reportProgress(id, { sessionId, positionSeconds: tracker.positionSeconds, watchedSeconds: watched }).subscribe({
      next: p => {
        this.reporting = false;
        if (p?.completed) this.completed.set(true);
      },
      error: err => {
        this.reporting = false;
        tracker.restore(watched);
        if (videoErrorCode(err) === VIDEO_ERRORS.SESSION) this.renewSession();
      }
    });
  }

  /** The session expired: open a new one silently, keep the running player and its position. */
  private renewSession(): void {
    const id = this.videoId;
    if (!id || this.renewing) return;
    this.renewing = true;
    const gen = this.playGen;
    this.api.startPlayback(id, videoDeviceKey()).subscribe({
      next: p => {
        this.renewing = false;
        if (gen !== this.playGen) return;
        this.sessionId = p.sessionId;
        this.playback.update(old => old ? { ...p, embedUrl: old.embedUrl, startAtSeconds: old.startAtSeconds } : p);
        this.startHeartbeat(p.heartbeatSeconds);
        this.report();
      },
      error: err => {
        this.renewing = false;
        if (gen !== this.playGen) return;
        this.stopPlayback();
        this.handleStartError(err, 'Phiên xem đã hết hạn. Vui lòng mở lại video.');
      }
    });
  }

  /** Final report and session end when leaving the lesson. */
  private stopPlayback(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.watermarkTimer) clearInterval(this.watermarkTimer);
    this.heartbeat = this.watermarkTimer = null;
    this.unbindPlayer();
    const id = this.videoId, sessionId = this.sessionId, tracker = this.tracker;
    this.sessionId = null;
    this.tracker = null;
    this.reporting = false;
    this.renewing = false;
    this.frameEl = null;
    this.embedUrl.set(null);
    this.playback.set(null);
    if (!id || !sessionId || !tracker) return;
    tracker.pause();
    const final = { sessionId, positionSeconds: tracker.positionSeconds, watchedSeconds: tracker.takeWatchedSeconds() };
    this.api.reportProgress(id, final).pipe(
      catchError(() => of(null)),
      concatMap(() => this.api.endSession(sessionId)),
      catchError(() => of(null))
    ).subscribe();
  }

  /**
   * Page closed or reloaded: Angular may not get to run the normal teardown, so send the final
   * report with fetch keepalive (sendBeacon cannot carry the Bearer token), then end the session.
   */
  private endWithKeepalive(): void {
    const id = this.videoId, sessionId = this.sessionId, tracker = this.tracker;
    const token = this.auth.currentUser()?.accessToken;
    if (!id || !sessionId || !tracker || !token || typeof fetch !== 'function') return;
    this.sessionId = null;
    tracker.pause();
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const body = JSON.stringify({ sessionId, positionSeconds: tracker.positionSeconds, watchedSeconds: tracker.takeWatchedSeconds() });
    const end = () => fetch(`${this.apiBase}/me/playback-sessions/${sessionId}/end`, { method: 'POST', keepalive: true, headers, body: '{}' });
    try {
      fetch(`${this.apiBase}/me/videos/${id}/progress`, { method: 'PUT', keepalive: true, headers, body })
        .then(end, end)
        .catch(() => undefined);
    } catch {
      // best effort only
    }
  }

  // ---- watermark ----

  private startWatermark(): void {
    if (this.watermarkTimer) clearInterval(this.watermarkTimer);
    let index = Math.floor(Math.random() * WATERMARK_SPOTS.length);
    this.watermarkSpot.set(WATERMARK_SPOTS[index]);
    this.watermarkTimer = setInterval(() => {
      index = (index + 1 + Math.floor(Math.random() * (WATERMARK_SPOTS.length - 1))) % WATERMARK_SPOTS.length;
      this.watermarkSpot.set(WATERMARK_SPOTS[index]);
    }, WATERMARK_MOVE_MS);
  }

  // ---- collection ----

  private loadNext(id: string): void {
    const collectionId = this.collectionId();
    if (!collectionId) return;
    const gen = this.videoGen;
    this.api.collection(collectionId).subscribe({
      next: c => {
        if (gen !== this.videoGen) return;
        const index = c.items.findIndex(v => v.id === id);
        this.nextVideo.set(index >= 0 ? c.items[index + 1] ?? null : null);
      },
      error: () => this.nextVideo.set(null)
    });
  }

  /** Only addresses returned by our own API reach the iframe. */
  private trustEmbedUrl(url: string): SafeResourceUrl | null {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? this.sanitizer.bypassSecurityTrustResourceUrl(parsed.toString()) : null;
    } catch {
      return null;
    }
  }
}
