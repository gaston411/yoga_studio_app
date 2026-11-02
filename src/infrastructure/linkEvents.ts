/**
 * Spec 003 — Registro de tarjetas enviadas, para las métricas de activación y retención.
 * Vive aparte de la base principal: es solo de agregado y no toca saldos.
 */
import type { LinkSentEvent } from '../domain/myCard.ts';

const STORAGE_KEY = 'andrea_yoga_card_links_v1';
const MAX_EVENTS = 1000; // tope para no crecer sin límite en el navegador

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

/** Lee los envíos guardados. Si el dato está corrupto, empieza de cero en vez de romper la app. */
export function loadLinkEvents(): LinkSentEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e): e is LinkSentEvent =>
        typeof e === 'object' && e !== null &&
        typeof (e as LinkSentEvent).studentId === 'string' &&
        typeof (e as LinkSentEvent).sentAt === 'string'
    );
  } catch (err) {
    console.warn('[linkEvents] registro ilegible, se ignora', err instanceof Error ? err.message : err);
    return [];
  }
}

/** Agrega un envío al registro. */
export function recordLinkSent(studentId: string, sentAt: Date = new Date()): void {
  if (!canUseStorage()) return;
  const events = [...loadLinkEvents(), { studentId, sentAt: sentAt.toISOString() }].slice(-MAX_EVENTS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    // Almacenamiento lleno o bloqueado: la tarjeta igual se envía, solo se pierde la métrica.
    console.warn('[linkEvents] no se pudo guardar el envío', err instanceof Error ? err.message : err);
  }
}

/** Borra el registro (se usa al "Empezar de cero" con los datos de demostración). */
export function clearLinkEvents(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
