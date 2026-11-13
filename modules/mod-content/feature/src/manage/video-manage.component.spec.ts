import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { ScheduleApi } from '@yoga/mod-schedule/data-access';
import { AdminVideo, VideoAdminApi, VideoAiApi, VideoStatus, VideoTagSuggestion } from '@yoga/mod-content/data-access';
import { TUS_LOADER, TusUploadOptions } from '../shared/video-loaders';
import { mergeSuggestion, TUS_RETRY_DELAYS, VideoForm, VideoManageComponent } from './video-manage.component';

const adminVideo = (id: string, status: VideoStatus, patch: Partial<AdminVideo> = {}): AdminVideo => ({
  id, title: `Video ${id}`, description: null, level: 'BEGINNER', durationSeconds: status === 'DRAFT' || status === 'PROCESSING' ? null : 600,
  instructorId: 'i1', instructorName: 'Lan', classTypeId: null, status, processingError: status === 'FAILED' ? 'Bad codec' : null,
  isFreePreview: false, notForPregnancy: false, notForHeartBp: false, notForInjuries: false, contraindications: null, thumbnailUrl: null,
  tagIds: [], createdBy: 'i1', publishedAt: null, createdAt: null, updatedAt: null, viewers: 0, canEdit: true, ...patch
});

const suggestion = (patch: Partial<VideoTagSuggestion> = {}): VideoTagSuggestion => ({
  id: 's1', videoId: 'r', tagIds: ['t1'], tagCodes: ['HATHA'], level: 'BEGINNER', description: 'Bài Hatha nhẹ nhàng cho người mới.',
  contraindications: 'Tránh khi đau lưng cấp.', notForPregnancy: false, notForHeartBp: true, notForInjuries: false, model: 'm', ...patch
});

describe('VideoManageComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;
  let aiApi: Record<string, ReturnType<typeof vi.fn>>;
  let tusOptions: TusUploadOptions | null;
  let tusStart: ReturnType<typeof vi.fn>;
  let tusFactory: ReturnType<typeof vi.fn>;
  const videos = [
    adminVideo('d', 'DRAFT'), adminVideo('p', 'PROCESSING'), adminVideo('r', 'READY'),
    adminVideo('pub', 'PUBLISHED'), adminVideo('a', 'ARCHIVED'), adminVideo('f', 'FAILED')
  ];

  function setup(role: 'SUPER_ADMIN' | 'INSTRUCTOR', aiOn = false) {
    aiApi = {
      status: vi.fn().mockReturnValue(of({ videoTagging: aiOn })),
      suggestTags: vi.fn().mockReturnValue(of(suggestion())),
      review: vi.fn().mockReturnValue(of(undefined))
    };
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
        { provide: VideoAiApi, useValue: aiApi },
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

  it('hides the AI box when the feature is off or the video is new', () => {
    const off = setup('SUPER_ADMIN');
    off.page.openEdit(videos[2]);
    off.fixture.detectChanges();
    expect(document.body.querySelector('[data-action="ai-suggest"]')).toBeNull();
    TestBed.resetTestingModule();

    const on = setup('SUPER_ADMIN', true);
    on.page.openCreate();
    on.fixture.detectChanges();
    expect(document.body.querySelector('[data-action="ai-suggest"]')).toBeNull();
    on.page.openEdit(videos[2]);
    on.fixture.detectChanges();
    expect(on.fixture.nativeElement.querySelector('[data-action="ai-suggest"]') ?? document.body.querySelector('[data-action="ai-suggest"]')).not.toBeNull();
  });

  it('asks AI with the unsaved form text and fills the form on apply', () => {
    const { page } = setup('INSTRUCTOR', true);
    page.openEdit(videos[2]);
    page.patchForm({ title: ' Hatha cho người mới ', description: '' });
    page.suggestWithAi();
    expect(aiApi['suggestTags']).toHaveBeenCalledWith('r', 'Hatha cho người mới', '');
    expect(page.aiSuggestion()?.id).toBe('s1');

    page.applySuggestion();
    expect(page.form()).toMatchObject({
      level: 'BEGINNER', description: 'Bài Hatha nhẹ nhàng cho người mới.', tagIds: ['t1'], notForHeartBp: true,
      contraindications: 'Tránh khi đau lưng cấp.'
    });
    expect(aiApi['review']).toHaveBeenCalledWith('s1', 'APPLIED');
    expect(page.aiSuggestion()).toBeNull();
    expect(api['update']).not.toHaveBeenCalled();
  });

  it('records a dismissed or abandoned suggestion as rejected', () => {
    const { page } = setup('SUPER_ADMIN', true);
    page.openEdit(videos[2]);
    page.suggestWithAi();
    page.closeForm();
    expect(aiApi['review']).toHaveBeenCalledWith('s1', 'REJECTED');
  });

  it('needs a title before asking AI', () => {
    const { page } = setup('SUPER_ADMIN', true);
    page.openEdit(videos[2]);
    page.patchForm({ title: '  ' });
    page.suggestWithAi();
    expect(aiApi['suggestTags']).not.toHaveBeenCalled();
    expect(page.aiError()).toContain('tiêu đề');
  });

  it('shows the server message when AI fails', () => {
    const { page } = setup('SUPER_ADMIN', true);
    aiApi['suggestTags'].mockReturnValue(throwError(() => ({ error: { code: 'AI_429_QUOTA', message: 'Bạn đã dùng hết lượt AI hôm nay.' } })));
    page.openEdit(videos[2]);
    page.suggestWithAi();
    expect(page.aiLoading()).toBe(false);
    expect(page.aiError()).toBe('Bạn đã dùng hết lượt AI hôm nay.');
  });
});

describe('mergeSuggestion', () => {
  const form: VideoForm = {
    title: 'T', description: 'Mô tả của HLV', level: 'ADVANCED', instructorId: '', isFreePreview: false,
    notForPregnancy: true, notForHeartBp: false, notForInjuries: false, contraindications: 'Không tập khi sốt.', tagIds: ['t2']
  };

  it('keeps what staff entered and only adds safety', () => {
    const merged = mergeSuggestion(form, suggestion({ notForPregnancy: false, description: null }));
    expect(merged.tagIds).toEqual(['t2', 't1']);
    expect(merged.notForPregnancy).toBe(true);
    expect(merged.notForHeartBp).toBe(true);
    expect(merged.description).toBe('Mô tả của HLV');
    expect(merged.level).toBe('BEGINNER');
    expect(merged.contraindications).toBe('Không tập khi sốt.\nTránh khi đau lưng cấp.');
  });

  it('does not repeat a note that is already there', () => {
    const merged = mergeSuggestion({ ...form, contraindications: 'Tránh khi đau lưng cấp.' }, suggestion());
    expect(merged.contraindications).toBe('Tránh khi đau lưng cấp.');
  });
});
