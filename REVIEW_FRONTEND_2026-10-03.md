# Review frontend — 03/10/2026

Phạm vi: platform API/auth/Supabase, cấu hình app/routes/environment, các module identity, branch, membership, schedule, landing; đối chiếu contract và phân quyền backend đã review. Review mã nguồn và build, chưa kiểm chứng bằng browser/E2E hoặc thực hiện giao dịch trên backend/database. Không sửa mã nghiệp vụ.

## Kiểm tra thực tế

- `npm run build -- --configuration development`: PASS, Angular biên dịch application và template.
- `npm run build`: FAIL vì Angular không tải được Google Fonts để inline; lỗi mạng EACCES trong môi trường hiện tại. Chưa xác nhận production build hoàn chỉnh; không coi đây là lỗi TypeScript.
- `npm test`: FAIL — Cannot determine project or target for command. angular.json không có test target.
- `npm run lint`: FAIL — không có lint target.
- tsconfig.base.json loại toàn bộ spec khỏi build. Build pass không xác nhận spec hợp lệ hoặc runtime forms hoạt động đúng.

P1: cần sửa trước khi dùng với dữ liệu/giao dịch thật. P2: lỗi chức năng hoặc độ ổn định cần sửa. Số dòng trỏ mã hiện tại; đường dẫn module dưới đây tương đối với frontend.

## Phát hiện

### 1. [P1] POS báo thanh toán thành công dù tạo đơn thất bại

Vị trí: `modules/mod-membership/feature/src/pos-checkout/pos-checkout.component.ts:137–176`; template `:35–50`.

Mọi lỗi createOrder, kể cả mất kết nối, 403, dữ liệu sai hoặc 500, gọi handleFallbackSimulation. Hàm dựng fakeOrder status PAID, fakePayment status SUCCESS, mã thẻ ngẫu nhiên rồi hiển thị cùng biên lai “ĐÃ KÍCH HOẠT THÀNH CÔNG” như giao dịch thật. Không có cờ demo hoặc nhãn mô phỏng. Thu ngân có thể tin rằng đã thu tiền/kích hoạt thẻ dù server chưa tạo đơn.

Sửa: bỏ fallback thành công khỏi luồng thật; hiển thị lỗi, chỉ xuất biên lai từ kết quả server. Demo phải có chế độ và nhãn riêng rõ ràng.

### 2. [P1] Trang thẻ và lịch đặt chỗ luôn thao tác học viên mẫu

Vị trí: `modules/mod-membership/feature/src/student-passes/student-passes.component.ts:38–45,84–108,161`; `modules/mod-schedule/feature/src/schedule-calendar/schedule-calendar.component.ts:31,98,129,140,189,223,249`.

currentStudentId cố định là học viên seed, không dùng AuthService.currentUserId. Người dùng mới đăng ký vào “Thẻ của tôi” thấy thông tin/thẻ/booking của học viên mẫu; đặt lịch và hàng chờ cũng gửi studentId này. Backend hiện thiếu kiểm tra chủ sở hữu nên không chỉ hiển thị sai mà có thể ghi/hủy dữ liệu học viên mẫu. Khi backend được sửa, các thao tác sẽ chuyển thành lỗi 403 thay vì hoạt động đúng.

Sửa: lấy danh tính từ phiên backend, tải lại theo phiên hiện tại và xóa state khi đổi/logout tài khoản. Calendar công khai chỉ tải dữ liệu công khai; yêu cầu đăng nhập khi xem/ghi dữ liệu cá nhân.

### 3. [P1] POS không dùng học viên nhập trên form; thu ngân và chi nhánh cũng là dữ liệu mẫu

Vị trí: `pos-checkout.component.ts:43–45,95–117`; `pos-checkout.component.html:14–19`.

studentPhone/studentName chỉ kiểm tra có nhập, không tra cứu hoặc tạo học viên. createOrder luôn gửi UUID học viên 3333… và thu ngân 4444…, không theo người đăng nhập. Branch select dùng các UUID 1111… không khớp selectedBranchId mặc định b000… và dữ liệu seed backend. Thu ngân nhập học viên khác vẫn không thay customerId. Nếu ID mẫu không tồn tại, đơn bị FK reject rồi rơi vào biên lai giả ở phát hiện 1.

