import { describe, it, expect } from 'vitest';
import {
  buildTodaySummary,
  weeklyOccupancy,
  attendanceMessage,
  TodayClass,
} from '../src/domain/today.ts';
import { Database } from '../src/infrastructure/db.ts';
import { PackageService } from '../src/domain/packages.ts';
import { SessionService } from '../src/domain/sessions.ts';

/** Spec 002 — "Hoy": el estudio de un vistazo. Un test por criterio, CA1…CA5. */

const at = (h: number, m: number) => {
  const d = new Date(2026, 10, 3); // martes 3 de noviembre de 2026, hora local
  d.setHours(h, m, 0, 0);
  return d;
};

const cls = (h: number, m: number, extra: Partial<TodayClass> = {}): TodayClass => ({
  id: `${h}:${m}`,
  startTime: at(h, m).toISOString(),
  instructor: 'Marta',
  taken: 0,
  capacity: 12,
  waiting: 0,
  cancelled: false,
  ...extra,
});

describe('Spec 002 — Hoy en el estudio', () => {
  const today = [cls(9, 30), cls(19, 0), cls(20, 15)];

  it('CA1 — Resumen del día con la próxima clase', () => {
    const summary = buildTodaySummary(today, at(18, 40));
    expect(summary.title).toBe('Hoy fluyes con 3 clases.');
    expect(summary.detail).toBe('La próxima empieza en 20 min. Todo listo.');

    const morning = buildTodaySummary(today, at(7, 0));
    expect(morning.detail).toBe('La próxima empieza a las 09:30. Todo listo.');
  });

  it('CA2 — Día sin clases y día terminado', () => {
    expect(buildTodaySummary([], at(10, 0)).title).toBe('Hoy no hay clases.');
    expect(buildTodaySummary([], at(10, 0)).detail).toBe('Día para respirar.');

    const night = buildTodaySummary(today, at(22, 0));
    expect(night.title).toBe('Por hoy, namasté.');
    expect(night.detail).toBe('Terminaste las 3 clases.');
  });

  it('CA3 — Las clases canceladas no cuentan', () => {
    const withCancelled = [cls(9, 30), cls(19, 0, { cancelled: true, taken: 12 }), cls(20, 15, { taken: 6 })];
    expect(buildTodaySummary(withCancelled, at(8, 0)).title).toBe('Hoy fluyes con 2 clases.');
    expect(weeklyOccupancy(withCancelled).percent).toBe(25); // 6 de 24

    expect(buildTodaySummary([cls(19, 0)], at(8, 0)).title).toBe('Hoy fluyes con 1 clase.');
  });

  it('CA4 — Termómetro de ocupación semanal', () => {
    const harmony = weeklyOccupancy([cls(19, 0, { taken: 10 }), cls(20, 15, { taken: 11 })]);
    expect(harmony.percent).toBe(87);
    expect(harmony.label).toBe('El estudio está en perfecta armonía.');

    expect(weeklyOccupancy([cls(19, 0, { taken: 12 }), cls(20, 15, { taken: 12 })]).label)
      .toBe('Lleno total. Hora de abrir otra clase.');
    expect(weeklyOccupancy([cls(19, 0, { taken: 6 })]).label).toBe('Buen ritmo.');
    expect(weeklyOccupancy([cls(19, 0, { taken: 2 })]).label).toBe('Mucho espacio para respirar.');
    expect(weeklyOccupancy([]).label).toBe('Semana en blanco. Agenda la primera clase.');
  });

  it('CA5 — Asistencia en un toque: ATTENDED, descuenta 1 y confirma con la voz de marca', () => {
    const db = new Database();
    const packages = new PackageService(db);
    const sessions = new SessionService(db, packages);
    const lucia = db.createStudent({ name: 'Lucía', phone: '+5491100000099' });
    const pkg = packages.createPackage(lucia.id);
    packages.adjustBalance(pkg.id, -5, 'Preparación del test');
    const session = db.createSession({ instructor_name: 'Marta', start_time: at(19, 0).toISOString() });
    db.createBooking({ session_id: session.id, student_id: lucia.id, booking_status: 'CONFIRMED' });

    const booking = sessions.markAttendance(session.id, lucia.id);

    expect(booking.booking_status).toBe('ATTENDED');
    expect(packages.getCard(lucia.id).remainingClasses).toBe(4);
    expect(attendanceMessage('Lucía')).toBe('Mat desplegado. Lucía ya está en la sala.');
  });
});
