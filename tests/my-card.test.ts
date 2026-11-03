import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildCardSnapshot,
  encodeCardLink,
  decodeCardHash,
  buildPlaceRequestLink,
  computeLinkMetrics,
  CardSnapshot,
} from '../src/domain/myCard.ts';
import { Database } from '../src/infrastructure/db.ts';
import { PackageService, NO_BALANCE_MESSAGE } from '../src/domain/packages.ts';
import { SessionService } from '../src/domain/sessions.ts';

/** Spec 003 — "Mi tarjeta en un toque". Un test por criterio, CA1…CA6. */

const STUDIO_PHONE = '+5491100000000';
const BASE = 'https://demo.example/';
const NOW = new Date(2026, 10, 3, 10, 0); // martes 3/11/2026 10:00 local

const inDays = (days: number, h: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

describe('Spec 003 — Mi tarjeta en un toque', () => {
  let db: Database;
  let packages: PackageService;
  let sessions: SessionService;
  let camilaId: string;

  beforeEach(() => {
    db = new Database(false);
    packages = new PackageService(db);
    sessions = new SessionService(db, packages);
    camilaId = db.createStudent({ name: 'Camila Rossi', phone: '+5491100000001' }).id;
    db.createStudent({ name: 'Valentina Gomez', phone: '+5491100000002' });
    packages.createPackage(camilaId, 10);
  });

  it('CA1 — El link devuelve la misma tarjeta, sin teléfono ni datos de otras alumnas', () => {
    sessions.createSession({ instructor_name: 'Marta', start_time: inDays(1, 19), max_capacity: 12 });
    const snap = buildCardSnapshot(db, camilaId, NOW, STUDIO_PHONE)!;
    const url = encodeCardLink(snap, BASE);

    expect(url.startsWith(`${BASE}#t=`)).toBe(true);
    const decoded = decodeCardHash(url.slice(url.indexOf('#')));
    expect(decoded).toEqual(snap);
    expect(decoded!.name).toBe('Camila');
    expect(decoded!.remaining).toBe(10);
    expect(decoded!.total).toBe(10);
    expect(decoded!.history).toHaveLength(1);
    expect(decoded!.classes).toHaveLength(1);

    const json = JSON.stringify(decoded);
    expect(json).not.toContain('5491100000001');
    expect(json).not.toContain('Rossi');
    expect(json).not.toContain('Valentina');
  });

  it('CA2 — Un link roto, alterado, de otra versión o demasiado largo devuelve null sin lanzar', () => {
    const snap = buildCardSnapshot(db, camilaId, NOW, STUDIO_PHONE)!;
    const good = encodeCardLink(snap, BASE);
    const hash = good.slice(good.indexOf('#'));
    const otherVersion = encodeCardLink({ ...snap, v: 99 } as unknown as CardSnapshot, BASE);
    const negative = encodeCardLink({ ...snap, remaining: -3 }, BASE);

    for (const bad of [
      '',
      '#',
      '#t=',
      '#t=%%%no-base64',
      hash.slice(0, hash.length - 10),
      otherVersion.slice(otherVersion.indexOf('#')),
      negative.slice(negative.indexOf('#')),
      `#t=${'A'.repeat(4001)}`,
      encodeCardLink({ ...snap, at: '2026-11-03' }, BASE).split(BASE)[1], // sin zona horaria
    ]) {
      expect(() => decodeCardHash(bad)).not.toThrow();
      expect(decodeCardHash(bad)).toBeNull();
    }
  });

  it('CA3 — Solo clases futuras, no canceladas, en orden, máximo 5, con lugares libres', () => {
    const past = sessions.createSession({ instructor_name: 'Sofía', start_time: inDays(0, 8), max_capacity: 12 });
    const cancelled = sessions.createSession({ instructor_name: 'Sofía', start_time: inDays(1, 9), max_capacity: 12 });
    db.updateSession(cancelled.id, { status: 'CANCELLED' });
    const tooFar = sessions.createSession({ instructor_name: 'Sofía', start_time: inDays(8, 9), max_capacity: 12 });
    const ids: string[] = [];
    for (const day of [6, 5, 4, 3, 2, 1]) {
      ids.push(sessions.createSession({ instructor_name: 'Marta', start_time: inDays(day, 19), max_capacity: 2 }).id);
    }
    const tomorrow = ids[ids.length - 1];
    const other = db.createStudent({ name: 'Lucia Alvarez', phone: '+5491100000003' }).id;
    db.createBooking({ session_id: tomorrow, student_id: other, booking_status: 'CONFIRMED' });
    db.createBooking({ session_id: tomorrow, student_id: camilaId, booking_status: 'ATTENDED' });

    const snap = buildCardSnapshot(db, camilaId, NOW, STUDIO_PHONE)!;
    const shown = snap.classes.map((c) => c.id);

    expect(shown).toHaveLength(5);
    expect(shown).not.toContain(past.id);
    expect(shown).not.toContain(cancelled.id);
    expect(shown).not.toContain(tooFar.id);
    expect(shown[0]).toBe(tomorrow);
    const times = snap.classes.map((c) => new Date(c.start).getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(snap.classes[0].free).toBe(0);
    expect(snap.classes[1].free).toBe(2);
  });

  it('CA4 — "Pedir lugar" arma un wa.me al estudio con la clase; si está llena pide lista de espera', () => {
    const open = sessions.createSession({ instructor_name: 'Marta', start_time: inDays(1, 19), max_capacity: 12 });
    const full = sessions.createSession({ instructor_name: 'Sofía', start_time: inDays(2, 8), max_capacity: 1 });
    const other = db.createStudent({ name: 'Lucia Alvarez', phone: '+5491100000003' }).id;
    db.createBooking({ session_id: full.id, student_id: other, booking_status: 'CONFIRMED' });
    const snap = buildCardSnapshot(db, camilaId, NOW, STUDIO_PHONE)!;

    const link = buildPlaceRequestLink(snap, open.id)!;
    expect(link.startsWith('https://wa.me/5491100000000?text=')).toBe(true);
    const text = decodeURIComponent(link.split('?text=')[1]);
    expect(link.split('?text=')[1]).toBe(encodeURIComponent(text));
    expect(text).toContain('Camila');
    expect(text).toContain('19:00');
    expect(text).toContain('Marta');
    expect(text).toContain('mié 04/11');
    expect(text).not.toContain('espera');

    const waitText = decodeURIComponent(buildPlaceRequestLink(snap, full.id)!.split('?text=')[1]);
    expect(waitText).toContain('lista de espera');
    expect(waitText).toContain('08:00');

    expect(buildPlaceRequestLink(snap, 'no-existe')).toBeNull();
  });

  it('CA5 — Sin saldo no hay link para pedir lugar y se usa el mensaje sobrio', () => {
    const s = sessions.createSession({ instructor_name: 'Marta', start_time: inDays(1, 19), max_capacity: 12 });
    const pkg = packages.getActivePackage(camilaId)!;
    packages.adjustBalance(pkg.id, -10, 'Prueba: paquete agotado');
    const snap = buildCardSnapshot(db, camilaId, NOW, STUDIO_PHONE)!;

    expect(snap.remaining).toBe(0);
    expect(buildPlaceRequestLink(snap, s.id)).toBeNull();
    expect(NO_BALANCE_MESSAGE).toBe('No te quedan clases. Habla con Andrea para renovar tu paquete.');
  });

  it('CA6 — Métricas de activación y retención sin división por cero', () => {
    expect(computeLinkMetrics([], [], NOW)).toEqual({ sent: 0, students: 0, activationPercent: 0, retentionPercent: 0 });

    const sentAt = new Date(2026, 10, 1, 10, 0).toISOString();
    const lucia = 'lucia';
    const sofia = 'sofia';
    const booking = (student_id: string, day: number) => ({
      id: `${student_id}-${day}`,
      session_id: `s${day}`,
      student_id,
      booking_status: 'CONFIRMED' as const,
      waitlist_position: null,
      created_at: new Date(2026, 10, day, 12, 0).toISOString(),
    });
    const events = [
      { studentId: camilaId, sentAt },
      { studentId: camilaId, sentAt }, // segundo envío a la misma alumna: cuenta como envío, no como alumna nueva
      { studentId: lucia, sentAt },
      { studentId: sofia, sentAt },
    ];
    const bookings = [
      booking(camilaId, 2), booking(camilaId, 9), // activa y retenida
      booking(lucia, 6),                          // activa
      booking(sofia, 20),                         // fuera de ventana
      booking(lucia, 1 - 5),                      // anterior al envío: no cuenta
      { ...booking(sofia, 3), booking_status: 'CANCELLED' as const },  // cancelada: no cuenta
      { ...booking(sofia, 4), booking_status: 'WAITLISTED' as const }, // en espera: no cuenta
    ];

    expect(computeLinkMetrics(events, bookings, NOW)).toEqual({
      sent: 4,
      students: 3,
      activationPercent: 66,
      retentionPercent: 33,
    });
  });
});
