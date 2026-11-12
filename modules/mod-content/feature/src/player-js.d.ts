/** Minimal typing of player.js 0.1.0 (https://github.com/embedly/player.js), which ships no types. */
declare module 'player.js' {
  export interface PlayerJsTimeUpdate {
    seconds: number;
    duration: number;
  }

  export class Player {
    constructor(elem: HTMLIFrameElement | string, options?: unknown);
    isReady: boolean;
    on(event: 'timeupdate' | 'progress', callback: (value: PlayerJsTimeUpdate) => void, ctx?: unknown): boolean;
    on(event: string, callback: (value?: any) => void, ctx?: unknown): boolean;
    off(event: string, callback?: (value?: any) => void): boolean;
    supports(evtOrMethod: 'event' | 'method', names: string | string[]): boolean;
    play(): void;
    pause(): void;
    setCurrentTime(seconds: number): void;
    getCurrentTime(callback: (seconds: number) => void): void;
    getDuration(callback: (seconds: number) => void): void;
  }

  const playerjs: { Player: typeof Player; VERSION: string };
  export default playerjs;
}
