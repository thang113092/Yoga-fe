import { WatchTracker } from './watch-tracker';

describe('WatchTracker', () => {
  let clock: number;
  let tracker: WatchTracker;
  const advance = (ms: number) => { clock += ms; };

  beforeEach(() => {
    clock = 1_000_000;
    tracker = new WatchTracker(() => clock, 30);
  });

  it('starts at the resume position with nothing watched', () => {
    expect(tracker.positionSeconds).toBe(30);
    expect(tracker.takeWatchedSeconds()).toBe(0);
  });

  it('accumulates wall-clock time while playing', () => {
    tracker.play();
    advance(4_000);
    tracker.timeUpdate(34, 600);
    advance(6_500);
    expect(tracker.takeWatchedSeconds()).toBe(10);
    advance(500);
    // The carried half second plus this half second make one more second.
    expect(tracker.takeWatchedSeconds()).toBe(1);
    expect(tracker.takeWatchedSeconds()).toBe(0);
  });

  it('does not count time while paused', () => {
    tracker.play();
    advance(5_000);
    tracker.pause();
    advance(60_000);
    expect(tracker.takeWatchedSeconds()).toBe(5);
    advance(60_000);
    expect(tracker.takeWatchedSeconds()).toBe(0);
    expect(tracker.isPlaying).toBe(false);
  });

  it('does not count a seek jump as watched time', () => {
    tracker.play();
    advance(2_000);
    tracker.timeUpdate(32, 600);
    advance(1_000);
    tracker.timeUpdate(400, 600); // seek forward ~6 minutes in one second
    expect(tracker.positionSeconds).toBe(400);
    expect(tracker.takeWatchedSeconds()).toBe(3);
  });

  it('seeking while paused moves the position without adding time', () => {
    tracker.timeUpdate(250, 600);
    advance(10_000);
    expect(tracker.positionSeconds).toBe(250);
    expect(tracker.takeWatchedSeconds()).toBe(0);
  });

  it('caps a long silent gap between time updates', () => {
    tracker.play();
    tracker.timeUpdate(30, 600);
    advance(10 * 60_000); // the laptop slept with the video "playing"
    expect(tracker.takeWatchedSeconds()).toBe(WatchTracker.MAX_SILENT_GAP_MS / 1000);
  });

  it('moves to the end on ended and stops counting', () => {
    tracker.play();
    tracker.timeUpdate(595, 600);
    advance(5_000);
    tracker.ended();
    advance(5_000);
    expect(tracker.positionSeconds).toBe(600);
    expect(tracker.takeWatchedSeconds()).toBe(5);
  });

  it('restores seconds of a failed report', () => {
    tracker.play();
    advance(7_000);
    const sent = tracker.takeWatchedSeconds();
    tracker.restore(sent);
    advance(1_000);
    expect(tracker.takeWatchedSeconds()).toBe(8);
  });

  it('ignores repeated play and pause events', () => {
    tracker.play();
    advance(2_000);
    tracker.play();
    advance(2_000);
    tracker.pause();
    tracker.pause();
    expect(tracker.takeWatchedSeconds()).toBe(4);
  });
});
