import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../src/infrastructure/db.ts';
import {
  PackageService,
  PackageError,
  NO_BALANCE_MESSAGE,
} from '../src/domain/packages.ts';

/**
 * Spec 001 — Saldo de paquete verificable (tarjeta digital).
 * Un test por criterio de aceptación, nombrados CA1…CA5.
 */
describe('Spec 001 — Saldo de paquete verificable', () => {
  let db: Database;
  let service: PackageService;
  let studentId: string;
  let tuesdayClassId: string;

  const sumDeltas = (packageId: string) =>
    service.getPackageAuditLog(packageId).reduce((acc, l) => acc + l.delta, 0);

  const expectError = (fn: () => unknown, code: string) => {
    try {
      fn();
    } catch (e) {
      expect(e).toBeInstanceOf(PackageError);
      expect((e as PackageError).code).toBe(code);
      return e as PackageError;
    }
    throw new Error(`Se esperaba el error ${code}`);
  };

  /** Deja a la alumna con un paquete activo y el saldo indicado, usando solo el dominio. */
  const givenBalance = (balance: number) => {
    const pkg = service.createPackage(studentId);
    if (balance < 10) service.adjustBalance(pkg.id, balance - 10, 'Preparación del test');
    return pkg.id;
  };

  beforeEach(() => {
    db = new Database();
    service = new PackageService(db);
    studentId = db.createStudent({ name: 'Lucía Méndez', phone: '+5491100000015' }).id;
    tuesdayClassId = db.createSession({
      instructor_name: 'Instructora 1',
      start_time: '2026-11-03T19:00:00-03:00',
    }).id;
  });

  it('CA1 — Alta de paquete: saldo 10 y 1 entrada PACKAGE_CREATED con +10', () => {
    const pkg = service.createPackage(studentId);
    const card = service.getCard(studentId);

    expect(card.remainingClasses).toBe(10);
    expect(card.history).toHaveLength(1);
    expect(card.history[0].reason).toBe('PACKAGE_CREATED');
    expect(card.history[0].delta).toBe(10);
    expect(card.history[0].performed_by).toBe('ADMIN');
    expect(pkg.status).toBe('ACTIVE');
  });

  it('CA2 — Asistencia descuenta 1 y deja rastro con fecha, clase e instructora', () => {
    givenBalance(5);

    service.registerAttendance(studentId, tuesdayClassId, 'INSTRUCTOR');
    const card = service.getCard(studentId);
    const last = card.history[0];

    expect(card.remainingClasses).toBe(4);
    expect(last.delta).toBe(-1);
    expect(last.reason).toBe('CLASS_ATTENDED');
    expect(last.session_id).toBe(tuesdayClassId);
    expect(last.performed_by).toBe('INSTRUCTOR');
    expect(Number.isNaN(Date.parse(last.timestamp))).toBe(false);
  });

  it('CA3 — Sin doble descuento: segunda marca en la misma clase se rechaza con ALREADY_REGISTERED', () => {
    givenBalance(5);
    service.registerAttendance(studentId, tuesdayClassId, 'INSTRUCTOR');

    expectError(
      () => service.registerAttendance(studentId, tuesdayClassId, 'INSTRUCTOR'),
      'ALREADY_REGISTERED'
    );
    expect(service.getCard(studentId).remainingClasses).toBe(4);
  });

  it('CA4 — Saldo nunca negativo: de 1 pasa a 0 (EXHAUSTED) y el siguiente intento da NO_BALANCE', () => {
    givenBalance(1);
    const otherClassId = db.createSession({
      instructor_name: 'Andrea',
      start_time: '2026-11-05T19:00:00-03:00',
    }).id;

    service.registerAttendance(studentId, tuesdayClassId, 'INSTRUCTOR');
    const card = service.getCard(studentId);
    expect(card.remainingClasses).toBe(0);
    expect(card.package?.status).toBe('EXHAUSTED');

    const err = expectError(
      () => service.registerAttendance(studentId, otherClassId, 'INSTRUCTOR'),
      'NO_BALANCE'
    );
    expect(err.message).toBe(NO_BALANCE_MESSAGE);
    expect(err.message).toBe('No te quedan clases. Habla con Andrea para renovar tu paquete.');
    expect(service.getCard(studentId).remainingClasses).toBe(0);
  });

  it('CA5 — El historial explica el saldo y un ajuste sin nota se rechaza', () => {
    const pkgId = givenBalance(10);
    service.registerAttendance(studentId, tuesdayClassId, 'INSTRUCTOR');
    service.adjustBalance(pkgId, 1, 'Se marcó por error');

    const pkg = service.getPackageById(pkgId)!;
    expect(sumDeltas(pkgId)).toBe(pkg.remaining_classes);

    const historyBefore = service.getPackageAuditLog(pkgId).length;
    expectError(() => service.adjustBalance(pkgId, 1, '   '), 'NOTE_REQUIRED');
    expect(service.getPackageAuditLog(pkgId)).toHaveLength(historyBefore);
    expect(sumDeltas(pkgId)).toBe(service.getPackageById(pkgId)!.remaining_classes);
  });
});
