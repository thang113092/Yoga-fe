import type {
  BranchPreview,
  FaqItem,
  FeatureItem,
  PricingPackage,
  StatItem,
  TestimonialItem
} from './landing.models';

export const LANDING_STATS: readonly StatItem[] = [
  { value: '5+', icon: 'branches', label: 'Chi nhánh chuẩn Zen', description: 'Không gian xanh mát, tách biệt khỏi ồn ào phố thị' },
  { value: '12.000+', icon: 'members', label: 'Học viên đồng hành', description: 'Cộng đồng gắn kết và nuôi dưỡng lối sống lành mạnh' },
  { value: '45+', icon: 'trainers', label: 'HLV chứng chỉ Quốc tế', description: 'Giàu kinh nghiệm, tận tâm hướng dẫn từng hơi thở' },
  { value: '99.6', percent: true, icon: 'rating', label: 'Đánh giá hài lòng', description: 'Chất lượng phòng tập và trải nghiệm dịch vụ hàng đầu' }
];

export const LANDING_FEATURES: readonly FeatureItem[] = [
  {
    id: 'multi-branch',
    title: 'Một Thẻ Tập - Đa Chi Nhánh',
    description: 'Tự do di chuyển và luyện tập tại bất kỳ phòng tập nào thuộc chuỗi An Yên Yoga chỉ với một mã thẻ thành viên duy nhất.',
    icon: '🏛️',
    badge: 'Linh Hoạt 100%'
  },
  {
    id: 'smart-booking',
    title: 'Đặt Lịch Tức Thì - Giữ Chỗ Minh Bạch',
    description: 'Hệ thống xếp lịch thông minh với cơ chế giữ slot tự động, tránh quá tải ca học và tự động đôn hàng chờ khi có học viên hủy sớm.',
    icon: '📅',
    badge: 'Chống Overbooking'
  },
  {
    id: 'qr-checkin',
    title: 'Điểm Danh QR 1-Chạm',
    description: 'Chỉ mất 2 giây quét mã QR cá nhân tại cửa ra vào để xác nhận tham dự. Không cần mang thẻ từ rườm rà, bảo mật và an toàn tuyệt đối.',
    icon: '⚡',
    badge: 'Công Nghệ 4.0'
  },
  {
    id: 'flexible-cards',
    title: 'Đa Dạng Loại Thẻ Tập',
    description: 'Đáp ứng mọi nhu cầu: Thẻ lượt không giới hạn thời gian cho người bận rộn; Thẻ thời hạn không giới hạn số ca cho người chuyên tâm.',
    icon: '💳',
    badge: 'Tiết Kiệm Chi Phí'
  },
  {
    id: 'health-profile',
    title: 'Hồ Sơ Sức Khỏe & Cảnh Báo An Toàn',
    description: 'Theo dõi tiến độ thể lực, ghi nhận tiền sử chấn thương để giáo viên điều chỉnh bài tập phù hợp và an toàn nhất cho từng học viên.',
    icon: '🌿',
    badge: 'Chăm Sóc Tận Tâm'
  },
  {
    id: 'master-trainers',
    title: 'Bậc Thầy Yoga & Thiền Định',
    description: 'Đội ngũ giáo viên sở hữu chứng chỉ Yoga Alliance 200h/500h, giàu kiến thức giải phẫu và nghệ thuật điều khí Prāṇāyāma.',
    icon: '🧘‍♀️',
    badge: 'Chất Lượng Vàng'
  }
];

