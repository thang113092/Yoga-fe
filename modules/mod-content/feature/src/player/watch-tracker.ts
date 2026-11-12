/**
 * Counts the seconds a student actually watched.
 *
 * Time accumulates on the wall clock only while the player is playing, so jumping
 * ahead with the seek bar never counts as watched time. When the player reports
 * time updates, a gap longer than {@link MAX_SILENT_GAP_MS} between two of them
 * (device asleep, frozen tab) is capped instead of counted in full.
 */
export class WatchTracker {
  static readonly MAX_SILENT_GAP_MS = 15_000;

  private playing = false;
  private lastTick = 0;
  private sawTimeUpdate = false;
  /** Watched milliseconds not yet reported. */
  private pendingMs = 0;
  private position = 0;
  private duration = 0;

  constructor(private readonly now: () => number = () => Date.now(), startPosition = 0) {
    this.position = Math.max(0, Math.floor(startPosition));
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  /** Last known playback position, whole seconds. */
  get positionSeconds(): number {
    return this.position;
  }

  get durationSeconds(): number {
    return this.duration;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastTick = this.now();
  }

  pause(): void {
    if (!this.playing) return;
    this.flushClock();
    this.playing = false;
  }

  /** 'ended' behaves like pause; the position becomes the end of the video when known. */
  ended(): void {
    this.pause();
    if (this.duration > 0) this.position = Math.floor(this.duration);
  }

  /** Player 'timeupdate' ({seconds, duration}). Updates the position; a seek never adds watched time. */
  timeUpdate(seconds: number, duration?: number): void {
    if (Number.isFinite(seconds) && seconds >= 0) this.position = Math.floor(seconds);
    if (duration !== undefined && Number.isFinite(duration) && duration > 0) this.duration = duration;
    if (this.playing) this.flushClock();
    this.sawTimeUpdate = true;
  }

  /** Whole seconds watched since the previous call (≥ 0); the fraction carries over to the next report. */
  takeWatchedSeconds(): number {
    if (this.playing) this.flushClock();
    const seconds = Math.max(0, Math.floor(this.pendingMs / 1000));
    this.pendingMs -= seconds * 1000;
    return seconds;
  }

  /** Puts back seconds whose report failed, so the next report includes them. */
  restore(seconds: number): void {
    if (seconds > 0) this.pendingMs += seconds * 1000;
  }

  private flushClock(): void {
    const now = this.now();
    let elapsed = Math.max(0, now - this.lastTick);
    if (this.sawTimeUpdate) elapsed = Math.min(elapsed, WatchTracker.MAX_SILENT_GAP_MS);
    this.pendingMs += elapsed;
    this.lastTick = now;
  }
}
