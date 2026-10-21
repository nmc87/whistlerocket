/**
 * Dezelfde code draait als Windows-programma (Tauri) en als website.
 * Hier zitten de paar dingen die per omgeving anders werken.
 */

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Tekstbestand opslaan: in het programma via een opslagvenster, op het web als download. */
export async function saveTextFile(fileName: string, content: string, mime = 'application/json'): Promise<boolean> {
  if (isDesktop()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const ext = fileName.split('.').pop() ?? 'txt';
    const path = await save({ defaultPath: fileName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
    if (!path) return false;
    await writeTextFile(path, content);
    return true;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Melding van het systeem; stil als het niet mag of niet kan. */
export async function notify(title: string, body: string): Promise<void> {
  try {
    if (isDesktop()) {
      const n = await import('@tauri-apps/plugin-notification');
      let granted = await n.isPermissionGranted();
      if (!granted) granted = (await n.requestPermission()) === 'granted';
      if (granted) n.sendNotification({ title, body });
      return;
    }
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') await Notification.requestPermission();
    if (Notification.permission === 'granted') new Notification(title, { body });
  } catch {
    // Een melding is een extraatje; de app werkt ook zonder.
  }
}

/** Korte fluittoon (past bij de naam) als een afteller klaar is. */
export function whistle(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.35);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.6);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);
    osc.onended = () => void ctx.close();
  } catch {
    // Geen geluid beschikbaar.
  }
}

/** Link openen in de gewone browser (in het programma via Windows, op het web in een nieuw tabblad). */
export async function openExternal(url: string): Promise<void> {
  if (!/^https:\/\//.test(url)) return;
  if (isDesktop()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