export const LANDING_PACKAGES: readonly PricingPackage[] = [
  {
    id: 'starter-10',
    name: 'Gói Trải Nghiệm Khởi Tâm',
    type: 'SESSION',
    scope: 'SINGLE_BRANCH',
    price: 1200000,
    originalPrice: 1500000,
    sessionCount: 10,
    subtitle: 'Thẻ 10 buổi không giới hạn thời gian sử dụng',
    highlights: [
      '10 buổi học Yoga & Thiền tại cơ sở đăng ký',
      'Không giới hạn thời hạn sử dụng',
      'Được đặt chỗ trước tối đa 7 ngày',
      'Miễn phí thảm tập cao cấp & tủ locker điện tử',
      'Tặng 01 buổi đo InBody & tư vấn dinh dưỡng'
    ],
    isPopular: false,
    ctaText: 'Đăng Ký Gói 10 Buổi'
  },
  {
    id: 'active-3m',
    name: 'Gói Chuyên Tâm An Lạc',
    type: 'TIME_BASED',
    scope: 'SINGLE_BRANCH',
    price: 3600000,
    originalPrice: 4500000,
    durationDays: 90,
    subtitle: '3 tháng tập thả ga không giới hạn số ca',
    highlights: [
      'Không giới hạn số lượt tập trong 90 ngày',
      'Tham gia tất cả khung giờ từ 05:30 đến 21:00',
      'Được bảo lưu tối đa 15 ngày khi đi công tác',
      'Điểm danh QR 1-chạm cực nhanh',
      'Ưu tiên giữ chỗ ca cao điểm'
    ],
    isPopular: true,
    ctaText: 'Chọn Gói Yêu Thích'
  },
  {
    id: 'vip-all-branch',
    name: 'Thẻ VIP Tinh Hoa Toàn Chuỗi',
    type: 'COMBO',
    scope: 'ALL_BRANCH',
    price: 9900000,
    originalPrice: 12900000,
    durationDays: 365,
    subtitle: '1 năm toàn quyền tập luyện trên toàn hệ thống',
    highlights: [
      'Tập không giới hạn tại 5+ chi nhánh toàn quốc',
      'Tặng 06 buổi huấn luyện kèm riêng 1:1 với HLV',
      'Miễn phí tham dự các Workshop & Thiền Chuông',
      'Ưu tiên check-in VIP & khăn lạnh thảo mộc',
      'Được bảo lưu thẻ linh hoạt lên đến 45 ngày'
    ],
    isPopular: false,
    ctaText: 'Trở Thành Hội Viên VIP'
  }
];

export const LANDING_BRANCHES: readonly BranchPreview[] = [
  {
    id: 'b-thaodien',
    name: 'An Yên Flagship Thảo Điền',
    code: 'HCM-TD',
    address: '68 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP. HCM',
    phone: '028 7300 8899',
    openHours: '05:30 - 21:30 (T2 - CN)',
    roomCount: 4,
    maxCapacity: 120,
    features: ['Khu vườn Zen ngoài trời', 'Phòng xông hơi đá muối Himalaya', 'Bar trà thảo mộc organic'],
    tag: 'Trung Tâm Lớn Nhất'
  },
  {
    id: 'b-badinh',
    name: 'An Yên Sanctuary Ba Đình',
    code: 'HN-BD',
    address: '12 Trấn Vũ, Phường Trúc Bạch, Quận Ba Đình, Hà Nội',
    phone: '024 3822 6688',
    openHours: '06:00 - 21:00 (T2 - CN)',
    roomCount: 3,
    maxCapacity: 80,
    features: ['View hồ Trúc Bạch an tĩnh', 'Phòng tập sàn gỗ tự nhiên', 'Không gian thiền chuông xoay'],
    tag: 'Không Gian Thơ Mộng'
  },
  {
    id: 'b-quan1',
    name: 'An Yên Sky Lounge Quận 1',
    code: 'HCM-Q1',
    address: 'Tầng 18, Tòa nhà Bitexco, Bến Nghé, Quận 1, TP. HCM',
    phone: '028 3821 9900',
    openHours: '05:30 - 22:00 (T2 - CN)',
    roomCount: 3,
    maxCapacity: 90,
    features: ['View toàn cảnh sông Sài Gòn', 'Khu nghỉ dưỡng ngắm hoàng hôn', 'Lớp Yoga đón bình minh'],
    tag: 'Đẳng Cấp View Cao'
  },
  {
    id: 'b-danang',
    name: 'An Yên Hillside Đà Nẵng',
    code: 'DN-NHS',
    address: '88 Võ Nguyên Giáp, Phường Khuê Mỹ, Quận Ngũ Hành Sơn, Đà Nẵng',
    phone: '0236 395 1122',
    openHours: '05:00 - 21:00 (T2 - CN)',
    roomCount: 3,
    maxCapacity: 75,
    features: ['Sát bãi biển Mỹ Khê', 'Lớp Yoga bãi cát sớm mai', 'Hồ ngâm khoáng thảo dược'],
    tag: 'Khu Nghỉ Dưỡng Biển'
  }
];

