import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { buildLibraryQuery, VideoAdminApi, VideoLibraryApi } from './video.api';
import { videoErrorCode, videoErrorMessage } from './video-errors';

describe('video data-access', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideExperimentalZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const wrap = <T>(data: T) => ({ code: 'OK', success: true, message: 'ok', data });

  it('builds the library query without empty filters', () => {
    expect(buildLibraryQuery({})).toEqual({ page: 0, size: 24 });
    expect(buildLibraryQuery({ level: 'BEGINNER', tag: 'HATHA', maxMinutes: 20, q: '  thở ', page: 2, size: 12 }))
      .toEqual({ level: 'BEGINNER', tag: 'HATHA', maxMinutes: 20, q: 'thở', page: 2, size: 12 });
    expect(buildLibraryQuery({ level: '', tag: null, maxMinutes: 0, q: '   ', inProgress: true, size: 6 }))
      .toEqual({ inProgress: true, page: 0, size: 6 });
  });

  it('lists the library with filters and unwraps the page', () => {
    const api = TestBed.inject(VideoLibraryApi);
    let total = -1;
    api.list({ level: 'ADVANCED', maxMinutes: 30, page: 1 }).subscribe(p => total = p.total);
    const req = http.expectOne(r => r.url === '/api/v1/me/videos');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('level')).toBe('ADVANCED');
    expect(req.request.params.get('maxMinutes')).toBe('30');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('tag')).toBe(false);
    req.flush(wrap({ items: [], page: 1, size: 24, total: 7 }));
    expect(total).toBe(7);
  });

  it('calls the student playback endpoints', () => {
    const api = TestBed.inject(VideoLibraryApi);
    let sessionId = '';
    api.startPlayback('v1', 'dev-1').subscribe(p => sessionId = p.sessionId);
    const start = http.expectOne('/api/v1/me/videos/v1/playback');
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toEqual({ deviceKey: 'dev-1' });
    start.flush(wrap({ sessionId: 's1', embedUrl: 'https://iframe.mediadelivery.net/embed/1/2' }));
    expect(sessionId).toBe('s1');

    api.reportProgress('v1', { sessionId: 's1', positionSeconds: 40, watchedSeconds: 30 }).subscribe();
    const progress = http.expectOne('/api/v1/me/videos/v1/progress');
    expect(progress.request.method).toBe('PUT');
    expect(progress.request.body).toEqual({ sessionId: 's1', positionSeconds: 40, watchedSeconds: 30 });
    progress.flush(wrap({ positionSeconds: 40, watchedSeconds: 30, completed: false }));

    api.endSession('s1').subscribe();
    expect(http.expectOne('/api/v1/me/playback-sessions/s1/end').request.method).toBe('POST');

    api.acceptWaiver().subscribe();
    expect(http.expectOne('/api/v1/me/video-waiver').request.method).toBe('POST');
    api.access().subscribe();
    http.expectOne('/api/v1/me/video-access').flush(wrap({ hasPass: true }));
    api.collection('c1').subscribe();
    http.expectOne('/api/v1/me/video-collections/c1').flush(wrap({ id: 'c1', items: [] }));
    api.tags().subscribe();
    http.expectOne('/api/v1/video-tags').flush(wrap([]));
  });

  it('calls the management endpoints', () => {
    const api = TestBed.inject(VideoAdminApi);
    api.list('PUBLISHED', ' yin ').subscribe();
    const list = http.expectOne(r => r.url === '/api/v1/videos');
    expect(list.request.params.get('status')).toBe('PUBLISHED');
    expect(list.request.params.get('q')).toBe('yin');
    list.flush(wrap([]));

    api.list().subscribe();
    const all = http.expectOne(r => r.url === '/api/v1/videos');
    expect(all.request.params.keys()).toEqual([]);
    all.flush(wrap([]));

    for (const action of ['upload-session', 'refresh', 'publish', 'unpublish', 'archive', 'restore', 'preview'] as const) {
      const call = {
        'upload-session': () => api.uploadSession('v1'), refresh: () => api.refresh('v1'), publish: () => api.publish('v1'),
        unpublish: () => api.unpublish('v1'), archive: () => api.archive('v1'), restore: () => api.restore('v1'), preview: () => api.preview('v1')
      }[action];
      call().subscribe();
      expect(http.expectOne(`/api/v1/videos/v1/${action}`).request.method).toBe('POST');
    }
    api.delete('v1').subscribe();
    expect(http.expectOne('/api/v1/videos/v1').request.method).toBe('DELETE');
    api.updateCollection('c1', { title: 'Lộ trình', videoIds: ['a', 'b'] }).subscribe();
    const put = http.expectOne('/api/v1/video-collections/c1');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.videoIds).toEqual(['a', 'b']);
    api.createTag({ code: 'YIN', name: 'Yin' }).subscribe();
    expect(http.expectOne('/api/v1/video-tags').request.method).toBe('POST');
    api.deleteTag('t1').subscribe();
    expect(http.expectOne('/api/v1/video-tags/t1').request.method).toBe('DELETE');
  });

  it('reads the API error code and message', () => {
    const err = new HttpErrorResponse({ status: 409, error: { code: 'VIDEO_409_DEVICES', success: false, message: 'Tối đa thiết bị' } });
    expect(videoErrorCode(err)).toBe('VIDEO_409_DEVICES');
    expect(videoErrorMessage(err, 'x')).toBe('Tối đa thiết bị');
    expect(videoErrorCode(new HttpErrorResponse({ status: 0 }))).toBeNull();
    expect(videoErrorMessage(null, 'Lỗi')).toBe('Lỗi');
  });
});
