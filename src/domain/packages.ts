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

export const PACKAGE_SIZE = 10;
export const NO_BALANCE_MESSAGE = 'No te quedan clases. Habla con Andrea para renovar tu paquete.';

export type PackageErrorCode =
  | 'NO_BALANCE'
  | 'ALREADY_REGISTERED'
  | 'ACTIVE_PACKAGE_EXISTS'
  | 'NOTE_REQUIRED'
  | 'OUT_OF_RANGE'
  | 'NOT_FOUND';

/** Error de dominio con código verificable (spec 001). */
export class PackageError extends Error {
  public readonly code: PackageErrorCode;
  constructor(code: PackageErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'PackageError';
  }
}

export interface StudentCard {
  package: ClassPackage | undefined;
  remainingClasses: number;
  history: PackageAuditLog[]; // más reciente primero
}

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
    if (this.db.getPackagesByStudentId(studentId).some((p) => p.status === 'ACTIVE')) {
      throw new PackageError(
        'ACTIVE_PACKAGE_EXISTS',
        'Esta alumna ya tiene un paquete activo. Úsalo hasta terminarlo antes de dar de alta otro.'
      );
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
      reason: 'PACKAGE_CREATED',
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
    performedBy: AuditPerformedBy = 'SYSTEM',
    sessionId?: string
  ): ClassPackage {
    const pkg = this.db.getPackageById(packageId);
    if (!pkg) {
      throw new PackageError('NOT_FOUND', `Paquete no encontrado: ${packageId}`);
    }

    if (pkg.status !== 'ACTIVE' || pkg.remaining_classes <= 0) {
      throw new PackageError('NO_BALANCE', NO_BALANCE_MESSAGE);
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
      session_id: sessionId,
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
    performedBy: AuditPerformedBy = 'SYSTEM',
    sessionId?: string
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
      session_id: sessionId,
    });

    return updated;
  }

  /** Neto de clases cobradas a una alumna por una sesión (negativo = ya se cobró). */
  public chargedForSession(studentId: string, sessionId: string): number {
    return this.db
      .getPackagesByStudentId(studentId)
      .flatMap((p) => this.db.getAuditLogsByPackageId(p.id))
      .filter((l) => l.session_id === sessionId)
      .reduce((sum, l) => sum + l.delta, 0);
  }

  /**
   * Spec 001: descuenta 1 clase por asistencia y deja rastro con la sesión y quién la marcó.
   * Rechaza ALREADY_REGISTERED si esa clase ya se cobró y NO_BALANCE si no hay saldo.
   */
  public registerAttendance(
    studentId: string,
    sessionId: string,
    by: AuditPerformedBy = 'INSTRUCTOR'
  ): ClassPackage {
    if (this.chargedForSession(studentId, sessionId) < 0) {
      throw new PackageError(
        'ALREADY_REGISTERED',
        'La asistencia de esta alumna ya está registrada en esta clase.'
      );
    }
    const pkg = this.getActivePackage(studentId);
    if (!pkg) {
      throw new PackageError('NO_BALANCE', NO_BALANCE_MESSAGE);
    }
    return this.debitClass(pkg.id, 'CLASS_ATTENDED', by, sessionId);
  }

  /** Spec 001: ajuste manual solo de ADMIN, con nota obligatoria y resultado entre 0 y 10. */
  public adjustBalance(packageId: string, delta: number, note: string): ClassPackage {
    const cleanNote = note.trim();
    if (!cleanNote) {
      throw new PackageError('NOTE_REQUIRED', 'Escribe el motivo del ajuste.');
    }
    if (!Number.isInteger(delta) || delta === 0) {
      throw new PackageError('OUT_OF_RANGE', 'El ajuste debe ser un número entero distinto de 0.');
    }
    const pkg = this.db.getPackageById(packageId);
    if (!pkg) {
      throw new PackageError('NOT_FOUND', `Paquete no encontrado: ${packageId}`);
    }
    const next = pkg.remaining_classes + delta;
    if (next < 0 || next > pkg.total_classes) {
      throw new PackageError(
        'OUT_OF_RANGE',
        `El saldo resultante debe estar entre 0 y ${pkg.total_classes}.`
      );
    }
    const updated = this.db.updatePackage(packageId, {
      remaining_classes: next,
      status: next === 0 ? 'EXHAUSTED' : 'ACTIVE',
    });
    this.db.addAuditLog({
      package_id: packageId,
      delta,
      reason: 'MANUAL_ADJUSTMENT',
      performed_by: 'ADMIN',
      note: cleanNote.slice(0, 200),
    });
    return updated;
  }

  /** Spec 001: tarjeta digital = paquete más reciente + historial del más nuevo al más antiguo. */
  public getCard(studentId: string): StudentCard {
    const packages = this.db
      .getPackagesByStudentId(studentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const pkg = packages.find((p) => p.status === 'ACTIVE') ?? packages[0];
    const history = pkg
      ? this.db.getAuditLogsByPackageId(pkg.id).reverse()
      : [];
    return { package: pkg, remainingClasses: pkg?.remaining_classes ?? 0, history };
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
