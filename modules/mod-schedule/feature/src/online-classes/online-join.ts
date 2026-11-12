import { Observable } from 'rxjs';
import { OnlineJoinResp } from '@yoga/mod-schedule/data-access';

/** Students may enter an online class this many minutes before it starts. */
export const ONLINE_JOIN_LEAD_MINUTES = 15;

/** Join opens shortly before class and stays open until it ends, so a dropped connection can rejoin. */
export function isInOnlineJoinWindow(startTime: string, endTime: string, now: number): boolean {
  return now >= Date.parse(startTime) - ONLINE_JOIN_LEAD_MINUTES * 60_000 && now < Date.parse(endTime);
}

/** The moment the join button of a class becomes available. */
export function onlineJoinOpensAt(startTime: string): Date {
  return new Date(Date.parse(startTime) - ONLINE_JOIN_LEAD_MINUTES * 60_000);
}

/**
 * Opens a blank tab synchronously (inside the click, so pop-up blockers allow it), then sends it to the
 * personal Zoom link once the backend answers. The blank tab is closed again when joining is refused.
 */
export function openOnlineJoin(
  join: Observable<OnlineJoinResp>,
  handlers: { joined: (res: OnlineJoinResp) => void; failed: (err: any) => void }
): void {
  const tab = window.open('', '_blank');
  join.subscribe({
    next: (res) => {
      if (tab) {
        tab.opener = null;
        tab.location.href = res.joinUrl;
      } else {
        window.location.href = res.joinUrl;
      }
      handlers.joined(res);
    },
    error: (err) => {
      tab?.close();
      handlers.failed(err);
    }
  });
}
