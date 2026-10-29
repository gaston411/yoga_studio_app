/**
 * Spec 002 — "Hoy": el estudio de un vistazo.
 * Funciones puras: reciben datos ya leídos y devuelven textos con la voz "Calma Activa".
 */
import type { Database } from '../infrastructure/db.ts';

export interface TodayClass {
  id: string;
  startTime: string; // ISO 8601
  instructor: string;
  taken: number; // CONFIRMED + ATTENDED
  capacity: number;
  waiting: number;
  cancelled: boolean;
}

export interface Summary {
  title: string;
  detail: string;
}

export interface Occupancy {
  percent: number;
  label: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function buildTodaySummary(classes: TodayClass[], now: Date): Summary {
  const active = classes
    .filter((c) => !c.cancelled)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (active.length === 0) {
    return { title: 'Hoy no hay clases.', detail: 'Día para respirar.' };
  }

  const next = active.find((c) => new Date(c.startTime).getTime() > now.getTime());
  if (!next) {
    return {
      title: 'Por hoy, namasté.',
      detail: `Terminaste ${active.length === 1 ? 'la clase' : `las ${active.length} clases`}.`,
    };
  }

  const minutes = Math.ceil((new Date(next.startTime).getTime() - now.getTime()) / 60000);
  const when = minutes < 60 ? `en ${minutes} min` : `a las ${formatTime(next.startTime)}`;
  return {
    title: `Hoy fluyes con ${plural(active.length, 'clase', 'clases')}.`,
    detail: `La próxima empieza ${when}. Todo listo.`,
  };
}

export function weeklyOccupancy(classes: TodayClass[]): Occupancy {
  const active = classes.filter((c) => !c.cancelled);
  const capacity = active.reduce((sum, c) => sum + c.capacity, 0);
  if (capacity === 0) {
    return { percent: 0, label: 'Semana en blanco. Agenda la primera clase.' };
  }
  const taken = active.reduce((sum, c) => sum + Math.min(c.taken, c.capacity), 0);
  const percent = Math.floor((taken / capacity) * 100);

  let label = 'Mucho espacio para respirar.';
  if (percent >= 100) label = 'Lleno total. Hora de abrir otra clase.';
  else if (percent >= 85) label = 'El estudio está en perfecta armonía.';
  else if (percent >= 40) label = 'Buen ritmo.';
  return { percent, label };
}

export function attendanceMessage(name: string): string {
  return `Mat desplegado. ${name} ya está en la sala.`;
}

/** Adaptador: lee de la base las clases entre dos fechas y las pasa al formato de la pantalla. */
export function loadClasses(db: Database, from: Date, to: Date): TodayClass[] {
  return db
    .getAllSessions()
    .filter((s) => {
      const t = new Date(s.start_time).getTime();
      return t >= from.getTime() && t < to.getTime();
    })
    .map((s) => {
      const bookings = db.getBookingsBySessionId(s.id);
      return {
        id: s.id,
        startTime: s.start_time,
        instructor: s.instructor_name,
        taken: bookings.filter((b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'ATTENDED').length,
        capacity: s.max_capacity,
        waiting: bookings.filter((b) => b.booking_status === 'WAITLISTED').length,
        cancelled: s.status === 'CANCELLED',
      };
    });
}

export function dayRange(now: Date): [Date, Date] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

export function weekRange(now: Date): [Date, Date] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // lunes
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return [start, end];
}
