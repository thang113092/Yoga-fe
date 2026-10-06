export type PackageType = 'SESSION' | 'TIME_BASED' | 'COMBO';
export type BranchScope = 'SINGLE_BRANCH' | 'ALL_BRANCH';

export interface FeatureItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly badge?: string;
}

export interface PricingPackage {
  readonly id: string;
  readonly name: string;
  readonly type: PackageType;
  readonly scope: BranchScope;
  readonly price: number;
  readonly originalPrice?: number;
  readonly sessionCount?: number;
  readonly durationDays?: number;
  readonly subtitle: string;
  readonly highlights: readonly string[];
  readonly isPopular?: boolean;
  readonly ctaText: string;
}

export interface BranchPreview {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly address: string;
  readonly phone: string;
  readonly openHours: string;
  readonly roomCount: number;
  readonly maxCapacity: number;
  readonly features: readonly string[];
  readonly tag: string;
}

export interface TestimonialItem {
  readonly id: string;
  readonly authorName: string;
  readonly role: string;
  readonly avatar: string;
  readonly rating: number;
  readonly quote: string;
  readonly membershipType: string;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category: 'MEMBERSHIP' | 'BOOKING' | 'CHECKIN' | 'POLICY';
}

export interface StatItem {
  readonly value: string;
  readonly percent?: boolean;
  readonly label: string;
  readonly description: string;
  readonly icon?: 'branches' | 'members' | 'trainers' | 'rating';
}
