export type ZenConfirmType = 'delete' | 'cancel' | 'warning' | 'info';

export interface ZenConfirmOptions {
  title?: string;
  message: string;
  itemName?: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  type?: ZenConfirmType;
}

export interface ZenConfirmDeleteOptions {
  title?: string;
  message?: string;
  itemName?: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ZenConfirmCancelOptions {
  title?: string;
  message?: string;
  itemName?: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface ZenConfirmState {
  options: ZenConfirmOptions;
  resolve: (confirmed: boolean) => void;
}
