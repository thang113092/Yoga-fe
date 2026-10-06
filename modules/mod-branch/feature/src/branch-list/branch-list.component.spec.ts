import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BranchListComponent } from './branch-list.component';
import { AuthService } from '@yoga/platform/auth';
import { Branch, BranchApi, Room } from '@yoga/mod-branch/data-access';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('BranchListComponent', () => {
  let component: BranchListComponent;
  let fixture: ComponentFixture<BranchListComponent>;

  const mockBranches: Branch[] = [
    {
      id: 'branch-1',
      code: 'CS01',
      name: 'An Yên – Hoàn Kiếm',
      address: '12 Hàng Bông, Hoàn Kiếm, Hà Nội',
      phone: '024 3828 9999',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      roomCount: 2
    },
    {
      id: 'branch-2',
      code: 'CS02',
      name: 'An Yên – Ba Đình',
      address: '10 Liễu Giai, Ba Đình, Hà Nội',
      phone: '024 3999 8888',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      roomCount: 1
    }
  ];

  const mockRooms: Room[] = [
    {
      id: 'room-1',
      branchId: 'branch-1',
      name: 'Phòng Sen Hồng',
      floor: 'Tầng 2',
      maxCapacity: 20,
      isActive: true
    },
    {
      id: 'room-2',
      branchId: 'branch-1',
      name: 'Phòng Bồ Đề',
      floor: 'Tầng 3',
      maxCapacity: 15,
      isActive: false
    }
  ];

  const mockBranchApi = {
    getAll: vi.fn().mockReturnValue(of(mockBranches)),
    create: vi.fn().mockReturnValue(of(mockBranches[0])),
    update: vi.fn().mockReturnValue(of(mockBranches[0])),
    delete: vi.fn().mockReturnValue(of(undefined)),
    getRooms: vi.fn().mockReturnValue(of(mockRooms)),
    createRoom: vi.fn().mockReturnValue(of(mockRooms[0])),
    updateRoom: vi.fn().mockReturnValue(of(mockRooms[0])),
    deleteRoom: vi.fn().mockReturnValue(of(undefined))
  };

  const mockAuthService = {
    isSuperAdmin: vi.fn().mockReturnValue(true),
    isAuthenticated: vi.fn().mockReturnValue(true)
  };

  const mockConfirmService = {
    confirmDelete: vi.fn().mockResolvedValue(true)
  };

  const mockToastService = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [BranchListComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: BranchApi, useValue: mockBranchApi },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ZenConfirmService, useValue: mockConfirmService },
        { provide: ZenToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BranchListComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and load branches', () => {
    component.ngOnInit();
    expect(mockBranchApi.getAll).toHaveBeenCalled();
    expect(component.branches().length).toBe(2);
    expect(component.isLoading()).toBe(false);
  });

  it('should filter branches by search query', () => {
    component.branches.set(mockBranches);
    component.searchQuery.set('Hoàn Kiếm');
    expect(component.filteredBranches().length).toBe(1);
    expect(component.filteredBranches()[0].code).toBe('CS01');

    component.searchQuery.set('Không tồn tại');
    expect(component.filteredBranches().length).toBe(0);
  });

  it('should open rooms modal and load rooms for selected branch', () => {
    const branch = mockBranches[0];
    component.openRoomsModal(branch);

    expect(component.isRoomsModalOpen()).toBe(true);
    expect(component.selectedBranchForRooms()).toEqual(branch);
    expect(mockBranchApi.getRooms).toHaveBeenCalledWith('branch-1', true);
    expect(component.branchRooms().length).toBe(2);
  });

  it('should close rooms modal and reset room state', () => {
    component.openRoomsModal(mockBranches[0]);
    component.closeRoomsModal();

    expect(component.isRoomsModalOpen()).toBe(false);
    expect(component.selectedBranchForRooms()).toBeNull();
    expect(component.branchRooms().length).toBe(0);
  });

  it('should open create branch modal with empty fields', () => {
    component.openCreateBranchModal();

    expect(component.isBranchModalOpen()).toBe(true);
    expect(component.isEditingBranch()).toBe(false);
    expect(component.bFormCode()).toBe('');
    expect(component.bFormName()).toBe('');
  });

  it('should open edit branch modal with populated fields', () => {
    const branch = mockBranches[0];
    component.openEditBranchModal(branch);

    expect(component.isBranchModalOpen()).toBe(true);
    expect(component.isEditingBranch()).toBe(true);
    expect(component.editingBranchId()).toBe('branch-1');
    expect(component.bFormCode()).toBe('CS01');
    expect(component.bFormName()).toBe(branch.name);
  });

  it('should submit create branch successfully', () => {
    component.openCreateBranchModal();
    component.bFormCode.set('CS03');
    component.bFormName.set('An Yên – Cầu Giấy');
    component.bFormAddress.set('50 Xuân Thủy, Cầu Giấy');
    component.bFormPhone.set('024 3333 4444');

    component.submitBranch();

    expect(mockBranchApi.create).toHaveBeenCalled();
    expect(mockToastService.success).toHaveBeenCalled();
    expect(component.isBranchModalOpen()).toBe(false);
  });

  it('should submit edit branch successfully', () => {
    component.openEditBranchModal(mockBranches[0]);
    component.bFormName.set('An Yên – Hoàn Kiếm Mới');

    component.submitBranch();

    expect(mockBranchApi.update).toHaveBeenCalledWith('branch-1', expect.objectContaining({
      name: 'An Yên – Hoàn Kiếm Mới'
    }));
    expect(mockToastService.success).toHaveBeenCalled();
  });

  it('should confirm and delete branch when super admin requests', async () => {
    await component.confirmDeleteBranch(mockBranches[0]);

    expect(mockConfirmService.confirmDelete).toHaveBeenCalled();
    expect(mockBranchApi.delete).toHaveBeenCalledWith('branch-1');
    expect(mockToastService.success).toHaveBeenCalled();
  });

  it('should render the room form defaults and submit button', async () => {
    component.openRoomsModal(mockBranches[0]);
    component.openCreateRoomModal();
    fixture.detectChanges();
    await fixture.whenStable();

    const modal = fixture.nativeElement.querySelector('.modal-room-card');
    expect(modal.querySelector('button[type="submit"]').textContent.trim()).toBe('Tạo Phòng Mới');
    expect(modal.querySelector('#rCapacity input').value).toBe('20');
    expect(modal.querySelector('input[type="checkbox"]').checked).toBe(true);
  });

  it('should open create room modal and submit new room', () => {
    component.openRoomsModal(mockBranches[0]);
    component.openCreateRoomModal();

    expect(component.isRoomModalOpen()).toBe(true);
    expect(component.isEditingRoom()).toBe(false);

    component.rFormName.set('Phòng Trúc Xanh');
    component.rFormFloor.set('Tầng 4');
    component.rFormMaxCapacity.set(18);

    component.submitRoom();

    expect(mockBranchApi.createRoom).toHaveBeenCalledWith('branch-1', {
      name: 'Phòng Trúc Xanh',
      floor: 'Tầng 4',
      maxCapacity: 18,
      isActive: true
    });
    expect(mockToastService.success).toHaveBeenCalled();
    expect(component.isRoomModalOpen()).toBe(false);
  });

  it('should open edit room modal and submit updated room', () => {
    component.openRoomsModal(mockBranches[0]);
    const room = mockRooms[0];
    component.openEditRoomModal(room);

    expect(component.isRoomModalOpen()).toBe(true);
    expect(component.isEditingRoom()).toBe(true);
    expect(component.editingRoomId()).toBe('room-1');

    component.rFormName.set('Phòng Sen Hồng VIP');
    component.submitRoom();

    expect(mockBranchApi.updateRoom).toHaveBeenCalledWith('room-1', expect.objectContaining({
      name: 'Phòng Sen Hồng VIP'
    }));
    expect(mockToastService.success).toHaveBeenCalled();
  });

  it('should confirm and delete room when super admin requests', async () => {
    component.openRoomsModal(mockBranches[0]);
    const room = mockRooms[0];

    await component.confirmDeleteRoom(room);

    expect(mockConfirmService.confirmDelete).toHaveBeenCalled();
    expect(mockBranchApi.deleteRoom).toHaveBeenCalledWith('room-1');
    expect(mockToastService.success).toHaveBeenCalled();
  });
});