Sửa: tra cứu/chọn học viên thật và lưu ID xác nhận; dùng danh sách chi nhánh được cấp quyền; backend lấy actor từ principal.

### 4. [P1] Retry checkout tạo đơn mới và mất idempotency của giao dịch trước

Vị trí: `pos-checkout.component.ts:106,109–141,179–183`.

Mỗi handleCheckout sinh key mới và createOrder mới. Nếu order đã tạo nhưng response payment mất, handleApiError không lưu order/key để đối soát hoặc retry. Bấm lại tạo đơn và hợp đồng khác; nếu lần trước payment đã commit, lần sau có thể thu thêm tiền cho đơn mới. Backend idempotency không bảo vệ vì cả order và key đều mới.

Sửa: giữ trạng thái checkout gồm orderId, key, payload và kết quả chưa xác định; retry cùng giao dịch, đối soát server trước khi tạo đơn mới. Khóa các field trong lúc xử lý để payload không đổi giữa hai request.

### 5. [P1] Login/register/kiosk có lỗi runtime ngModel thiếu name

Vị trí: `modules/mod-identity/feature/src/login/login.component.html:21–44`; `register/register.component.html:27–119`; `modules/mod-schedule/feature/src/qr-scanner/qr-scanner.component.html:29–38`.

Các input/select dùng ngModel bên trong form, không có name hoặc ngModelOptions standalone. FormsModule áp dụng NgForm cho form này; mã Angular Forms đang cài kiểm tra và ném lỗi NGMODEL_WITHOUT_NAME (NG01352 ở development). id không thay thế name. Đây là lỗi runtime nên template build pass không phát hiện được; chưa chạy browser để xác nhận biểu hiện màn hình.

Sửa: đặt name duy nhất cho từng control hoặc standalone đúng mục đích; dùng ngSubmit và kiểm tra form validity. Thêm smoke test render login/register/kiosk trong cấu hình development.

### 6. [P1] Mã QR và camera điểm danh chỉ là hình mô phỏng

Vị trí: `student-passes.component.html:130–169,390–428`; `qr-scanner.component.html:14–29`; `qr-scanner.component.ts:40–75`.

QR SVG có các rect tọa độ cố định, không mã hóa bookingId/code; các booking khác nhau có cùng họa tiết. Kiosk chỉ có viewfinder trang trí và text input, không gọi getUserMedia, không decode QR. Hướng dẫn đưa QR trước camera không thể hoàn thành luồng scan bằng camera trong app. Nhập/dán mã hoặc đầu đọc ngoài giả lập bàn phím là luồng duy nhất hiện có. Kiosk còn quảng bá quét thẻ hội viên nhưng request/backend chỉ tra bookingId/code.

Sửa: sinh QR thật theo payload được thống nhất và bổ sung camera decoder/quyền truy cập; hoặc mô tả chính xác chế độ nhập mã/đầu đọc ngoài. Nếu hỗ trợ mã thẻ, cần luồng resolve booking của thẻ.

### 7. [P1] Học viên được mời gọi API check-in dành riêng cho nhân sự

Vị trí: `student-passes.component.ts:176–188`; template `:88–100,447–468`; backend `CheckInController.java`.

Trang my-passes có nút “Thử Quét Điểm Danh Tại Chỗ” gọi POST /check-in bằng token STUDENT. Backend chỉ cho SUPER_ADMIN/BRANCH_MANAGER/RECEPTIONIST/INSTRUCTOR, nên học viên bị 403. Link kiosk trên cùng modal và link “Mua thẻ” vào POS cũng dẫn đến route mà STUDENT không được vào. Request check-in còn hardcode chi nhánh Q1 và nhân sự seed; QrScanner cũng dùng hai ID này, nên nhân sự chi nhánh khác ghi sai actor hoặc bị trigger reject chi nhánh.

Sửa: học viên hiển thị QR để nhân sự quét; ẩn action không được cấp quyền hoặc xây luồng tự check-in được backend hỗ trợ. Kiosk lấy branch context đúng và actor do server xác định.

