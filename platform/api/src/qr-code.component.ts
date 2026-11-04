import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'yoga-qr-code', standalone: true,
  template: `@if (image()) { <img [src]="image()" alt="Mã QR đặt chỗ" width="240" height="240" /> }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrCodeComponent {
  // Not required: the effect may run before the first binding when the component appears inside control flow.
  readonly value = input<string>('');
  protected readonly image = signal('');
  constructor() {
    effect(onCleanup => {
      let active = true;
      this.image.set('');
      const value = this.value();
      if (!value) return;
      void toDataURL(value, { width: 240, margin: 4, errorCorrectionLevel: 'M' })
        .then(data => { if (active) this.image.set(data); })
        .catch(() => { if (active) this.image.set(''); });
      onCleanup(() => { active = false; });
    });
  }
}
