import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { VideoDetail, VideoLibraryApi } from '@yoga/mod-content/data-access';
import { PLAYERJS_LOADER } from '../shared/video-loaders';
import { VideoPlayerComponent } from './video-player.component';

const apiError = (status: number, code: string) => new HttpErrorResponse({ status, error: { code, success: false, message: code } });

function detail(patch: { locked?: boolean; waiverAccepted?: boolean } = {}): VideoDetail {
  return {
    video: {
      id: 'v1', title: 'Hatha cơ bản', description: 'Mô tả', level: 'BEGINNER', durationSeconds: 600, instructorName: 'Lan',
      thumbnailUrl: null, tags: ['Hatha'], isFreePreview: false, locked: !!patch.locked, positionSeconds: 30, watchedSeconds: 0,
      completed: false, publishedAt: null
    },
    contraindications: 'Không tập khi đau lưng cấp',
    warnings: ['Bạn đang mang thai: hãy hỏi ý kiến bác sĩ'],
    access: { hasPass: !patch.locked, passEndDate: null, waiverAccepted: patch.waiverAccepted ?? true, waiverVersion: '2026-01', maxDevices: 2 }
  };
}

const playback = (sessionId = 's1') => ({
  sessionId, embedUrl: 'https://iframe.mediadelivery.net/embed/1/abc?token=x', expiresAt: '2099-01-01T00:00:00Z',
  heartbeatSeconds: 30, startAtSeconds: 30, watermark: 'Lan · 6789', warnings: []
});

