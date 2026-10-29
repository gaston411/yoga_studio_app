import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../src/infrastructure/db.ts';
import { PackageService } from '../src/domain/packages.ts';
import { SessionService } from '../src/domain/sessions.ts';

describe('Escenario 2 y 3: Control de Aforo (12 max) y Lista de Espera FIFO (BDD)', () => {
  let db: Database;
  let packageService: PackageService;
  let sessionService: SessionService;

  beforeEach(() => {
    db = new Database();
    packageService = new PackageService(db);
    sessionService = new SessionService(db, packageService);
  });

  it('Escenario 2: GIVEN una sesión vespertina con max_capacity = 12 con 12 reservas CONFIRMED, WHEN una 13ª alumna reserva, THEN no aumenta cupo confirmado, entra a WAITLIST con waitlist_position = 1, y NO se debita su saldo', () => {
    // 1. Crear sesión de tarde con cupo 12
    const session = sessionService.createSession({
      instructor_name: 'Instructora 1',
      start_time: new Date('2026-11-01T19:00:00Z').toISOString(),
      max_capacity: 12,
    });

    // 2. Crear 12 alumnas con paquetes activos y reservar para llenar la sesión
    for (let i = 1; i <= 12; i++) {
      const student = db.createStudent({ name: `Alumna ${i}`, phone: `+54911000000${i.toString().padStart(2, '0')}` });
      packageService.createPackage(student.id, 10, 'ADMIN');
      const booking = sessionService.bookSession(session.id, student.id);
      expect(booking.booking_status).toBe('CONFIRMED');
      expect(booking.waitlist_position).toBeNull();
    }

    // Comprobar que hay exactamente 12 confirmados
    const confirmedList = sessionService.getConfirmedBookings(session.id);
    expect(confirmedList.length).toBe(12);

    // 3. Decimotercera alumna solicita un lugar
    const student13 = db.createStudent({ name: 'Alumna 13', phone: '+5491100000013' });
    const pkg13 = packageService.createPackage(student13.id, 10, 'ADMIN');
    expect(pkg13.remaining_classes).toBe(10);

    const booking13 = sessionService.bookSession(session.id, student13.id);

    // THEN: No se sobrepasa el aforo de 12
    const confirmedAfter = sessionService.getConfirmedBookings(session.id);
    expect(confirmedAfter.length).toBe(12);

    // AND: Se genera reserva WAITLISTED con posición 1
    expect(booking13.booking_status).toBe('WAITLISTED');
    expect(booking13.waitlist_position).toBe(1);

    // AND: El saldo del paquete NO debe ser debitado mientras esté en espera
    const pkg13After = packageService.getActivePackage(student13.id);
    expect(pkg13After?.remaining_classes).toBe(10);

    // 4. Si entra una 14ª alumna, su posición debe ser 2 (FIFO)
    const student14 = db.createStudent({ name: 'Alumna 14', phone: '+5491100000014' });
    packageService.createPackage(student14.id, 10, 'ADMIN');
    const booking14 = sessionService.bookSession(session.id, student14.id);
    expect(booking14.booking_status).toBe('WAITLISTED');
    expect(booking14.waitlist_position).toBe(2);
  });

  it('Escenario 3: GIVEN sesión llena y waitlist activa, WHEN una confirmada cancela, THEN se promueve FIFO a la primera en espera, cambia a CONFIRMED, se debita su saldo con auditoría y se emite aviso', () => {
    const session = sessionService.createSession({
      instructor_name: 'Andrea',
      start_time: new Date('2026-11-02T18:30:00Z').toISOString(),
      max_capacity: 12,
    });

    const students = [];
    for (let i = 1; i <= 12; i++) {
      const student = db.createStudent({ name: `Alumna ${i}`, phone: `+5491111111${i.toString().padStart(2, '0')}` });
      packageService.createPackage(student.id, 10, 'ADMIN');
      sessionService.bookSession(session.id, student.id);
      students.push(student);
    }

    // Alumna en espera 1
    const waitlistedStudent1 = db.createStudent({ name: 'Marina Espera', phone: '+5491100000016' });
    const pkgWaitlist1 = packageService.createPackage(waitlistedStudent1.id, 10, 'ADMIN');
    const bookingWaitlist1 = sessionService.bookSession(session.id, waitlistedStudent1.id);
    expect(bookingWaitlist1.booking_status).toBe('WAITLISTED');
    expect(bookingWaitlist1.waitlist_position).toBe(1);

    // Alumna en espera 2
    const waitlistedStudent2 = db.createStudent({ name: 'Valeria Segunda', phone: '+5491100000017' });
    packageService.createPackage(waitlistedStudent2.id, 10, 'ADMIN');
    const bookingWaitlist2 = sessionService.bookSession(session.id, waitlistedStudent2.id);
    expect(bookingWaitlist2.waitlist_position).toBe(2);

    // Alumna 1 cancela su lugar con anticipación
    const firstConfirmedStudent = students[0];
    const cancelResult = sessionService.cancelBooking(session.id, firstConfirmedStudent.id);

    expect(cancelResult.cancelledBooking.booking_status).toBe('CANCELLED');

    // THEN: La alumna con waitlist_position = 1 es promovida a CONFIRMED
    const promotedBooking = sessionService.getBooking(session.id, waitlistedStudent1.id);
    expect(promotedBooking).toBeDefined();
    expect(promotedBooking?.booking_status).toBe('CONFIRMED');
    expect(promotedBooking?.waitlist_position).toBeNull();

    // AND: Se debita 1 clase de su paquete activo con registro de auditoría
    const updatedPkg = packageService.getPackageById(pkgWaitlist1.id);
    expect(updatedPkg?.remaining_classes).toBe(9);

    const auditLogs = packageService.getPackageAuditLog(pkgWaitlist1.id);
    const lastLog = auditLogs[auditLogs.length - 1];
    expect(lastLog.delta).toBe(-1);
    expect(lastLog.reason).toBe('CLASS_ATTENDED');

    // AND: Se reordena la lista de espera: Alumna 2 ahora tiene posición 1
    const updatedWaitlist2 = sessionService.getBooking(session.id, waitlistedStudent2.id);
    expect(updatedWaitlist2?.waitlist_position).toBe(1);

    // AND: El resultado de la cancelación incluye la notificación generada para la alumna promovida
    expect(cancelResult.promotedStudent).toBeDefined();
    expect(cancelResult.promotedStudent?.id).toBe(waitlistedStudent1.id);
    expect(cancelResult.promotionNotification).toBeDefined();
    expect(cancelResult.promotionNotification?.recipientPhone).toBe(waitlistedStudent1.phone);
  });
});
