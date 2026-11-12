import { InjectionToken } from '@angular/core';

/** The subset of a player.js Player the player page uses. */
export interface EmbeddedPlayer {
  on(event: string, callback: (value?: any) => void): unknown;
  off(event: string, callback?: (value?: any) => void): unknown;
  setCurrentTime(seconds: number): void;
}

export type EmbeddedPlayerFactory = (iframe: HTMLIFrameElement) => EmbeddedPlayer;

/**
 * Lazily loads player.js (CommonJS/UMD) and returns a factory for players bound to an iframe.
 * The factory is only called after the iframe's 'load' event, so the player is marked loaded:
 * player.js otherwise waits for an onload it registers itself and would miss when created late.
 */
export const PLAYERJS_LOADER = new InjectionToken<() => Promise<EmbeddedPlayerFactory>>('PLAYERJS_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const mod: any = await import('player.js');
    const lib = mod?.default?.Player ? mod.default : mod;
    return (iframe: HTMLIFrameElement) => {
      const player = new lib.Player(iframe);
      player.loaded = true;
      return player as EmbeddedPlayer;
    };
  }
});

/** Options of a tus upload, as passed by the management page. */
export interface TusUploadOptions {
  endpoint: string;
  retryDelays: number[];
  headers: Record<string, string>;
  metadata: Record<string, string>;
  onProgress: (bytesSent: number, bytesTotal: number) => void;
  onError: (error: Error) => void;
  onSuccess: () => void;
}

export interface TusUpload {
  start(): void;
  abort(shouldTerminate?: boolean): Promise<void> | void;
}

export type TusUploadFactory = (file: File, options: TusUploadOptions) => TusUpload;

/** Lazily loads tus-js-client so the upload code is only fetched on the management page. */
export const TUS_LOADER = new InjectionToken<() => Promise<TusUploadFactory>>('TUS_LOADER', {
  providedIn: 'root',
  factory: () => async () => {
    const tus = await import('tus-js-client');
    return (file: File, options: TusUploadOptions) => new tus.Upload(file, options);
  }
});
