import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { ScheduleApi } from '@yoga/mod-schedule/data-access';
import { AdminVideo, VideoAdminApi, VideoStatus } from '@yoga/mod-content/data-access';
import { TUS_LOADER, TusUploadOptions } from '../shared/video-loaders';
import { TUS_RETRY_DELAYS, VideoManageComponent } from './video-manage.component';

const adminVideo = (id: string, status: VideoStatus, patch: Partial<AdminVideo> = {}): AdminVideo => ({
  id, title: `Video ${id}`, description: null, level: 'BEGINNER', durationSeconds: status === 'DRAFT' || status === 'PROCESSING' ? null : 600,
  instructorId: 'i1', instructorName: 'Lan', classTypeId: null, status, processingError: status === 'FAILED' ? 'Bad codec' : null,
  isFreePreview: false, notForPregnancy: false, notForHeartBp: false, notForInjuries: false, contraindications: null, thumbnailUrl: null,
  tagIds: [], createdBy: 'i1', publishedAt: null, createdAt: null, updatedAt: null, viewers: 0, canEdit: true, ...patch
});

describe('VideoManageComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let tusOptions: TusUploadOptions | null;
  let tusStart: ReturnType<typeof vi.fn>;
  let tusFactory: ReturnType<typeof vi.fn>;
  const videos = [
    adminVideo('d', 'DRAFT'), adminVideo('p', 'PROCESSING'), adminVideo('r', 'READY'),
    adminVideo('pub', 'PUBLISHED'), adminVideo('a', 'ARCHIVED'), adminVideo('f', 'FAILED')
  ];

  function setup(role: 'SUPER_ADMIN' | 'INSTRUCTOR') {
    tusOptions = null;
    tusStart = vi.fn();
    tusFactory = vi.fn((_file: File, options: TusUploadOptions) => { tusOptions = options; return { start: tusStart, abort: vi.fn() }; });
    api = {
      list: vi.fn().mockReturnValue(of(videos)),
      tags: vi.fn().mockReturnValue(of([{ id: 't1', code: 'HATHA', name: 'Hatha', videoCount: 0 }])),
      create: vi.fn((req: { title: string }) => of(adminVideo('new', 'DRAFT', { title: req.title }))),
      update: vi.fn(), delete: vi.fn().mockReturnValue(of(undefined)),
      uploadSession: vi.fn().mockReturnValue(of({
        videoId: 'd', endpoint: 'https://video.bunnycdn.com/tusupload', libraryId: '123', providerVideoId: 'guid-1',
        signature: 'sig', expiresEpochSeconds: 1900000000
      })),
      refresh: vi.fn().mockReturnValue(of(adminVideo('d', 'READY'))),
      publish: vi.fn().mockReturnValue(of(adminVideo('r', 'PUBLISHED'))),
      unpublish: vi.fn(), archive: vi.fn(), restore: vi.fn(), preview: vi.fn(), createTag: vi.fn(), deleteTag: vi.fn()
    };
    TestBed.configureTestingModule({
      imports: [VideoManageComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: VideoAdminApi, useValue: api },
        { provide: ScheduleApi, useValue: { getInstructors: vi.fn().mockReturnValue(of([{ id: 'i1', fullName: 'Lan', phone: '0900' }])) } },
        { provide: TUS_LOADER, useValue: () => Promise.resolve(tusFactory) },
        { provide: ZenToastService, useValue: { success: vi.fn(), error: vi.fn(), info: vi.fn() } },
        { provide: ZenConfirmService, useValue: { confirm: vi.fn().mockResolvedValue(true), confirmDelete: vi.fn().mockResolvedValue(true) } },
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: () => role === 'SUPER_ADMIN', isBranchManager: () => false, isInstructor: () => role === 'INSTRUCTOR',
            currentUserId: () => 'i1'
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(VideoManageComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }

  const actionsOf = (el: HTMLElement, id: string) =>
    Array.from(el.querySelectorAll(`tr[data-video-id="${id}"] [data-action]`)).map(b => b.getAttribute('data-action'));

  it('offers manager actions per status', () => {
    const { fixture } = setup('SUPER_ADMIN');
    const el: HTMLElement = fixture.nativeElement;
    expect(actionsOf(el, 'd')).toEqual(['upload', 'edit', 'archive', 'delete']);
    expect(actionsOf(el, 'p')).toEqual(['upload', 'refresh', 'edit']);
    expect(actionsOf(el, 'r')).toEqual(['publish', 'preview', 'edit', 'archive']);
    expect(actionsOf(el, 'pub')).toEqual(['preview', 'unpublish', 'edit', 'archive']);
    expect(actionsOf(el, 'a')).toEqual(['preview', 'restore']);
    expect(actionsOf(el, 'f')).toEqual(['upload', 'refresh', 'preview', 'edit', 'archive', 'delete']);
    expect(el.textContent).toContain('Bad codec');
    expect(el.textContent).toContain('Đã xuất bản');
  });

  it('limits an instructor to editing, uploading and previewing their own videos', () => {
    const { fixture, page } = setup('INSTRUCTOR');
    const el: HTMLElement = fixture.nativeElement;
    expect(actionsOf(el, 'r')).toEqual(['preview', 'edit']);
    expect(actionsOf(el, 'd')).toEqual(['upload', 'edit', 'delete']);
    expect(page.actions(adminVideo('x', 'PUBLISHED', { canEdit: false })).size).toBe(0);
    expect(page.canManage()).toBe(false);
    expect(el.textContent).not.toContain('Lộ trình');
  });

  it('does not send manager-only fields for an instructor', () => {
    const { page } = setup('INSTRUCTOR');
    page.openCreate();
    page.patchForm({ title: '  Yin thư giãn ', isFreePreview: true, instructorId: 'other', notForPregnancy: true });
    page.toggleTag('t1');
    page.submit();
    const req = api['create'].mock.calls[0][0];
    expect(req).toMatchObject({ title: 'Yin thư giãn', notForPregnancy: true, tagIds: ['t1'] });
    expect('isFreePreview' in req).toBe(false);
    expect('instructorId' in req).toBe(false);
  });

  it('uploads with tus straight to Bunny using the upload session', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const { page } = setup('SUPER_ADMIN');
      const file = new File(['x'], 'lesson.mp4', { type: 'video/mp4' });
      await page.upload(videos[0], file);
      expect(api['uploadSession']).toHaveBeenCalledWith('d');
      expect(tusFactory).toHaveBeenCalledWith(file, expect.anything());
      expect(tusOptions).toMatchObject({
        endpoint: 'https://video.bunnycdn.com/tusupload',
        retryDelays: TUS_RETRY_DELAYS,
        headers: { AuthorizationSignature: 'sig', AuthorizationExpire: '1900000000', VideoId: 'guid-1', LibraryId: '123' },
        metadata: { filetype: 'video/mp4', title: 'Video d' }
      });
      expect(tusStart).toHaveBeenCalled();

      tusOptions!.onProgress(50, 200);
      expect(page.uploads()['d']).toEqual({ phase: 'uploading', percent: 25 });

      api['refresh'].mockReturnValueOnce(of(adminVideo('d', 'PROCESSING')));
      tusOptions!.onSuccess();
      expect(api['refresh']).toHaveBeenCalledTimes(1);
      expect(page.uploads()['d'].phase).toBe('processing');
      vi.advanceTimersByTime(10_000);
      expect(api['refresh']).toHaveBeenCalledTimes(2);
      expect(page.uploads()['d']).toBeUndefined();
      expect(page.videos().find(v => v.id === 'd')?.status).toBe('READY');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a non-video file without asking for an upload session', async () => {
    const { page } = setup('SUPER_ADMIN');
    await page.upload(videos[0], new File(['x'], 'notes.pdf', { type: 'application/pdf' }));
    expect(api['uploadSession']).not.toHaveBeenCalled();
  });

  it('publishes a ready video', () => {
    const { page } = setup('SUPER_ADMIN');
    page.publish(videos[2]);
    expect(api['publish']).toHaveBeenCalledWith('r');
    expect(page.videos().find(v => v.id === 'r')?.status).toBe('PUBLISHED');
  });
});