describe('VideoPlayerComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let handlers: Record<string, (value?: any) => void>;
  let player: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; setCurrentTime: ReturnType<typeof vi.fn> };
  let factory: ReturnType<typeof vi.fn>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function setup(d: VideoDetail = detail()) {
    handlers = {};
    player = {
      on: vi.fn((event: string, cb: (value?: any) => void) => { handlers[event] = cb; }),
      off: vi.fn(),
      setCurrentTime: vi.fn()
    };
    factory = vi.fn(() => player);
    api = {
      detail: vi.fn().mockReturnValue(of(d)),
      acceptWaiver: vi.fn().mockReturnValue(of({ ...d.access, waiverAccepted: true })),
      startPlayback: vi.fn().mockReturnValue(of(playback())),
      reportProgress: vi.fn().mockReturnValue(of({ positionSeconds: 0, watchedSeconds: 0, completed: false, sessionExpiresAt: null })),
      endSession: vi.fn().mockReturnValue(of(undefined)),
      collection: vi.fn().mockReturnValue(of({ id: 'c1', title: 'Lộ trình', items: [d.video, { ...d.video, id: 'v2', title: 'Bài 2' }] }))
    };
    params = new BehaviorSubject(convertToParamMap({ id: 'v1' }));
    TestBed.configureTestingModule({
      imports: [VideoPlayerComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: VideoLibraryApi, useValue: api },
        { provide: PLAYERJS_LOADER, useValue: () => Promise.resolve(factory) },
        { provide: AuthService, useValue: { currentUser: () => ({ accessToken: 'token' }) } },
        { provide: ActivatedRoute, useValue: { paramMap: params, queryParamMap: of(convertToParamMap({ collection: 'c1' })) } }
      ]
    });
    const fixture = TestBed.createComponent(VideoPlayerComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }

  async function render(fixture: ReturnType<typeof setup>['fixture']) {
    await new Promise(resolve => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.nativeElement.querySelector('iframe')?.dispatchEvent(new Event('load'));
    fixture.detectChanges();
  }

  afterEach(() => vi.useRealTimers());

  it('starts playback with a device key kept in localStorage and binds player.js to the iframe', async () => {
    const { fixture, page } = setup();
    expect(api['startPlayback']).toHaveBeenCalledWith('v1', expect.any(String));
    const deviceKey = api['startPlayback'].mock.calls[0][1];
    expect(localStorage.getItem('yoga.video.deviceKey')).toBe(deviceKey);
    expect(page.state()).toBe('playing');
    await render(fixture);
    const iframe: HTMLIFrameElement = fixture.nativeElement.querySelector('iframe');
    expect(iframe.src).toContain('https://iframe.mediadelivery.net/embed/1/abc');
    expect(iframe.getAttribute('allow')).toContain('encrypted-media');
    expect(factory).toHaveBeenCalledWith(iframe);
    handlers['ready']();
    expect(player.setCurrentTime).toHaveBeenCalledWith(30);
    expect(fixture.nativeElement.querySelector('.watermark').textContent).toContain('Lan · 6789');
    expect(fixture.nativeElement.textContent).toContain('Bạn đang mang thai');
    expect(page.nextVideo()?.id).toBe('v2');
  });

  it('shows the package banner for a locked video and never opens a session', () => {
    const { fixture, page } = setup(detail({ locked: true }));
    fixture.detectChanges();
    expect(page.state()).toBe('locked');
    expect(api['startPlayback']).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('yoga-video-pass-banner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('asks for the safety commitment first, then plays', () => {
    const { fixture, page } = setup(detail({ waiverAccepted: false }));
    fixture.detectChanges();
    expect(page.state()).toBe('waiver');
    expect(fixture.nativeElement.textContent).toContain('2026-01');
    expect(api['startPlayback']).not.toHaveBeenCalled();
    page.acceptWaiver();
    expect(api['acceptWaiver']).toHaveBeenCalled();
    expect(api['startPlayback']).toHaveBeenCalledTimes(1);
    expect(page.state()).toBe('playing');
  });

  it('maps playback error codes to the right state', () => {
    const { fixture, page } = setup();
    const cases: [string, number, string][] = [
      ['VIDEO_403_LOCKED', 403, 'locked'],
      ['VIDEO_428_WAIVER', 428, 'waiver'],
      ['VIDEO_409_DEVICES', 409, 'devices'],
      ['VIDEO_503_CONFIG', 503, 'config']
    ];
    for (const [code, status, state] of cases) {
      api['startPlayback'].mockReturnValueOnce(throwError(() => apiError(status, code)));
      page.start();
      expect(page.state()).toBe(state);
    }
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Thư viện video chưa được cấu hình');
  });

  it('shows the device limit with a retry button', () => {
    const { fixture, page } = setup();
    api['startPlayback'].mockReturnValueOnce(throwError(() => apiError(409, 'VIDEO_409_DEVICES')));
    page.start();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('đang xem trên tối đa 2 thiết bị');
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(b => b.textContent?.includes('Thử lại'))!;
    retry.click();
    expect(page.state()).toBe('playing');
  });

  it('reports watched seconds as a delta on heartbeat and pause', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { fixture } = setup();
    await render(fixture);
    handlers['play']();
    handlers['timeupdate']({ seconds: 30, duration: 600 });
    for (let i = 1; i <= 6; i++) {
      vi.advanceTimersByTime(5_000); // the 30 s heartbeat fires during the last step
      handlers['timeupdate']({ seconds: 30 + 5 * i, duration: 600 });
    }
    expect(api['reportProgress']).toHaveBeenCalledTimes(1);
    expect(api['reportProgress'].mock.calls[0]).toEqual(['v1', { sessionId: 's1', positionSeconds: 55, watchedSeconds: 30 }]);

    vi.advanceTimersByTime(5_000);
    handlers['timeupdate']({ seconds: 300, duration: 600 }); // seek forward: no extra time
    handlers['pause']();
    expect(api['reportProgress'].mock.calls[1]).toEqual(['v1', { sessionId: 's1', positionSeconds: 300, watchedSeconds: 5 }]);

    vi.advanceTimersByTime(60_000); // paused: no heartbeat report
    expect(api['reportProgress']).toHaveBeenCalledTimes(2);
  });

  it('opens a new session silently when the old one expired, keeping the player', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { fixture, page } = setup();
    await render(fixture);
    handlers['play']();
    vi.advanceTimersByTime(10_000);
    api['reportProgress'].mockReturnValueOnce(throwError(() => apiError(409, 'VIDEO_409_SESSION')));
    api['startPlayback'].mockReturnValueOnce(of({ ...playback('s2'), embedUrl: 'https://iframe.mediadelivery.net/embed/1/abc?token=new' }));
    const url = page.embedUrl();
    handlers['pause']();
    expect(api['startPlayback']).toHaveBeenCalledTimes(2);
    expect(page.embedUrl()).toBe(url);
    // The seconds of the failed report are sent again under the new session.
    expect(api['reportProgress'].mock.calls.at(-1)).toEqual(['v1', { sessionId: 's2', positionSeconds: 30, watchedSeconds: 10 }]);
    expect(page.state()).toBe('playing');
  });

  it('sends a final report and ends the session when leaving', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { fixture } = setup();
    await render(fixture);
    handlers['play']();
    vi.advanceTimersByTime(12_000);
    fixture.destroy();
    expect(api['reportProgress'].mock.calls.at(-1)).toEqual(['v1', { sessionId: 's1', positionSeconds: 30, watchedSeconds: 12 }]);
    expect(api['endSession']).toHaveBeenCalledWith('s1');
    expect(player.off).toHaveBeenCalled();
  });

  it('ends the old session when moving to the next lesson', () => {
    const { page } = setup();
    params.next(convertToParamMap({ id: 'v2' }));
    expect(api['endSession']).toHaveBeenCalledWith('s1');
    expect(api['detail']).toHaveBeenLastCalledWith('v2');
    expect(page.state()).toBe('playing');
  });
});