export const LANDING_TESTIMONIALS: readonly TestimonialItem[] = [
  {
    id: 't-1',
    authorName: 'Bác Sĩ Nguyễn Hoàng Mai',
    role: 'Học viên 2 năm tại Chi nhánh Thảo Điền',
    avatar: '👩‍⚕️',
    rating: 5,
    quote: 'Công việc phẫu thuật khiến cột sống tôi luôn căng thẳng. Nhờ chương trình Yoga trị liệu tại An Yên và sự tận tâm của HLV, chứng thoái hóa của tôi đã cải thiện rõ rệt sau 3 tháng.',
    membershipType: 'Thẻ VIP Toàn Chuỗi'
  },
  {
    id: 't-2',
    authorName: 'Trần Minh Đức',
    role: 'Giám đốc Công nghệ & Khởi nghiệp',
    avatar: '👨‍💼',
    rating: 5,
    quote: 'App đặt lịch rất tiện, chỉ 3 giây là có chỗ ca tối. Mình thích nhất tính năng thẻ đa chi nhánh, đi công tác Hà Nội hay vào Sài Gòn đều ghé tập được mà không tốn thêm đồng nào.',
    membershipType: 'Thẻ 3 Tháng Chuyên Tâm'
  },
  {
    id: 't-3',
    authorName: 'Phạm Thu Thảo',
    role: 'Thiết kế Nội thất tự do',
    avatar: '🧘',
    rating: 5,
    quote: 'Không gian ở An Yên thực sự mang lại cảm giác bình an hiếm có. Mùi tinh dầu xả chanh thoang thoảng, âm thanh chuông xoay Tây Tạng giúp mình giải tỏa mọi áp lực cuộc sống.',
    membershipType: 'Thẻ 10 Buổi Khởi Tâm'
  }
];

export const LANDING_FAQS: readonly FaqItem[] = [
  {
    id: 'faq-1',
    category: 'MEMBERSHIP',
    question: 'Tôi là người mới bắt đầu, chưa từng tập Yoga thì nên chọn lớp nào?',
    answer: 'Chào bạn, An Yên luôn có các lớp Gentle Yoga, Hatha Căn Bản và Hơi Thở Dưỡng Sinh dành riêng cho người mới. Giáo viên sẽ chỉnh sửa từng tư thế và hướng dẫn chi tiết cách hít thở an toàn.'
  },
  {
    id: 'faq-2',
    category: 'BOOKING',
    question: 'Tôi có cần đặt chỗ trước khi đến lớp không?',
    answer: 'Để đảm bảo không gian rộng rãi và an toàn, mỗi ca học giới hạn từ 15-20 học viên. Bạn nên mở ứng dụng và đặt chỗ trước từ 1 đến 7 ngày. Bạn có thể hủy trước giờ học 60 phút mà không bị trừ lượt.'
  },
  {
    id: 'faq-3',
    category: 'CHECKIN',
    question: 'Quy trình điểm danh bằng mã QR diễn ra như thế nào?',
    answer: 'Khi đến phòng tập, bạn chỉ cần mở app và quét mã QR tại quầy tiếp tân từ 30 phút trước giờ học. Hệ thống tự động xác minh thẻ hợp lệ và xác nhận check-in ngay lập tức.'
  },
  {
    id: 'faq-4',
    category: 'POLICY',
    question: 'Thẻ tập có được bảo lưu khi tôi đi công tác hoặc có việc bận không?',
    answer: 'Có. Tùy thuộc vào gói thẻ bạn đăng ký (3 tháng, 6 tháng hay 1 năm), bạn được bảo lưu từ 15 đến 45 ngày hoàn toàn miễn phí ngay trên ứng dụng hoặc liên hệ quầy tiếp tân.'
  }
];
