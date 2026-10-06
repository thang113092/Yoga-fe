import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, CreateUserReq, UserApi, UserResponse } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenInputComponent, ZenSearchComponent, ZenToastService } from '@yoga/platform/ui';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { MembershipApi, PosApi, MembershipResp, StudentOrderHistoryResp } from '@yoga/mod-membership/data-access';
import { BookingApi, StudentBookingDetail } from '@yoga/mod-schedule/data-access';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface RoleOption {
  code: string;
  name: string;
  desc: string;
}

@Component({
  selector: 'yoga-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenSelectComponent, ZenInputComponent, ZenSearchComponent],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementComponent implements OnInit {
  private readonly userApi = inject(UserApi);
  private readonly branchApi = inject(BranchApi);
  private readonly membershipApi = inject(MembershipApi);
  private readonly posApi = inject(PosApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly toast = inject(ZenToastService);
  protected readonly auth = inject(AuthService);

  // State signals
  readonly users = signal<UserResponse[]>([]);
  readonly branches = signal<Branch[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isCreating = signal<boolean>(false);
  readonly updatingUserId = signal<string | null>(null);
  readonly confirmTargetUser = signal<UserResponse | null>(null);

  // Student Detail Dialog signals
  readonly selectedStudent = signal<UserResponse | null>(null);
  readonly activeStudentTab = signal<'profile' | 'orders' | 'history'>('profile');
  readonly isDetailLoading = signal<boolean>(false);
  readonly studentMemberships = signal<MembershipResp[]>([]);
  readonly studentOrders = signal<StudentOrderHistoryResp[]>([]);
  readonly studentBookings = signal<StudentBookingDetail[]>([]);
  readonly membershipPlansMap = signal<Map<string, string>>(new Map());

  // Filter signals
  readonly searchQuery = signal<string>('');
  readonly filterBranchId = signal<string>('');
  readonly filterRoleCode = signal<string>('');

  readonly filteredUsers = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.users();
    if (!query) return list;
    return list.filter(u => {
      const matchName = u.fullName ? u.fullName.toLowerCase().includes(query) : false;
      const matchPhone = u.phone ? u.phone.includes(query) : false;
      const matchEmail = u.email ? u.email.toLowerCase().includes(query) : false;
      return matchName || matchPhone || matchEmail;
    });
  });

  readonly branchFilterOptions = computed(() => {
    if (this.auth.isSuperAdmin()) {
      const list = this.branches().map(b => ({
        value: b.id,
        label: b.name,
        sublabel: b.code
      }));
      return [
        { value: '', label: 'Tất cả chi nhánh', sublabel: undefined },
        { value: 'UNASSIGNED', label: 'Chưa phân chi nhánh', sublabel: undefined },
        ...list
      ];
    } else if (this.auth.isBranchManager()) {
      const mb = this.managerBranch();
      const myBranchName = mb ? mb.name : 'Chi nhánh của tôi';
      const myBranchCode = mb ? mb.code : undefined;
      const myBranchId = mb ? mb.id : (this.auth.userHomeBranchId() ?? '');
      return [
        { value: '', label: 'Chi nhánh của tôi & Chưa phân chi nhánh', sublabel: undefined },
        ...(myBranchId ? [{ value: myBranchId, label: myBranchName, sublabel: myBranchCode }] : []),
        { value: 'UNASSIGNED', label: 'Chưa phân chi nhánh', sublabel: undefined }
      ];
    }
    return [];
  });

  readonly roleFilterOptions = [
    { value: '', label: 'Tất cả vai trò' },
    { value: 'SUPER_ADMIN', label: 'Ban Giám Đốc (Super Admin)' },
    { value: 'BRANCH_MANAGER', label: 'Quản Lý Cơ Sở (Branch Manager)' },
    { value: 'RECEPTIONIST', label: 'Lễ Tân Đón Tiếp (Receptionist)' },
    { value: 'INSTRUCTOR', label: 'Huấn Luyện Viên (Instructor)' },
    { value: 'STUDENT', label: 'Hội Viên (Student)' }
  ];

  readonly genderOptions = [
    { value: 'FEMALE', label: 'Nữ' },
    { value: 'MALE', label: 'Nam' }
  ];

  readonly modalBranchOptions = computed(() => {
    const list = this.branches().map(b => ({
      value: b.id,
      label: b.name
    }));
    if (this.auth.isSuperAdmin() && this.newRoleCode() === 'SUPER_ADMIN') {
      return [{ value: '', label: 'Toàn hệ thống (Không cố định cơ sở)' }];
    }
    if (this.auth.isSuperAdmin()) {
      return [{ value: '', label: 'Toàn hệ thống (Không cố định cơ sở)' }, ...list];
    }
    return list;
  });

  onRoleChange(code: string): void {
    this.newRoleCode.set(code);
    if (code === 'SUPER_ADMIN') {
      this.newBranchId.set('');
    }
  }

  onFilterBranchChange(val: string): void {
    this.filterBranchId.set(val);
    this.loadUsers();
  }

  onFilterRoleChange(val: string): void {
    this.filterRoleCode.set(val);
    this.loadUsers();
  }

  // Notifications
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Create Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly newFullName = signal<string>('');
  readonly newPhone = signal<string>('');
  readonly newPassword = signal<string>('');
  readonly newEmail = signal<string>('');
  readonly newGender = signal<string>('FEMALE');
  readonly newDob = signal<string>('');
  readonly newRoleCode = signal<string>('');
  readonly newBranchId = signal<string>('');

  // Role Options dựa theo quyền của người đang đăng nhập (Zero-Emoji)
  readonly availableRoles = computed<RoleOption[]>(() => {
    if (this.auth.isSuperAdmin()) {
      return [
        { code: 'SUPER_ADMIN', name: 'Ban Giám Đốc (Super Admin)', desc: 'Toàn quyền chuỗi phòng tập' },
        { code: 'BRANCH_MANAGER', name: 'Quản Lý Cơ Sở (Branch Manager)', desc: 'Quản lý cơ sở và nhân sự' },
        { code: 'RECEPTIONIST', name: 'Lễ Tân Đón Tiếp (Receptionist)', desc: 'Bán thẻ POS và điểm danh Kiosk' },
        { code: 'INSTRUCTOR', name: 'Huấn Luyện Viên (Instructor)', desc: 'Giảng dạy và xác nhận ca học' },
        { code: 'STUDENT', name: 'Hội Viên (Student)', desc: 'Tập luyện, đặt chỗ và thẻ tập' }
      ];
    } else if (this.auth.isBranchManager()) {
      // Branch Manager CHỈ được tạo RECEPTIONIST, INSTRUCTOR, STUDENT
      return [
        { code: 'RECEPTIONIST', name: 'Lễ Tân Đón Tiếp (Receptionist)', desc: 'Bán thẻ POS và điểm danh Kiosk' },
        { code: 'INSTRUCTOR', name: 'Huấn Luyện Viên (Instructor)', desc: 'Giảng dạy và xác nhận ca học' },
        { code: 'STUDENT', name: 'Hội Viên (Student)', desc: 'Tập luyện, đặt chỗ và thẻ tập' }
      ];
    }
    return [];
  });

  // Chi nhánh của Branch Manager
  readonly managerBranch = computed(() => {
    const branchId = this.auth.userHomeBranchId();
    if (!branchId) return null;
    return this.branches().find(b => b.id === branchId) ?? null;
  });

  ngOnInit(): void {
    this.loadBranches();
    this.loadUsers();
  }

  loadBranches(): void {
    this.branchApi.getAll().subscribe({
      next: (list: Branch[]) => {
        this.branches.set(list || []);
      },
      error: () => this.branches.set([])
    });
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const bFilter = this.filterBranchId() || undefined;
    const rFilter = this.filterRoleCode() || undefined;

    this.userApi.getUsers(bFilter, rFilter).subscribe({
      next: (list) => {
        this.users.set(list || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách tài khoản từ máy chủ.');
      }
    });
  }

  openCreateModal(): void {
    this.isModalOpen.set(true);
    this.newFullName.set('');
    this.newPhone.set('');
    this.newPassword.set('');
    this.newEmail.set('');
    this.newGender.set('FEMALE');
    this.newDob.set('');
    this.newRoleCode.set('');
    this.errorMessage.set(null);

    if (this.auth.isBranchManager()) {
      // Khóa chi nhánh theo chi nhánh của Manager
      this.newBranchId.set(this.auth.userHomeBranchId() ?? '');
    } else {
      this.newBranchId.set('');
    }
  }

  closeCreateModal(): void {
    this.isModalOpen.set(false);
  }

  submitCreateUser(): void {
    if (this.isCreating()) return;
    const name = this.newFullName().trim();
    const phone = this.newPhone().trim();
    const pass = this.newPassword();
    const email = this.newEmail().trim();
    const role = this.newRoleCode().trim();
    const gender = this.newGender();
    const dob = this.newDob();
    const branch = (role === 'SUPER_ADMIN') ? '' : this.newBranchId().trim();

    if (!name || !phone || !pass || !email || !role || !gender) {
      this.errorMessage.set('Vui lòng điền đầy đủ Họ tên, Giới tính, Số điện thoại, Email, Mật khẩu và Vai trò.');
      return;
    }

    if (role !== 'SUPER_ADMIN' && !branch) {
      this.errorMessage.set('Vui lòng chọn Chi nhánh phụ trách cho tài khoản.');
      return;
    }

    if (pass.length < 8 || pass.length > 72) {
      this.errorMessage.set('Mật khẩu phải từ 8 đến 72 ký tự.');
      return;
    }

    // Phone validation
    const cleanPhone = phone.replace(/\s+/g, '');
    if (!/^0\d{9}$/.test(cleanPhone)) {
      this.errorMessage.set('Số điện thoại không hợp lệ (yêu cầu 10 chữ số, bắt đầu bằng số 0).');
      return;
    }

    // Email validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      this.errorMessage.set('Địa chỉ email không đúng định dạng.');
      return;
    }

    // Kiểm tra ràng buộc phân quyền phía Client trước khi gọi Backend
    if (this.auth.isBranchManager()) {
      if (!['RECEPTIONIST', 'INSTRUCTOR', 'STUDENT'].includes(role)) {
        this.errorMessage.set('Quản lý chi nhánh chỉ được phép tạo tài khoản Lễ tân, Huấn luyện viên hoặc Học viên.');
        return;
      }
      if (branch !== this.auth.userHomeBranchId()) {
        this.errorMessage.set('Bạn chỉ có thể tạo tài khoản cho chi nhánh do mình trực tiếp quản lý.');
        return;
      }
    }

    this.isCreating.set(true);
    this.errorMessage.set(null);
    const req: CreateUserReq = {
      fullName: name,
      phone: cleanPhone,
      password: pass,
      email: email,
      gender: gender || undefined,
      dob: dob || undefined,
      roleCode: role,
      homeBranchId: (role === 'SUPER_ADMIN' || !branch) ? undefined : branch
    };

    this.userApi.createUser(req).subscribe({
      next: (created) => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.toast.success(`Đã tạo thành công tài khoản [${created.fullName}] với vai trò [${created.roleName}].`);
        this.loadUsers();
      },
      error: (err) => {
        this.isCreating.set(false);
        const msg = err?.error?.message || err?.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại quyền hạn hoặc số điện thoại.';
        this.toast.error(msg);
      }
    });
  }

  formatGender(gender?: string | null): string {
    if (!gender) return '—';
    const g = gender.trim().toUpperCase();
    if (g === 'FEMALE') return 'Nữ';
    if (g === 'MALE') return 'Nam';
    return gender;
  }

  canManageUser(u: UserResponse): boolean {
    if (u.id === this.auth.currentUserId()) return false;
    if (this.auth.isSuperAdmin()) return true;
    if (this.auth.isBranchManager()) {
      const allowedRoles = ['RECEPTIONIST', 'INSTRUCTOR', 'STUDENT'];
      const isAllowedRole = allowedRoles.includes(u.roleCode.toUpperCase());
      const isSameBranch = !!(this.auth.userHomeBranchId() && u.homeBranchId === this.auth.userHomeBranchId());
      const isUnassigned = !u.homeBranchId;
      return isAllowedRole && (isSameBranch || isUnassigned);
    }
    return false;
  }

  openConfirmModal(user: UserResponse): void {
    if (this.updatingUserId()) return;
    this.confirmTargetUser.set(user);
  }

  closeConfirmModal(): void {
    if (this.updatingUserId()) return;
    this.confirmTargetUser.set(null);
  }

  executeConfirmToggleStatus(): void {
    const user = this.confirmTargetUser();
    if (!user || this.updatingUserId()) return;

    const nextStatus = !user.isActive;
    const actionVerb = nextStatus ? 'mở khóa' : 'khóa';

    this.updatingUserId.set(user.id);
    this.userApi.updateUserStatus(user.id, nextStatus).subscribe({
      next: (updated) => {
        this.updatingUserId.set(null);
        this.users.update(list =>
          list.map(item => item.id === user.id ? { ...item, isActive: updated.isActive } : item)
        );
        this.closeConfirmModal();
        this.toast.success(`Đã ${actionVerb} thành công tài khoản [${user.fullName}].`);
      },
      error: (err) => {
        this.updatingUserId.set(null);
        const msg = err?.error?.message || err?.message || `Không thể ${actionVerb} tài khoản.`;
        this.toast.error(msg);
      }
    });
  }

  toggleUserStatus(user: UserResponse): void {
    this.openConfirmModal(user);
  }

  openStudentDetail(user: UserResponse): void {
    this.selectedStudent.set(user);
    this.activeStudentTab.set('profile');
    this.isDetailLoading.set(true);

    forkJoin({
      passes: this.membershipApi.getStudentMemberships(user.id).pipe(catchError(() => of([]))),
      orders: this.posApi.getStudentOrders(user.id).pipe(catchError(() => of([]))),
      bookings: this.bookingApi.getStudentBookingDetails(user.id).pipe(catchError(() => of([]))),
      plans: this.membershipApi.getAllPlans().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.studentMemberships.set(res.passes || []);
        this.studentOrders.set(res.orders || []);
        this.studentBookings.set(res.bookings || []);
        const pMap = new Map<string, string>();
        res.plans?.forEach(p => pMap.set(p.id, p.name));
        this.membershipPlansMap.set(pMap);
        this.isDetailLoading.set(false);
      },
      error: () => {
        this.isDetailLoading.set(false);
      }
    });
  }

  closeStudentDetail(): void {
    this.selectedStudent.set(null);
  }

  formatPaymentMethod(method?: string): string {
    if (!method) return '—';
    const m = method.toUpperCase();
    if (m === 'CASH') return 'Tiền mặt';
    if (m === 'POS_CARD') return 'Thẻ POS';
    if (m === 'BANK_TRANSFER_QR' || m === 'BANK_TRANSFER') return 'Chuyển khoản QR';
    return method;
  }

  formatMembershipStatus(status?: string): { label: string; class: string } {
    switch (status) {
      case 'ACTIVE': return { label: 'Đang hoạt động', class: 'status-active' };
      case 'PENDING_PAYMENT': return { label: 'Chờ thanh toán', class: 'status-pending' };
      case 'FROZEN': return { label: 'Tạm bảo lưu', class: 'status-frozen' };
      case 'EXPIRED': return { label: 'Hết hạn', class: 'status-expired' };
      case 'CANCELLED': return { label: 'Đã hủy', class: 'status-cancelled' };
      default: return { label: status || '—', class: 'status-default' };
    }
  }

  formatBookingStatus(status?: string): { label: string; class: string } {
    switch (status) {
      case 'ATTENDED': return { label: 'Đã tham gia', class: 'booking-attended' };
      case 'CONFIRMED': return { label: 'Đã đặt chỗ', class: 'booking-confirmed' };
      case 'CANCELLED': return { label: 'Đã hủy', class: 'booking-cancelled' };
      case 'NO_SHOW': return { label: 'Vắng mặt', class: 'booking-noshow' };
      default: return { label: status || '—', class: 'booking-default' };
    }
  }
}