### 8. [P1] API URL hardcode localhost; environment production không có hiệu lực

Vị trí: `platform/api/src/api-client.ts:9`; `apps/web-app/src/environments/environment.prod.ts:3`; `angular.json` production configuration.

ApiClient luôn gọi http://localhost:8080/api/v1, không đọc environment.apiUrl. Khi deploy, localhost là máy của người truy cập, không phải máy backend. Production environment cũng giữ localhost và angular.json không cấu hình file replacement, nên sửa mỗi environment.prod.ts vẫn không thay API client.

Sửa: dùng API base URL cấu hình/injection token hoặc cùng origin qua reverse proxy; nối cấu hình production thực sự và kiểm tra build artifact. Đối chiếu thêm CORS backend cho origin triển khai.

### 9. [P2] Phiên đăng nhập không kiểm tra hết hạn hoặc đồng bộ lỗi xác thực

Vị trí: `platform/auth/src/auth.service.ts:11–24,54–75`; `auth.interceptor.ts:8–21`; `auth.guard.ts`.

Chỉ cần có object JSON trong localStorage thì isAuthenticated=true. Không validate shape, không kiểm tra JWT exp, không gọi fetchMe ở boot và không xử lý 401/phiên hết hiệu lực trong interceptor. Token hết hạn vẫn cho vào protected routes, rồi API thất bại; một số màn hình nuốt lỗi thành danh sách rỗng. Role/homeBranch hiển thị cũng dựa trên bản lưu cũ.

Sửa: validate storage, kiểm tra hạn, hydrate phiên từ backend, xử lý trạng thái unauthorized nhất quán và điều hướng có return URL. Guards phía client phục vụ UX, backend vẫn phải kiểm tra quyền độc lập.

### 10. [P2] Chọn “ca sắp tới” và điều kiện đặt chỗ không phản ánh thời gian/trạng thái

Vị trí: `student-passes.component.ts:64–67`; `schedule-calendar.component.ts:59–70,98–104,150–171`; template calendar `:117–171,300–340`.

nextBooking lấy CONFIRMED đầu tiên nhưng backend sắp theo createdAt giảm dần, không theo startTime. Ca đặt gần nhất có thể xa hơn ca sắp diễn ra, hoặc đã qua giờ. Calendar không giới hạn khoảng ngày, không lọc status/startTime và chỉ căn cứ availableSlots để hiện đặt chỗ/hàng chờ. Dropdown thẻ đưa cả thẻ pending/expired/hết lượt và mặc định thẻ đầu tiên. Dropdown thảm cố định 1–15, không theo sức chứa hoặc vị trí đã giữ; tất cả lượt mở modal mặc định thảm 1, làm tăng lỗi trùng thảm từ DB.

Sửa: chọn booking tương lai gần nhất theo startTime; chỉ mở action cho lịch phù hợp; lọc thẻ hợp lệ theo ngày/chi nhánh/số dư; lấy vị trí khả dụng hoặc cho backend tự gán. Server vẫn là nơi quyết định cuối cùng.

### 11. [P2] Race khi đổi filter và lỗi API bị biến thành trạng thái rỗng

Vị trí: `schedule-calendar.component.ts:98–147`; `student-passes.component.ts:79–115`; `modules/mod-identity/feature/src/user-management/user-management.component.ts:95–111`; `qr-scanner.component.html`.

Đổi branch nhanh tạo nhiều subscription độc lập: response branch cũ đến muộn có thể ghi đè schedules trong khi selector đã ở branch mới. User filter có mẫu tương tự. Trang thẻ dùng một loading flag cho request thẻ nhưng tải booking/waitlist độc lập; request chậm/lỗi được biểu diễn “chưa có” dữ liệu. Lỗi thẻ/booking/waitlist thường chỉ set [], không báo người dùng. Kiosk set errorMessage khi API thất bại nhưng template không render signal này, nên failure không có thông báo.

Sửa: switchMap hoặc kiểm tra request generation cho filter; tách loading/error theo resource; hiển thị lỗi và retry; render thông báo lỗi kiosk.

