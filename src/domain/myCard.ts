/**
 * Spec 003 — "Mi tarjeta en un toque".
 *
 * La app no tiene servidor: los datos viven en el navegador de Andrea. Para que la alumna vea su
 * tarjeta en SU celular, el link lleva una foto de solo lectura de la tarjeta en el fragmento `#t=`
 * de la URL. El fragmento no viaja al servidor, así que Vercel nunca lo registra.
 */
import { Booking, Database } from '../infrastructure/db.ts';
import { generateWhatsAppLink } from './notifications.ts';

export const CARD_VERSION = 1;
export const MAX_HASH_LENGTH = 4000;
const MAX_HISTORY = 5;
const MAX_CLASSES = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const UPCOMING_WINDOW_DAYS = 7;
const ACTIVATION_WINDOW_DAYS = 7;
const RETENTION_WINDOW_DAYS = 14;

export interface CardHistoryEntry {
  at: string; // ISO 8601
  delta: number;
  reason: string; // código de AuditReason; la UI lo traduce
}

export interface CardClass {
  id: string;
  start: string; // ISO 8601
  instructor: string;
  free: number;
  capacity: number;
}

export interface CardSnapshot {
  v: typeof CARD_VERSION;
  name: string; // solo nombre de pila
  remaining: number;
  total: number;
  history: CardHistoryEntry[]; // más reciente primero
  classes: CardClass[]; // en orden horario
  studioPhone: string;
  at: string; // momento de la foto, ISO 8601
}

export interface LinkSentEvent {
  studentId: string;
  sentAt: string;
}

export interface LinkMetrics {
  sent: number;
  students: number;
  activationPercent: number;
  retentionPercent: number;
}

/**
 * Arma la foto de la tarjeta que viaja en el link.
 *
 * Args:
 *   db: Base de datos de la app de Andrea.
 *   studentId: Alumna a la que se le envía la tarjeta.
 *   now: Momento actual; define qué clases son "próximas".
 *   studioPhone: Teléfono del estudio al que la alumna pide lugar.
 *
 * Returns:
 *   La foto de la tarjeta, o null si la alumna no existe o no tiene paquete.
 */
export function buildCardSnapshot(
  db: Database,
  studentId: string,
  now: Date,
  studioPhone: string
): CardSnapshot | null {
  const student = db.getStudentById(studentId);
  if (!student) return null;

  const packages = db.getPackagesByStudentId(studentId);
  const pkg = packages.find((p) => p.status === 'ACTIVE') ?? packages[packages.length - 1];
  if (!pkg) return null;

  const history = db
    .getAuditLogsByPackageId(pkg.id)
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_HISTORY)
    .map((log) => ({ at: log.timestamp, delta: log.delta, reason: log.reason }));

  const from = now.getTime();
  const to = from + UPCOMING_WINDOW_DAYS * DAY_MS;
  const classes = db
    .getAllSessions()
    .filter((s) => {
      const t = new Date(s.start_time).getTime();
      return s.status !== 'CANCELLED' && t > from && t <= to;
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, MAX_CLASSES)
    .map((s) => {
      const taken = db
        .getBookingsBySessionId(s.id)
        .filter((b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'ATTENDED').length;
      return {
        id: s.id,
        start: s.start_time,
        instructor: s.instructor_name,
        free: Math.max(0, s.max_capacity - taken),
        capacity: s.max_capacity,
      };
    });

  return {
    v: CARD_VERSION,
    name: firstName(student.name),
    remaining: pkg.remaining_classes,
    total: pkg.total_classes,
    history,
    classes,
    studioPhone,
    at: now.toISOString(),
  };
}

/** Arma el link completo: `${baseUrl}#t=<base64url del JSON>`. */
export function encodeCardLink(snapshot: CardSnapshot, baseUrl: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${baseUrl}#t=${encoded}`;
}

/**
 * Lee la tarjeta desde el fragmento de la URL.
 *
 * Es el borde de entrada de datos externos: cualquiera puede editar un link. Por eso valida todo
 * y nunca lanza; ante cualquier duda devuelve null y la UI muestra un mensaje sobrio.
 *
 * Args:
 *   hash: `location.hash`, por ejemplo `#t=eyJ2Ijox...`.
 *
 * Returns:
 *   La tarjeta validada, o null si el link es inválido.
 */
export function decodeCardHash(hash: string): CardSnapshot | null {
  if (typeof hash !== 'string' || hash.length > MAX_HASH_LENGTH || !hash.startsWith('#t=')) return null;
  const encoded = hash.slice(3);
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return isCardSnapshot(data) ? data : null;
  } catch {
    // Link roto o alterado: es un error esperado, no un fallo técnico.
    return null;
  }
}

