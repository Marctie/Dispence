import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/**
 * Condivide un testo: menu di condivisione nativo su Android, Web Share su iPhone/browser,
 * altrimenti copia negli appunti. Restituisce 'copied' se è stato copiato invece che condiviso.
 */
export async function shareText(title: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
