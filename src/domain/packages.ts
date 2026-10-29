/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Database,
  ClassPackage,
  PackageAuditLog,
  AuditReason,
  AuditPerformedBy,
} from '../infrastructure/db.ts';

export class PackageService {
  private db: Database;
  // Mutex lock to prevent race conditions during concurrent debits
  private lock: Promise<void> = Promise.resolve();

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Crea un nuevo paquete para una alumna (alta manual por administradora).
   * Registra el alta en la pista de auditoría inmutable.
   */
  public createPackage(
    studentId: string,
    totalClasses: number = 10,
    performedBy: AuditPerformedBy = 'ADMIN'
  ): ClassPackage {
    if (totalClasses <= 0) {
      throw new Error('La cantidad de clases del paquete debe ser mayor a 0');
    }

    const pkg = this.db.createPackage({
      student_id: studentId,
      total_classes: totalClasses,
      remaining_classes: totalClasses,
      status: 'ACTIVE',
    });

    this.db.addAuditLog({
      package_id: pkg.id,
      delta: totalClasses,
      reason: 'MANUAL_ADJUSTMENT',
      performed_by: performedBy,
    });

    return pkg;
  }

  /**
   * Obtiene un paquete por su ID.
   */
  public getPackageById(packageId: string): ClassPackage | undefined {
    return this.db.getPackageById(packageId);
  }

  /**
   * Obtiene el paquete activo con saldo disponible para una alumna.
   */
  public getActivePackage(studentId: string): ClassPackage | undefined {
    const packages = this.db.getPackagesByStudentId(studentId);
    return packages.find((p) => p.status === 'ACTIVE' && p.remaining_classes > 0);
  }

  /**
   * Obtiene todos los paquetes asociados a una alumna.
   */
  public getPackagesByStudent(studentId: string): ClassPackage[] {
    return this.db.getPackagesByStudentId(studentId);
  }

  /**
   * Decremento transaccional atómico de 1 clase por asistencia o reserva confirmada.
   * Si el saldo llega a 0, transiciona automáticamente a 'EXHAUSTED'.
   * Registra entrada inmutable en package_audit_log para resolver disputas de saldo.
   */
  public debitClass(
    packageId: string,
    reason: AuditReason = 'CLASS_ATTENDED',
    performedBy: AuditPerformedBy = 'SYSTEM'
  ): ClassPackage {
    const pkg = this.db.getPackageById(packageId);
    if (!pkg) {
      throw new Error(`Paquete no encontrado: ${packageId}`);
    }

    if (pkg.status !== 'ACTIVE' || pkg.remaining_classes <= 0) {
      throw new Error('Saldo insuficiente: el paquete está agotado o inactivo. No tiene clases disponibles.');
    }

    const newRemaining = pkg.remaining_classes - 1;
    const newStatus = newRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE';

    const updated = this.db.updatePackage(packageId, {
      remaining_classes: newRemaining,
      status: newStatus,
    });

    this.db.addAuditLog({
      package_id: packageId,
      delta: -1,
      reason,
      performed_by: performedBy,
    });

    return updated;
  }

  /**
   * Reembolso o restitución de 1 clase al paquete (por cancelación a tiempo o contingencia).
   * Si el paquete estaba en 'EXHAUSTED', reactiva el estado a 'ACTIVE'.
   */
  public refundClass(
    packageId: string,
    reason: AuditReason = 'EMERGENCY_CANCEL_REFUND',
    performedBy: AuditPerformedBy = 'SYSTEM'
  ): ClassPackage {
    const pkg = this.db.getPackageById(packageId);
    if (!pkg) {
      throw new Error(`Paquete no encontrado: ${packageId}`);
    }

    const newRemaining = pkg.remaining_classes + 1;
    const newStatus = 'ACTIVE';

    const updated = this.db.updatePackage(packageId, {
      remaining_classes: newRemaining,
      status: newStatus,
    });

    this.db.addAuditLog({
      package_id: packageId,
      delta: 1,
      reason,
      performed_by: performedBy,
    });

    return updated;
  }

  /**
   * Devuelve el historial inmutable de auditoría para un paquete.
   */
  public getPackageAuditLog(packageId: string): PackageAuditLog[] {
    return this.db.getAuditLogsByPackageId(packageId);
  }

  /**
   * Devuelve toda la pista de auditoría de consumos de una alumna a través de todos sus paquetes.
   */
  public getStudentFullAuditTrail(studentId: string): {
    package: ClassPackage;
    logs: PackageAuditLog[];
  }[] {
    const packages = this.db.getPackagesByStudentId(studentId);
    return packages.map((pkg) => ({
      package: pkg,
      logs: this.db.getAuditLogsByPackageId(pkg.id),
    }));
  }
}
