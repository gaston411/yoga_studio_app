import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../src/infrastructure/db.ts';
import { PackageService } from '../src/domain/packages.ts';

describe('Escenario 1: Débito de clase y trazabilidad de paquete (BDD)', () => {
  let db: Database;
  let packageService: PackageService;

  beforeEach(() => {
    db = new Database();
    packageService = new PackageService(db);
  });

  it('debe crear un nuevo paquete de 10 clases activo para una alumna', () => {
    const student = db.createStudent({ name: 'Camila Rossi', phone: '+5491199887766' });
    const pkg = packageService.createPackage(student.id, 10, 'ADMIN');

    expect(pkg).toBeDefined();
    expect(pkg.student_id).toBe(student.id);
    expect(pkg.total_classes).toBe(10);
    expect(pkg.remaining_classes).toBe(10);
    expect(pkg.status).toBe('ACTIVE');

    // Auditoría inicial de alta
    const auditLogs = packageService.getPackageAuditLog(pkg.id);
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].delta).toBe(10);
    expect(auditLogs[0].reason).toBe('MANUAL_ADJUSTMENT');
    expect(auditLogs[0].performed_by).toBe('ADMIN');
  });

  it('GIVEN una alumna con paquete activo con remaining_classes = 1, WHEN se confirma su asistencia, THEN decrementar a 0, transicionar a EXHAUSTED y registrar en package_audit_log', () => {
    const student = db.createStudent({ name: 'Lucia Mendez', phone: '+5491144556677' });
    // Crear paquete con 1 clase restante
    const pkg = packageService.createPackage(student.id, 1, 'ADMIN');

    expect(pkg.remaining_classes).toBe(1);
    expect(pkg.status).toBe('ACTIVE');

    // WHEN se debita la clase por asistencia
    const updatedPkg = packageService.debitClass(pkg.id, 'CLASS_ATTENDED', 'SYSTEM');

    // THEN remaining_classes = 0
    expect(updatedPkg.remaining_classes).toBe(0);
    // AND status = EXHAUSTED
    expect(updatedPkg.status).toBe('EXHAUSTED');

    // AND audit log registrado con delta = -1, reason = CLASS_ATTENDED, timestamp exacto
    const logs = packageService.getPackageAuditLog(pkg.id);
    const lastLog = logs[logs.length - 1];

    expect(lastLog.delta).toBe(-1);
    expect(lastLog.reason).toBe('CLASS_ATTENDED');
    expect(lastLog.performed_by).toBe('SYSTEM');
    expect(new Date(lastLog.timestamp).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('GIVEN un paquete con remaining_classes = 0 (EXHAUSTED), WHEN se intenta realizar un débito subsiguiente, THEN debe ser rechazado indicando falta de saldo', () => {
    const student = db.createStudent({ name: 'Valeria Sol', phone: '+5491122334455' });
    const pkg = packageService.createPackage(student.id, 1, 'ADMIN');

    // Debitar la única clase
    packageService.debitClass(pkg.id, 'CLASS_ATTENDED', 'SYSTEM');

    // Intento de debite subsiguiente
    expect(() => {
      packageService.debitClass(pkg.id, 'CLASS_ATTENDED', 'SYSTEM');
    }).toThrowError(/saldo insuficiente|agotado|sin clases disponibles/i);

    // Invariante: remaining_classes nunca debe ser menor a 0
    const currentPkg = packageService.getPackageById(pkg.id);
    expect(currentPkg?.remaining_classes).toBe(0);
    expect(currentPkg?.status).toBe('EXHAUSTED');
  });

  it('debe registrar reembolsos con delta = +1 y reactivar paquete si estaba EXHAUSTED', () => {
    const student = db.createStudent({ name: 'Sofia Diaz', phone: '+5491133445566' });
    const pkg = packageService.createPackage(student.id, 1, 'ADMIN');
    packageService.debitClass(pkg.id, 'CLASS_ATTENDED', 'SYSTEM');

    const exhaustedPkg = packageService.getPackageById(pkg.id);
    expect(exhaustedPkg?.status).toBe('EXHAUSTED');

    // Reembolso
    const refundedPkg = packageService.refundClass(pkg.id, 'EMERGENCY_CANCEL_REFUND', 'SYSTEM');
    expect(refundedPkg.remaining_classes).toBe(1);
    expect(refundedPkg.status).toBe('ACTIVE');

    const logs = packageService.getPackageAuditLog(pkg.id);
    const refundLog = logs[logs.length - 1];
    expect(refundLog.delta).toBe(1);
    expect(refundLog.reason).toBe('EMERGENCY_CANCEL_REFUND');
  });
});