### 12. [P1] Tạo tài khoản mặc định mật khẩu chung và mặc định role SUPER_ADMIN

Vị trí: `user-management.component.ts:44,53–60,116,125–127`; `login.component.ts:34–74`.

Mở modal tạo user đặt password=123456 và lấy role đầu tiên. Với Super Admin, role đầu tiên chính là SUPER_ADMIN; thao tác nhập tên/phone rồi submit mà không sửa hai field tạo thêm tài khoản quản trị bằng mật khẩu đoán được. Backend hiện không bắt buộc đổi mật khẩu lần đầu. Trang login cũng luôn xuất preset các tài khoản và mật khẩu demo, không kiểm soát theo môi trường.

Sửa: không đặt sẵn role đặc quyền, yêu cầu chọn chủ động; dùng lời mời/thiết lập mật khẩu hoặc mật khẩu tạm riêng có đổi bắt buộc; presets chỉ hiện ở demo và tài khoản demo không tồn tại trên production.

### 13. [P2] UI thanh toán chuyển khoản hiển thị thông tin ngân hàng mẫu

Vị trí: `pos-checkout.component.html:203–214`; `pos-checkout.component.ts:126–130`; API Branch có bankName/bankAccountNumber/bankAccountHolder.

Template cố định ngân hàng, tài khoản, chủ tài khoản không theo branch được chọn; khung “VietQR Đối Soát Tự Động” chỉ là icon/text, không tạo QR hoặc có cơ chế đối soát trong frontend. transactionReference tự sinh từ Date.now không phải mã giao dịch ngân hàng đã xác nhận. Khách làm theo hướng dẫn có thể chuyển đến tài khoản không thuộc cơ sở đang bán thẻ.

Sửa: lấy thông tin ngân hàng từ cấu hình chi nhánh được xác nhận; tạo QR thanh toán thật nếu hỗ trợ, phân biệt xác nhận thủ công và đối soát tự động.

### 14. [P2] Test/lint chưa chạy được và các spec đã lệch implementation

Vị trí: `angular.json`; `package.json`; `tsconfig.base.json`; `landing.page.spec.ts:29,41–48`; `schedule-calendar.component.spec.ts:38–63`; `student-passes.component.spec.ts:39–45`.

Thiếu test/lint targets, runner/types kiểm thử không có trong devDependencies. Landing spec vẫn mock SupabaseAuthService và gọi closeAuthModal/isAuthModalOpen/authModalMode đã không còn trong LandingPage. Calendar mock thiếu getStudentBookingDetails và không provision WaitlistApi/HttpClient; StudentPasses spec cũng chưa provision các API mới. Vì spec bị exclude, development build vẫn pass.

Sửa: cấu hình test runner/lint, cập nhật spec theo service hiện tại; thêm kiểm thử lỗi POS không được thành success, tài khoản thật, retry payment cùng key, runtime forms, stale response và guards.

## Điểm cần kiểm tra thêm sau sửa

- SupabaseAuthService/AuthModal còn tồn tại song song với AuthService backend. Modal Supabase hiện không được LandingPage mount; POS/my-passes vẫn inject Supabase nhưng không dùng làm danh tính. Nên thống nhất hoặc loại mã không dùng. Flow resetPassword trong mã Supabase trỏ /reset-password nhưng app chưa có route/update password; không coi là lỗi của flow hiện đang được render.
- Production build phụ thuộc tải Google Fonts trong ba SCSS identity. Cân nhắc self-host hoặc cấu hình font inlining để CI hoạt động ổn định; lỗi build quan sát được hiện tại xuất phát từ hạn chế mạng.
- Các modal tự dựng cần kiểm tra focus trap, Escape, aria-dialog và phục hồi focus bằng browser khi hoàn thiện UX.

## Ưu tiên sửa

1. Biên lai giả, danh tính học viên/thu ngân/chi nhánh, form runtime và retry thanh toán.
2. QR thật, phân quyền các action, URL triển khai và thông tin ngân hàng.
3. Phiên xác thực, filter/thời gian/thẻ/thảm, loading/error/race.
4. Khôi phục test/lint và kiểm thử E2E với backend sau khi sửa quyền chủ sở hữu.