/**
 * Arma el wa.me para que la alumna le pida lugar a Andrea.
 *
 * Returns:
 *   El link, o null si no tiene saldo o la clase no está en su tarjeta.
 */
export function buildPlaceRequestLink(snapshot: CardSnapshot, classId: string): string | null {
  if (snapshot.remaining <= 0) return null;
  const cls = snapshot.classes.find((c) => c.id === classId);
  if (!cls) return null;
  const when = `${formatDay(cls.start)} a las ${formatTime(cls.start)} con ${cls.instructor}`;
  const message =
    cls.free > 0
      ? `Hola Andrea, soy ${snapshot.name}. ¿Me guardas un lugar en la clase del ${when}?`
      : `Hola Andrea, soy ${snapshot.name}. La clase del ${when} está llena. ¿Me anotas en la lista de espera?`;
  return generateWhatsAppLink(snapshot.studioPhone, message);
}

/** Arma el wa.me con el que Andrea le manda la tarjeta a la alumna. */
export function buildSendCardLink(studentPhone: string, studentName: string, cardUrl: string): string {
  const message = `Hola ${firstName(studentName)} 🌿 Aquí está tu tarjeta del estudio. Ves tu saldo y pides lugar en un toque: ${cardUrl}`;
  return generateWhatsAppLink(studentPhone, message);
}

/**
 * Calcula activación y retención de los links enviados (CA6).
 *
 * Cada alumna cuenta una vez, desde su primer envío. Activación: reservó en los 7 días siguientes.
 * Retención: reservó 2 o más veces en los 14 días siguientes. Porcentajes redondeados hacia abajo.
 */
export function computeLinkMetrics(events: LinkSentEvent[], bookings: Booking[], now: Date): LinkMetrics {
  const firstSent = new Map<string, number>();
  for (const e of events) {
    const t = new Date(e.sentAt).getTime();
    if (Number.isNaN(t) || t > now.getTime()) continue;
    const prev = firstSent.get(e.studentId);
    if (prev === undefined || t < prev) firstSent.set(e.studentId, t);
  }

  const bookingsByStudent = new Map<string, number[]>();
  for (const b of bookings) {
    if (!firstSent.has(b.student_id)) continue;
    const list = bookingsByStudent.get(b.student_id) ?? [];
    list.push(new Date(b.created_at).getTime());
    bookingsByStudent.set(b.student_id, list);
  }

  let activated = 0;
  let retained = 0;
  for (const [studentId, sentAt] of firstSent) {
    const times = bookingsByStudent.get(studentId) ?? [];
    const within = (days: number) => times.filter((t) => t >= sentAt && t <= sentAt + days * DAY_MS).length;
    if (within(ACTIVATION_WINDOW_DAYS) >= 1) activated++;
    if (within(RETENTION_WINDOW_DAYS) >= 2) retained++;
  }

  const students = firstSent.size;
  const percent = (n: number) => (students === 0 ? 0 : Math.floor((n * 100) / students));
  return {
    sent: events.length,
    students,
    activationPercent: percent(activated),
    retentionPercent: percent(retained),
  };
}

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** "mié 04/11" en hora local. */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/** "19:00" en hora local, 24 h. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

// --- Validación del link (datos externos) ---

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isInt = (x: unknown, min: number, max: number): x is number =>
  Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const isText = (x: unknown, max: number): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const isIso = (x: unknown): x is string => isText(x, 40) && !Number.isNaN(Date.parse(x));

function isCardSnapshot(x: unknown): x is CardSnapshot {
  if (!isObject(x)) return false;
  if (x.v !== CARD_VERSION) return false;
  if (!isText(x.name, 40) || !isIso(x.at)) return false;
  if (typeof x.studioPhone !== 'string' || !/^\+?\d{6,15}$/.test(x.studioPhone)) return false;
  if (!isInt(x.total, 1, 100) || !isInt(x.remaining, 0, x.total as number)) return false;
  if (!Array.isArray(x.history) || x.history.length > MAX_HISTORY) return false;
  if (!Array.isArray(x.classes) || x.classes.length > MAX_CLASSES) return false;
  const historyOk = x.history.every(
    (h) => isObject(h) && isIso(h.at) && isInt(h.delta, -100, 100) && isText(h.reason, 30)
  );
  const classesOk = x.classes.every(
    (c) =>
      isObject(c) && isText(c.id, 64) && isIso(c.start) && isText(c.instructor, 30) &&
      isInt(c.capacity, 1, 100) && isInt(c.free, 0, c.capacity as number)
  );
  return historyOk && classesOk;
}

/** Teléfono del estudio en la demo (ficticio, AGENTS.md §6.3). */
export const STUDIO_PHONE = '+5491100000000';
