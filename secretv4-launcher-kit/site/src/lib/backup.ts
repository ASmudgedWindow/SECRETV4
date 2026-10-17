/**
 * Save backup: copies everything this browser remembers for SecretV4 (settings, favorites, play history,
 * and the saves of games that keep them in browser storage) into a file, and restores it later.
 */
const MARKER = 'secretv4-backup';

/** Downloads the backup file. Returns how many items were saved. */
export function exportBackup(): number {
  const data: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k === null) continue;
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    }
  } catch {
    // ignore
  }
  const payload = { app: MARKER, version: 1, savedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `secretv4-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Object.keys(data).length;
}

/** Restores a backup file. Returns how many items were restored, or throws a readable error. */
export async function importBackup(file: File): Promise<number> {
  if (file.size > 20 * 1024 * 1024) throw new Error('That file is too big to be a SecretV4 backup.');
  let parsed: { app?: string; data?: unknown };
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not a valid backup.');
  }
  if (!parsed || parsed.app !== MARKER || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('That file is not a SecretV4 backup.');
  }
  let n = 0;
  for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    try {
      localStorage.setItem(k, v);
      n++;
    } catch {
      throw new Error('Your browser ran out of storage space.');
    }
  }
  return n;
}
