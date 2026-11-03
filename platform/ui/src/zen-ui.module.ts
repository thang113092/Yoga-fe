import { ZenIconComponent } from './zen-icon.component';
import { ZenButtonComponent } from './zen-button.component';
import { ZenInputComponent } from './zen-input.component';
import { ZenSelectComponent } from './zen-select.component';
import { ZenSearchComponent } from './zen-search.component';
import { ZenPageHeaderComponent } from './zen-page-header.component';
import { ZenCardComponent } from './zen-card.component';
import { ZenBadgeComponent } from './zen-badge.component';
import { ZenStatCardComponent } from './zen-stat-card.component';
import { ZenEmptyStateComponent } from './zen-empty-state.component';
import { ZenTabsComponent } from './zen-tabs.component';
import { ZenModalComponent } from './zen-modal.component';
import { ZenAlertComponent } from './zen-alert.component';
import { ZenLoadingComponent } from './zen-loading.component';
import { ZenPaginationComponent } from './zen-pagination.component';
import { ZenToolbarComponent } from './zen-toolbar.component';
import { ZenAvatarComponent } from './zen-avatar.component';

/** Import một lần trong `imports` của component để dùng toàn bộ bộ UI An Yên. */
export const ZEN_UI = [
  ZenIconComponent,
  ZenButtonComponent,
  ZenInputComponent,
  ZenSelectComponent,
  ZenSearchComponent,
  ZenPageHeaderComponent,
  ZenCardComponent,
  ZenBadgeComponent,
  ZenStatCardComponent,
  ZenEmptyStateComponent,
  ZenTabsComponent,
  ZenModalComponent,
  ZenAlertComponent,
  ZenLoadingComponent,
  ZenPaginationComponent,
  ZenToolbarComponent,
  ZenAvatarComponent
] as const;
