const STORAGE_KEY = 'yoga.video.deviceKey';
let memoryKey: string | null = null;

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // fall through to Math.random
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * A random id for this browser, used by the backend to count devices watching at once.
 * Kept in localStorage; when storage is unavailable (private mode, blocked) an in-memory id is used.
 */
export function videoDeviceKey(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const created = memoryKey ?? randomId();
    localStorage.setItem(STORAGE_KEY, created);
    memoryKey = created;
    return created;
  } catch {
    memoryKey ??= randomId();
    return memoryKey;
  }
}
