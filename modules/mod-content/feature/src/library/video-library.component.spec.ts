import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { buildLibraryQuery, LibraryVideo, VideoLibraryApi } from '@yoga/mod-content/data-access';
import { VideoLibraryComponent } from './video-library.component';

const video = (id: string, patch: Partial<LibraryVideo> = {}): LibraryVideo => ({
  id, title: `Bài ${id}`, description: null, level: 'BEGINNER', durationSeconds: 754, instructorName: 'Lan', thumbnailUrl: null,
  tags: ['Hatha'], isFreePreview: false, locked: false, positionSeconds: 0, watchedSeconds: 0, completed: false, publishedAt: null, ...patch
});

describe('VideoLibraryComponent', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  function setup(opts: { hasPass?: boolean; inProgress?: LibraryVideo[] } = {}) {
    api = {
      access: vi.fn().mockReturnValue(of({ hasPass: opts.hasPass ?? false, passEndDate: null, waiverAccepted: true, waiverVersion: 'v1', maxDevices: 2 })),
      list: vi.fn((filters: { inProgress?: boolean }) => of(filters.inProgress
        ? { items: opts.inProgress ?? [], page: 0, size: 6, total: (opts.inProgress ?? []).length }
        : { items: [video('a', { locked: true }), video('b', { isFreePreview: true, positionSeconds: 377, completed: false }), video('c', { completed: true })], page: 0, size: 24, total: 50 })),
      collections: vi.fn().mockReturnValue(of([{ id: 'c1', title: 'Yoga 7 ngày', description: null, level: 'BEGINNER', total: 7, completed: 2, items: [] }])),
      tags: vi.fn().mockReturnValue(of([{ id: 't1', code: 'HATHA', name: 'Hatha', videoCount: 3 }]))
    };
    TestBed.configureTestingModule({
      imports: [VideoLibraryComponent],
      providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]), { provide: VideoLibraryApi, useValue: api }]
    });
    const fixture = TestBed.createComponent(VideoLibraryComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.componentInstance };
  }

  it('loads access, continue watching, collections, tags and the first page', () => {
    const { page } = setup();
    expect(api['list']).toHaveBeenCalledWith({ inProgress: true, size: 6 });
    expect(api['list']).toHaveBeenCalledWith({ level: null, tag: null, maxMinutes: null, q: null, page: 0, size: 24 });
    expect(page.tagOptions().map(o => o.value)).toEqual(['', 'HATHA']);
    expect(page.totalPages()).toBe(3);
  });

  it('builds the query from the filters and resets to the first page', () => {
    const { page } = setup();
    page.goToPage(2);
    expect(api['list'].mock.calls.at(-1)?.[0].page).toBe(2);
    page.setLevel('INTERMEDIATE');
    page.setTag('HATHA');
    page.setMaxMinutes(20);
    page.search(' thở ');
    const last = api['list'].mock.calls.at(-1)?.[0];
    expect(last).toEqual({ level: 'INTERMEDIATE', tag: 'HATHA', maxMinutes: 20, q: ' thở ', page: 0, size: 24 });
    expect(buildLibraryQuery(last)).toEqual({ level: 'INTERMEDIATE', tag: 'HATHA', maxMinutes: 20, q: 'thở', page: 0, size: 24 });
    page.clearFilters();
    expect(buildLibraryQuery(api['list'].mock.calls.at(-1)?.[0])).toEqual({ page: 0, size: 24 });
  });

  it('shows the package banner without a pass and hides an empty "continue watching"', () => {
    const { fixture } = setup({ hasPass: false });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('yoga-video-pass-banner')).not.toBeNull();
    expect(el.querySelector('a[href="/membership/plans"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Tiếp tục xem');
    expect(el.textContent).toContain('Yoga 7 ngày');
    expect(el.textContent).toContain('2/7');
  });

  it('renders cards with duration, lock, free badge, progress and completion', () => {
    const { fixture } = setup({ hasPass: true, inProgress: [video('b', { positionSeconds: 100 })] });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('yoga-video-pass-banner')).toBeNull();
    expect(el.textContent).toContain('Tiếp tục xem');
    expect(el.textContent).toContain('12:34');
    expect(el.querySelectorAll('.lock').length).toBe(1);
    expect(el.textContent).toContain('Miễn phí');
    expect(el.textContent).toContain('Đã xong');
    expect(el.querySelector('.progress span')?.getAttribute('style')).toContain('width');
  });
});
