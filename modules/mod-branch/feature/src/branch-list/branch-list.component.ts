import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import {
  Branch,
  BranchApi,
  CreateBranchReq,
  CreateRoomReq,
  Room,
  UpdateBranchReq,
  UpdateRoomReq
} from '@yoga/mod-branch/data-access';
import {
  ZenConfirmService,
  ZenInputComponent,
  ZenSearchComponent,
  ZenToastService
} from '@yoga/platform/ui';

@Component({
  selector: 'yoga-branch-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ZenSearchComponent,
    ZenInputComponent
  ],
  templateUrl: './branch-list.component.html',
  styleUrls: ['./branch-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BranchListComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly branchApi = inject(BranchApi);
  private readonly confirmService = inject(ZenConfirmService);
  private readonly toast = inject(ZenToastService);

  // Branch data signals
  readonly branches = signal<Branch[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');
  readonly copiedCode = signal<string | null>(null);

  // Branch Create / Edit Modal State
  readonly isBranchModalOpen = signal<boolean>(false);
  readonly isEditingBranch = signal<boolean>(false);
  readonly editingBranchId = signal<string | null>(null);
  readonly isSubmittingBranch = signal<boolean>(false);

  // Branch Form Signals
  readonly bFormCode = signal<string>('');
  readonly bFormName = signal<string>('');
  readonly bFormAddress = signal<string>('');
  readonly bFormPhone = signal<string>('');
  readonly bFormEmail = signal<string>('');
  readonly bFormBankName = signal<string>('');
  readonly bFormBankAccountNumber = signal<string>('');
  readonly bFormBankAccountHolder = signal<string>('');
  readonly bFormIsActive = signal<boolean>(true);

  // Room Viewer Modal State
  readonly isRoomsModalOpen = signal<boolean>(false);
  readonly selectedBranchForRooms = signal<Branch | null>(null);
  readonly branchRooms = signal<Room[]>([]);
  readonly isLoadingRooms = signal<boolean>(false);

  // Room Create / Edit Modal State
  readonly isRoomModalOpen = signal<boolean>(false);
  readonly isEditingRoom = signal<boolean>(false);
  readonly editingRoomId = signal<string | null>(null);
  readonly isSubmittingRoom = signal<boolean>(false);

  // Room Form Signals
  readonly rFormName = signal<string>('');
  readonly rFormFloor = signal<string>('');
  readonly rFormMaxCapacity = signal<number>(20);
  readonly rFormIsActive = signal<boolean>(true);

  // Filtered branches computed
  readonly filteredBranches = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const list = this.branches();
    if (!q) return list;
    return list.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.branchApi.getAll().subscribe({
      next: (data) => {
        this.branches.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Không thể tải danh sách chi nhánh');
        this.isLoading.set(false);
      }
    });
  }

  formatBranchName(name: string): string {
    if (!name) return 'Chi nhánh An Yên';
    return name.replace(/^Yoga Center\s*–\s*/i, 'An Yên – ');
  }

  formatBranchCode(code: string): string {
    if (!code) return 'CƠ SỞ';
    return code.replace(/^CN_/i, 'CS ').toUpperCase();
  }

  async copyAccount(accountNumber: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(accountNumber);
      this.copiedCode.set(accountNumber);
      this.toast.info('Đã sao chép số tài khoản', 'Thông báo');
      setTimeout(() => this.copiedCode.set(null), 2000);
    } catch {
      // fallback
    }
  }

  // --- Branch Actions ---

  openCreateBranchModal(): void {
    this.isEditingBranch.set(false);
    this.editingBranchId.set(null);
    this.bFormCode.set('');
    this.bFormName.set('');
    this.bFormAddress.set('');
    this.bFormPhone.set('');
    this.bFormEmail.set('');
    this.bFormBankName.set('');
    this.bFormBankAccountNumber.set('');
    this.bFormBankAccountHolder.set('');
    this.bFormIsActive.set(true);
    this.isBranchModalOpen.set(true);
  }

  openEditBranchModal(branch: Branch): void {
    this.isEditingBranch.set(true);
    this.editingBranchId.set(branch.id);
    this.bFormCode.set(branch.code);
    this.bFormName.set(branch.name);
    this.bFormAddress.set(branch.address);
    this.bFormPhone.set(branch.phone);
    this.bFormEmail.set(branch.email || '');
    this.bFormBankName.set(branch.bankName || '');
    this.bFormBankAccountNumber.set(branch.bankAccountNumber || '');
    this.bFormBankAccountHolder.set(branch.bankAccountHolder || '');
    this.bFormIsActive.set(branch.isActive);
    this.isBranchModalOpen.set(true);
  }

  closeBranchModal(): void {
    if (this.isSubmittingBranch()) return;
    this.isBranchModalOpen.set(false);
  }

  submitBranch(): void {
    const code = this.bFormCode().trim().toUpperCase();
    const name = this.bFormName().trim();
    const address = this.bFormAddress().trim();
    const phone = this.bFormPhone().trim();

    if (!code) {
      this.toast.warning('Vui lòng nhập mã chi nhánh', 'Thiếu thông tin');
      return;
    }
    if (!name) {
      this.toast.warning('Vui lòng nhập tên chi nhánh', 'Thiếu thông tin');
      return;
    }
    if (!address) {
      this.toast.warning('Vui lòng nhập địa chỉ chi nhánh', 'Thiếu thông tin');
      return;
    }
    if (!phone) {
      this.toast.warning('Vui lòng nhập số điện thoại liên hệ', 'Thiếu thông tin');
      return;
    }

    this.isSubmittingBranch.set(true);

    if (this.isEditingBranch()) {
      const branchId = this.editingBranchId()!;
      const req: UpdateBranchReq = {
        code,
        name,
        address,
        phone,
        email: this.bFormEmail().trim() || undefined,
        bankName: this.bFormBankName().trim() || undefined,
        bankAccountNumber: this.bFormBankAccountNumber().trim() || undefined,
        bankAccountHolder: this.bFormBankAccountHolder().trim() || undefined,
        isActive: this.bFormIsActive()
      };

      this.branchApi.update(branchId, req).subscribe({
        next: (updated) => {
          this.toast.success(`Cập nhật chi nhánh "${updated.name}" thành công`);
          this.isSubmittingBranch.set(false);
          this.isBranchModalOpen.set(false);
          this.loadBranches();
        },
        error: (err) => {
          this.toast.error(err.message || 'Không thể cập nhật chi nhánh');
          this.isSubmittingBranch.set(false);
        }
      });
    } else {
      const req: CreateBranchReq = {
        code,
        name,
        address,
        phone,
        email: this.bFormEmail().trim() || undefined,
        bankName: this.bFormBankName().trim() || undefined,
        bankAccountNumber: this.bFormBankAccountNumber().trim() || undefined,
        bankAccountHolder: this.bFormBankAccountHolder().trim() || undefined
      };

      this.branchApi.create(req).subscribe({
        next: (created) => {
          this.toast.success(`Tạo chi nhánh "${created.name}" thành công`);
          this.isSubmittingBranch.set(false);
          this.isBranchModalOpen.set(false);
          this.loadBranches();
        },
        error: (err) => {
          this.toast.error(err.message || 'Không thể tạo chi nhánh mới');
          this.isSubmittingBranch.set(false);
        }
      });
    }
  }

  async confirmDeleteBranch(branch: Branch): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete({
      title: 'Xác Nhận Xóa Chi Nhánh',
      itemName: branch.name,
      details: 'Nếu chi nhánh đã có dữ liệu ràng buộc (phòng học, ca học hoặc hợp đồng thẻ tập), hệ thống sẽ chuyển sang trạng thái tạm dừng để bảo toàn lịch sử giao dịch.'
    });

    if (!confirmed) return;

    this.branchApi.delete(branch.id).subscribe({
      next: () => {
        this.toast.success(`Đã xử lý xóa chi nhánh "${branch.name}"`);
        this.loadBranches();
      },
      error: (err) => {
        this.toast.error(err.message || 'Không thể xóa chi nhánh');
      }
    });
  }

  // --- Rooms Viewer & Actions ---

  openRoomsModal(branch: Branch): void {
    this.selectedBranchForRooms.set(branch);
    this.isRoomsModalOpen.set(true);
    this.loadRooms(branch.id);
  }

  closeRoomsModal(): void {
    this.isRoomsModalOpen.set(false);
    this.selectedBranchForRooms.set(null);
    this.branchRooms.set([]);
  }

  loadRooms(branchId: string): void {
    this.isLoadingRooms.set(true);
    this.branchApi.getRooms(branchId, true).subscribe({
      next: (rooms) => {
        this.branchRooms.set(rooms);
        this.isLoadingRooms.set(false);
      },
      error: (err) => {
        this.toast.error(err.message || 'Không thể tải danh sách phòng học');
        this.isLoadingRooms.set(false);
      }
    });
  }

  openCreateRoomModal(): void {
    this.isEditingRoom.set(false);
    this.editingRoomId.set(null);
    this.rFormName.set('');
    this.rFormFloor.set('');
    this.rFormMaxCapacity.set(20);
    this.rFormIsActive.set(true);
    this.isRoomModalOpen.set(true);
  }

  openEditRoomModal(room: Room): void {
    this.isEditingRoom.set(true);
    this.editingRoomId.set(room.id);
    this.rFormName.set(room.name);
    this.rFormFloor.set(room.floor || '');
    this.rFormMaxCapacity.set(room.maxCapacity);
    this.rFormIsActive.set(room.isActive);
    this.isRoomModalOpen.set(true);
  }

  closeRoomModal(): void {
    if (this.isSubmittingRoom()) return;
    this.isRoomModalOpen.set(false);
  }

  submitRoom(): void {
    const branch = this.selectedBranchForRooms();
    if (!branch) return;

    const name = this.rFormName().trim();
    const capacity = Number(this.rFormMaxCapacity());

    if (!name) {
      this.toast.warning('Vui lòng nhập tên phòng học', 'Thiếu thông tin');
      return;
    }
    if (!capacity || capacity <= 0) {
      this.toast.warning('Sức chứa tối đa phải lớn hơn 0', 'Dữ liệu không hợp lệ');
      return;
    }

    this.isSubmittingRoom.set(true);

    if (this.isEditingRoom()) {
      const roomId = this.editingRoomId()!;
      const req: UpdateRoomReq = {
        name,
        floor: this.rFormFloor().trim() || undefined,
        maxCapacity: capacity,
        isActive: this.rFormIsActive()
      };

      this.branchApi.updateRoom(roomId, req).subscribe({
        next: (updated) => {
          this.toast.success(`Cập nhật phòng "${updated.name}" thành công`);
          this.isSubmittingRoom.set(false);
          this.isRoomModalOpen.set(false);
          this.loadRooms(branch.id);
          this.loadBranches();
        },
        error: (err) => {
          this.toast.error(err.message || 'Không thể cập nhật phòng học');
          this.isSubmittingRoom.set(false);
        }
      });
    } else {
      const req: CreateRoomReq = {
        name,
        floor: this.rFormFloor().trim() || undefined,
        maxCapacity: capacity,
        isActive: this.rFormIsActive()
      };

      this.branchApi.createRoom(branch.id, req).subscribe({
        next: (created) => {
          this.toast.success(`Tạo phòng "${created.name}" thành công`);
          this.isSubmittingRoom.set(false);
          this.isRoomModalOpen.set(false);
          this.loadRooms(branch.id);
          this.loadBranches();
        },
        error: (err) => {
          this.toast.error(err.message || 'Không thể tạo phòng học mới');
          this.isSubmittingRoom.set(false);
        }
      });
    }
  }

  async confirmDeleteRoom(room: Room): Promise<void> {
    const branch = this.selectedBranchForRooms();
    if (!branch) return;

    const confirmed = await this.confirmService.confirmDelete({
      title: 'Xác Nhận Xóa Phòng Học',
      itemName: room.name,
      details: 'Nếu phòng học đã được xếp ca học hoặc có học viên đăng ký, hệ thống sẽ tự động chuyển sang trạng thái ngưng hoạt động để đảm bảo dữ liệu lịch sử.'
    });

    if (!confirmed) return;

    this.branchApi.deleteRoom(room.id).subscribe({
      next: () => {
        this.toast.success(`Đã xử lý xóa phòng "${room.name}"`);
        this.loadRooms(branch.id);
        this.loadBranches();
      },
      error: (err) => {
        this.toast.error(err.message || 'Không thể xóa phòng học');
      }
    });
  }
}
