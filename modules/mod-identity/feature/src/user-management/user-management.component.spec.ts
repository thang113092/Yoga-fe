import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { MembershipApi, PosApi } from '@yoga/mod-membership/data-access';
import { BookingApi } from '@yoga/mod-schedule/data-access';
import { ZenToastService } from '@yoga/platform/ui';
import { of } from 'rxjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserManagementComponent } from './user-management.component';

describe('UserManagementComponent', () => {
  const mockUsers: UserResponse[] = [
    {
      id: 'user-1',
      phone: '0988776655',
      email: 'quynhanh@gmail.com',
      fullName: 'Đinh Thị Quỳnh Anh',
      gender: 'FEMALE',
      dob: null as any,
      roleId: 'role-1',
      roleCode: 'INSTRUCTOR',
      roleName: 'Huấn luyện viên',
      homeBranchId: 'branch-1',
      branchName: 'Cơ sở Cầu Giấy',
      isActive: true,
      createdAt: '2026-10-05T15:42:00Z'
    },
    {
      id: 'user-2',
      phone: '0909333444',
      email: 'binh@gmail.com',
      fullName: 'Đoàn Thanh Bình',
      gender: 'MALE',
      dob: null as any,
      roleId: 'role-2',
      roleCode: 'STUDENT',
      roleName: 'Học viên',
      homeBranchId: 'branch-1',
      branchName: 'Cơ sở Cầu Giấy',
      isActive: false,
      createdAt: '2026-09-29T09:31:00Z'
    }
  ];

  let mockUserApi: any;
  let mockBranchApi: any;
  let mockMembershipApi: any;
  let mockPosApi: any;
  let mockBookingApi: any;
  let mockAuth: any;
  let mockToast: any;

  beforeEach(() => {
    mockUserApi = {
      getUsers: vi.fn(() => of(mockUsers)),
      updateUserStatus: vi.fn((userId: string, isActive: boolean) =>
        of({ ...mockUsers.find(u => u.id === userId)!, isActive })
      ),
      createUser: vi.fn()
    };

    mockBranchApi = {
      getAll: vi.fn(() => of([]))
    };

    mockMembershipApi = {
      getStudentMemberships: vi.fn(() => of([])),
      getAllPlans: vi.fn(() => of([]))
    };

    mockPosApi = {
      getStudentOrders: vi.fn(() => of([]))
    };

    mockBookingApi = {
      getStudentBookingDetails: vi.fn(() => of([]))
    };

    mockAuth = {
      isSuperAdmin: signal(true),
      isBranchManager: signal(false),
      isReceptionist: signal(false),
      currentUserId: signal('admin-id'),
      userHomeBranchId: signal('branch-1')
    };

    mockToast = {
      success: vi.fn(),
      error: vi.fn()
    };
  });

  function setupComponent() {
    TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: UserApi, useValue: mockUserApi },
        { provide: BranchApi, useValue: mockBranchApi },
        { provide: MembershipApi, useValue: mockMembershipApi },
        { provide: PosApi, useValue: mockPosApi },
        { provide: BookingApi, useValue: mockBookingApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: ZenToastService, useValue: mockToast }
      ]
    });
    const fixture = TestBed.createComponent(UserManagementComponent);
    fixture.detectChanges();
    return { fixture, comp: fixture.componentInstance };
  }

  it('renders gender column and formats gender correctly', async () => {
    const { fixture, comp } = setupComponent();
    await fixture.whenStable();

    expect(comp.formatGender('FEMALE')).toBe('Nữ');
    expect(comp.formatGender('MALE')).toBe('Nam');
    expect(comp.formatGender(undefined)).toBe('—');

    const headers = fixture.nativeElement.querySelectorAll('thead th');
    const headerTexts = Array.from(headers).map((h: any) => h.textContent.trim());
    expect(headerTexts).toContain('Giới Tính');
    expect(headerTexts).toContain('Thao Tác');

    const genderCells = fixture.nativeElement.querySelectorAll('.gender-cell');
    expect(genderCells.length).toBe(2);
    expect(genderCells[0].textContent.trim()).toBe('Nữ');
    expect(genderCells[1].textContent.trim()).toBe('Nam');
  });

  it('filters users by global search query', async () => {
    const { comp } = setupComponent();

    // No search -> all users
    expect(comp.filteredUsers().length).toBe(2);

    // Search by name
    comp.searchQuery.set('Quỳnh Anh');
    expect(comp.filteredUsers().length).toBe(1);
    expect(comp.filteredUsers()[0].fullName).toBe('Đinh Thị Quỳnh Anh');

    // Search by phone
    comp.searchQuery.set('0909');
    expect(comp.filteredUsers().length).toBe(1);
    expect(comp.filteredUsers()[0].phone).toBe('0909333444');

    // Search by email
    comp.searchQuery.set('binh@');
    expect(comp.filteredUsers().length).toBe(1);
    expect(comp.filteredUsers()[0].email).toBe('binh@gmail.com');

    // Search not found
    comp.searchQuery.set('khong-ton-tai');
    expect(comp.filteredUsers().length).toBe(0);
  });

  it('opens confirm popup and toggles lock/unlock user status', async () => {
    const { fixture, comp } = setupComponent();
    await fixture.whenStable();

    const activeUser = mockUsers[0];
    
    // Clicking lock button opens popup
    comp.openConfirmModal(activeUser);
    fixture.detectChanges();

    expect(comp.confirmTargetUser()).toEqual(activeUser);
    const confirmCard = fixture.nativeElement.querySelector('.modal-confirm-card');
    expect(confirmCard).toBeTruthy();
    expect(confirmCard.textContent).toContain('Khóa Tài Khoản Người Dùng');

    // Confirm action
    comp.executeConfirmToggleStatus();
    fixture.detectChanges();

    expect(mockUserApi.updateUserStatus).toHaveBeenCalledWith('user-1', false);
    expect(mockToast.success).toHaveBeenCalled();
    expect(comp.confirmTargetUser()).toBeNull();

    // Check user is updated in signal
    const updated = comp.users().find(u => u.id === 'user-1');
    expect(updated?.isActive).toBe(false);

    // Cancel modal flow
    const inactiveUser = comp.users().find(u => u.id === 'user-2')!;
    comp.openConfirmModal(inactiveUser);
    expect(comp.confirmTargetUser()).toEqual(inactiveUser);
    comp.closeConfirmModal();
    expect(comp.confirmTargetUser()).toBeNull();
  });

  it('provides proper branch filter options and management permissions for Branch Manager', async () => {
    mockAuth.isSuperAdmin.set(false);
    mockAuth.isBranchManager.set(true);
    mockAuth.userHomeBranchId.set('branch-1');

    const { comp } = setupComponent();
    comp.branches.set([
      { id: 'branch-1', name: 'Cơ sở Cầu Giấy', code: 'CG' } as any,
      { id: 'branch-2', name: 'Cơ sở Hoàn Kiếm', code: 'HK' } as any
    ]);

    const opts = comp.branchFilterOptions();
    expect(opts.length).toBe(3);
    expect(opts[0].value).toBe('');
    expect(opts[0].label).toContain('Chi nhánh của tôi & Chưa phân chi nhánh');
    expect(opts[1].value).toBe('branch-1');
    expect(opts[2].value).toBe('UNASSIGNED');

    // User of own branch with STUDENT role -> can manage
    expect(comp.canManageUser({
      id: 'student-own',
      roleCode: 'STUDENT',
      homeBranchId: 'branch-1'
    } as any)).toBe(true);

    // User with no branch (unassigned) and STUDENT role -> can manage
    expect(comp.canManageUser({
      id: 'student-unassigned',
      roleCode: 'STUDENT',
      homeBranchId: null as any
    } as any)).toBe(true);

    // User of another branch -> cannot manage
    expect(comp.canManageUser({
      id: 'student-other',
      roleCode: 'STUDENT',
      homeBranchId: 'branch-2'
    } as any)).toBe(false);

    // Super Admin -> cannot manage
    expect(comp.canManageUser({
      id: 'admin-unassigned',
      roleCode: 'SUPER_ADMIN',
      homeBranchId: null as any
    } as any)).toBe(false);
  });

  it('renders unassigned branch label correctly in template', async () => {
    const unassignedUser: UserResponse = {
      id: 'user-unassigned',
      phone: '0912345678',
      email: 'test@unassigned.com',
      fullName: 'Trần Văn Chưa Phân',
      gender: 'MALE',
      dob: null as any,
      roleId: 'role-2',
      roleCode: 'STUDENT',
      roleName: 'Học viên',
      homeBranchId: null as any,
      branchName: null as any,
      isActive: true,
      createdAt: '2026-10-06T10:00:00Z'
    };

    mockUserApi.getUsers = vi.fn(() => of([unassignedUser]));

    const { fixture } = setupComponent();
    await fixture.whenStable();

    const branchCell = fixture.nativeElement.querySelector('.branch-name');
    expect(branchCell).toBeTruthy();
    expect(branchCell.textContent.trim()).toBe('Chưa phân chi nhánh');
    expect(branchCell.classList.contains('unassigned')).toBe(true);
  });

  it('renders detail button with exclamation icon for student and opens detail modal with tabs', async () => {
    const { fixture, comp } = setupComponent();
    await fixture.whenStable();

    // Check detail buttons in table: only user-2 (STUDENT) should have detail button
    const detailButtons = fixture.nativeElement.querySelectorAll('.btn-detail');
    expect(detailButtons.length).toBe(1);

    const studentUser = mockUsers[1]; // STUDENT
    comp.openStudentDetail(studentUser);
    fixture.detectChanges();

    expect(comp.selectedStudent()).toEqual(studentUser);
    expect(mockPosApi.getStudentOrders).toHaveBeenCalledWith(studentUser.id);
    expect(mockBookingApi.getStudentBookingDetails).toHaveBeenCalledWith(studentUser.id);

    // Modal dialog is rendered
    const modal = fixture.nativeElement.querySelector('.modal-detail-card');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Đoàn Thanh Bình');
    expect(modal.textContent).toContain('Thông Tin Cá Nhân');
    expect(modal.textContent).toContain('Lịch Sử Mua Thẻ');
    expect(modal.textContent).toContain('Lịch Sử Tập Luyện');

    // Tab switching
    comp.activeStudentTab.set('orders');
    fixture.detectChanges();
    expect(comp.activeStudentTab()).toBe('orders');

    comp.activeStudentTab.set('history');
    fixture.detectChanges();
    expect(comp.activeStudentTab()).toBe('history');

    // Close modal
    comp.closeStudentDetail();
    fixture.detectChanges();
    expect(comp.selectedStudent()).toBeNull();
  });

  it('configures UI for receptionist: student title, no role filter, student create modal without branch', async () => {
    mockAuth.isSuperAdmin.set(false);
    mockAuth.isBranchManager.set(false);
    mockAuth.isReceptionist.set(true);

    const { fixture, comp } = setupComponent();
    await fixture.whenStable();

    // Check header title for receptionist
    const headerTitle = fixture.nativeElement.querySelector('.mgmt-header h2');
    expect(headerTitle.textContent.trim()).toBe('Danh Sách Học Viên');

    // Check create button text for receptionist
    const createBtn = fixture.nativeElement.querySelector('.btn-create-user');
    expect(createBtn.textContent.trim()).toContain('Thêm Mới Học Viên');

    // Role filter should NOT be in the DOM for receptionist
    const roleFilter = fixture.nativeElement.querySelector('#filterRole');
    expect(roleFilter).toBeNull();

    // Default filterRoleCode is STUDENT
    expect(comp.filterRoleCode()).toBe('STUDENT');

    // Open create modal
    comp.openCreateModal();
    fixture.detectChanges();

    expect(comp.newRoleCode()).toBe('STUDENT');
    expect(comp.newBranchId()).toBe('');

    // Fill student info without selecting a branch
    comp.newFullName.set('Nguyễn Văn Mới');
    comp.newPhone.set('0988112233');
    comp.newPassword.set('12345678');
    comp.newEmail.set('hocvien.moi@an-yen.vn');
    comp.newGender.set('MALE');

    mockUserApi.createUser = vi.fn(() => of({
      id: 'new-id',
      fullName: 'Nguyễn Văn Mới',
      roleCode: 'STUDENT',
      roleName: 'Học viên',
      homeBranchId: null
    }));

    comp.submitCreateUser();

    expect(mockUserApi.createUser).toHaveBeenCalledWith({
      fullName: 'Nguyễn Văn Mới',
      phone: '0988112233',
      password: '12345678',
      email: 'hocvien.moi@an-yen.vn',
      gender: 'MALE',
      dob: undefined,
      roleCode: 'STUDENT',
      homeBranchId: undefined // Branch is not required!
    });
    expect(comp.errorMessage()).toBeNull();
  });
});
