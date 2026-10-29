import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../src/infrastructure/db.ts';
import { PackageService } from '../src/domain/packages.ts';
import { SessionService } from '../src/domain/sessions.ts';
import { generateWhatsAppLink, buildEmergencyCancellationAlert } from '../src/domain/notifications.ts';

describe('Escenario 4: Cancelación de emergencia por enfermedad de instructora y despacho de alertas (BDD)', () => {
  let db: Database;
  let packageService: PackageService;
  let sessionService: SessionService;

  beforeEach(() => {
    db = new Database();
    packageService = new PackageService(db);
    sessionService = new SessionService(db, packageService);
  });

  it('Escenario 4: GIVEN clase programada con N alumnas confirmadas, WHEN se cancela por "Enfermedad de instructora", THEN reembolsar +1 clase a cada confirmada y generar enlaces a WhatsApp API con texto codificado', () => {
    const session = sessionService.createSession({
      instructor_name: 'Instructora 2',
      start_time: '2026-11-05T19:30:00Z',
      max_capacity: 12,
    });

    // Registrar 3 alumnas con paquetes de 5 clases
    const s1 = db.createStudent({ name: 'Camila Perez', phone: '+5491100000018' });
    const s2 = db.createStudent({ name: 'Mariana Lopez', phone: '+5491100000019' });
    const s3 = db.createStudent({ name: 'Juana Gomez', phone: '+5491100000020' });

    const p1 = packageService.createPackage(s1.id, 5, 'ADMIN');
    const p2 = packageService.createPackage(s2.id, 5, 'ADMIN');
    const p3 = packageService.createPackage(s3.id, 5, 'ADMIN');

    sessionService.bookSession(session.id, s1.id);
    sessionService.bookSession(session.id, s2.id);
    sessionService.bookSession(session.id, s3.id);

    // Tras reservar, cada una tiene 4 clases restantes
    expect(packageService.getPackageById(p1.id)?.remaining_classes).toBe(4);
    expect(packageService.getPackageById(p2.id)?.remaining_classes).toBe(4);
    expect(packageService.getPackageById(p3.id)?.remaining_classes).toBe(4);

    // WHEN: La administradora cancela la clase por enfermedad de la instructora
    const emergencyReport = sessionService.cancelSessionDueToEmergency(
      session.id,
      'Enfermedad de instructora',
      'ADMIN'
    );

    // THEN: La sesión pasa a CANCELLED
    const updatedSession = sessionService.getSessionById(session.id);
    expect(updatedSession?.status).toBe('CANCELLED');

    // AND: Todas las confirmadas fueron reembolsadas (saldo vuelve a 5)
    expect(packageService.getPackageById(p1.id)?.remaining_classes).toBe(5);
    expect(packageService.getPackageById(p2.id)?.remaining_classes).toBe(5);
    expect(packageService.getPackageById(p3.id)?.remaining_classes).toBe(5);

    // AND: Auditoría contiene delta = +1 con reason = 'EMERGENCY_CANCEL_REFUND'
    const auditLogsP1 = packageService.getPackageAuditLog(p1.id);
    const lastLogP1 = auditLogsP1[auditLogsP1.length - 1];
    expect(lastLogP1.delta).toBe(1);
    expect(lastLogP1.reason).toBe('EMERGENCY_CANCEL_REFUND');
    expect(lastLogP1.performed_by).toBe('ADMIN');

    // AND: El reporte de emergencia contiene las 3 alumnas afectadas con enlace WhatsApp
    expect(emergencyReport.affectedStudents.length).toBe(3);
    for (const item of emergencyReport.affectedStudents) {
      expect(item.whatsAppLink).toContain('https://wa.me/');
      expect(item.whatsAppLink).toContain('text=');
      // Debe contener la justificación en el texto
      expect(decodeURIComponent(item.whatsAppLink)).toContain('Enfermedad de instructora');
      expect(decodeURIComponent(item.whatsAppLink)).toContain(item.student.name);
    }
  });

  it('debe sanitizar el número de teléfono y codificar adecuadamente caracteres URI en la URL de WhatsApp', () => {
    const phone = '+54 9 11 6677-8899';
    const message = 'Hola Andrea! Tu clase de las 19:30 hs fue cancelada por: Enfermedad de instructora. Tu crédito ya fue devuelto.';

    const link = generateWhatsAppLink(phone, message);

    // El teléfono debe quedar sin espacios, guiones ni símbolo +
    expect(link).toContain('https://wa.me/5491166778899?text=');
    // El texto debe estar URI-encoded
    expect(link).not.toContain(' ');
    expect(link).toContain(encodeURIComponent(message));
  });

  it('debe construir plantilla parametrizada con datos de sesión, instructora y alumna', () => {
    const alert = buildEmergencyCancellationAlert({
      studentName: 'Lucía Rossi',
      instructorName: 'Instructora 2',
      sessionDate: '2026-11-05',
      sessionTime: '19:30',
      reason: 'Enfermedad de instructora',
    });

    expect(alert).toContain('Lucía Rossi');
    expect(alert).toContain('Instructora 2');
    expect(alert).toContain('19:30');
    expect(alert).toContain('Enfermedad de instructora');
    expect(alert).toContain('crédito');
  });
});
