import { ChangeDetectionStrategy, Component, effect, input, signal } from '@angular/core';
import { toDataURL } from 'qrcode';

@Component({
  selector: 'yoga-qr-code', standalone: true,
  template: `@if (image()) { <img [src]="image()" alt="Mã QR đặt chỗ" width="240" height="240" /> }`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrCodeComponent {
  readonly value = input.required<string>();
  protected readonly image = signal('');
  constructor() {
    effect(onCleanup => {
      let active = true;
      this.image.set('');
      void toDataURL(this.value(), { width: 240, margin: 4, errorCorrectionLevel: 'M' })
        .then(data => { if (active) this.image.set(data); })
        .catch(() => { if (active) this.image.set(''); });
      onCleanup(() => { active = false; });
    });
  }
}
