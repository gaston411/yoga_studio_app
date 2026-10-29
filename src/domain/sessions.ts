/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Database,
  ClassSession,
  Booking,
  Student,
  InstructorName,
  SessionStatus,
  AuditPerformedBy,
} from '../infrastructure/db.ts';
import { PackageService } from './packages.ts';
import {
  generateWhatsAppLink,
  buildEmergencyCancellationAlert,
  buildWaitlistPromotionAlert,
  buildSubstitutionAlert,
} from './notifications.ts';

export interface BookingResult {
  booking: Booking;
  isWaitlisted: boolean;
  message: string;
}

export interface CancellationResult {
  cancelledBooking: Booking;
  promotedStudent?: Student;
  promotedBooking?: Booking;
  promotionNotification?: {
    recipientPhone: string;
    whatsAppLink: string;
    messageText: string;
  };
}

export interface EmergencyCancellationReport {
  session: ClassSession;
  affectedStudents: Array<{
    student: Student;
    booking: Booking;
    whatsAppLink: string;
    messageText: string;
  }>;
}

export class SessionService {
  private db: Database;
  private packageService: PackageService;

  constructor(db: Database, packageService: PackageService) {
    this.db = db;
    this.packageService = packageService;
  }

  /**
   * Crea una nueva sesión o clase con un tope de aforo estricto (por defecto 12).
   */
  public createSession(data: {
    instructor_name: InstructorName;
    start_time: string;
    max_capacity?: number;
    status?: SessionStatus;
  }): ClassSession {
    return this.db.createSession({
      instructor_name: data.instructor_name,
      start_time: data.start_time,
      max_capacity: data.max_capacity ?? 12,
      status: data.status ?? 'SCHEDULED',
    });
  }

  public getSessionById(sessionId: string): ClassSession | undefined {
    return this.db.getSessionById(sessionId);
  }

  public getAllSessions(): ClassSession[] {
    return this.db.getAllSessions();
  }

  public getConfirmedBookings(sessionId: string): Booking[] {
    return this.db
      .getBookingsBySessionId(sessionId)
      .filter((b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'ATTENDED');
  }

  public getWaitlistedBookings(sessionId: string): Booking[] {
    return this.db
      .getBookingsBySessionId(sessionId)
      .filter((b) => b.booking_status === 'WAITLISTED')
      .sort((a, b) => (a.waitlist_position ?? 999) - (b.waitlist_position ?? 999));
  }

  public getBooking(sessionId: string, studentId: string): Booking | undefined {
    return this.db.getBookingBySessionAndStudent(sessionId, studentId);
  }

  /**
   * Reserva una sesión aplicando control de aforo (12 max) y lista de espera FIFO.
   * Regla de negocio:
   * - Si hay cupo (< max_capacity): CONFIRMED y se debita 1 clase del paquete activo.
   * - Si está lleno (>= max_capacity): WAITLISTED (FIFO) y el saldo NO se debita.
   */
  public bookSession(sessionId: string, studentId: string): Booking {
    const session = this.db.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }
    if (session.status === 'CANCELLED') {
      throw new Error('No es posible reservar en una clase cancelada.');
    }

    // Verificar que la alumna tenga paquete activo con clases
    const activePkg = this.packageService.getActivePackage(studentId);
    if (!activePkg || activePkg.remaining_classes <= 0) {
      throw new Error('Saldo insuficiente: debes contar con un paquete activo con clases disponibles para solicitar un lugar.');
    }

    // Verificar si ya tiene una reserva no cancelada
    const existing = this.db.getBookingBySessionAndStudent(sessionId, studentId);
    if (existing && existing.booking_status !== 'CANCELLED') {
      throw new Error('Ya cuentas con un lugar o estás en lista de espera para esta clase.');
    }

    const confirmed = this.getConfirmedBookings(sessionId);
    const maxCapacity = session.max_capacity ?? 12;

    if (confirmed.length < maxCapacity) {
      // Cupo disponible: confirmar y debitar clase
      this.packageService.debitClass(activePkg.id, 'CLASS_ATTENDED', 'SYSTEM', sessionId);

      return this.db.createBooking({
        session_id: sessionId,
        student_id: studentId,
        booking_status: 'CONFIRMED',
        waitlist_position: null,
      });
    } else {
      // Cupo lleno: asignar lista de espera FIFO sin debitar crédito
      const waitlisted = this.getWaitlistedBookings(sessionId);
      const nextPosition = waitlisted.length > 0
        ? Math.max(...waitlisted.map((b) => b.waitlist_position ?? 0)) + 1
        : 1;

      return this.db.createBooking({
        session_id: sessionId,
        student_id: studentId,
        booking_status: 'WAITLISTED',
        waitlist_position: nextPosition,
      });
    }
  }

  /**
   * Cancela una reserva.
   * Si la reserva era CONFIRMED:
   * 1. Se le reembolsa la clase consumida a su paquete.
   * 2. Promueve automáticamente en orden FIFO a la primera alumna en lista de espera (waitlist_position = 1).
   * 3. A la alumna promovida se le debita 1 clase y se emite la notificación de WhatsApp para avisarle.
   * 4. Se reordenan las posiciones restantes de la lista de espera.
   */
  public cancelBooking(sessionId: string, studentId: string): CancellationResult {
    const booking = this.db.getBookingBySessionAndStudent(sessionId, studentId);
    if (!booking || booking.booking_status === 'CANCELLED') {
      throw new Error('No se encontró una reserva activa para cancelar.');
    }

    const previousStatus = booking.booking_status;

    // Actualizar estado a CANCELLED
    const cancelledBooking = this.db.updateBooking(booking.id, {
      booking_status: 'CANCELLED',
      waitlist_position: null,
    });

    let promotedStudent: Student | undefined;
    let promotedBooking: Booking | undefined;
    let promotionNotification: CancellationResult['promotionNotification'] | undefined;

    if (previousStatus === 'CONFIRMED') {
      // Reembolsar clase a la alumna que cancela
      const activePkg = this.packageService.getPackagesByStudent(studentId)
        .reverse()
        .find((p) => p.status === 'ACTIVE' || p.status === 'EXHAUSTED');
      if (activePkg) {
        this.packageService.refundClass(activePkg.id, 'EMERGENCY_CANCEL_REFUND', 'SYSTEM', sessionId);
      }

      // Buscar candidata FIFO en lista de espera (la de menor posición)
      const waitlisted = this.getWaitlistedBookings(sessionId);
      if (waitlisted.length > 0) {
        const nextInLine = waitlisted[0];
        const nextStudent = this.db.getStudentById(nextInLine.student_id);

        if (nextStudent) {
          // Buscar paquete de la alumna promovida para debitar
          const nextPkg = this.packageService.getActivePackage(nextStudent.id);
          if (nextPkg && nextPkg.remaining_classes > 0) {
            this.packageService.debitClass(nextPkg.id, 'CLASS_ATTENDED', 'SYSTEM', sessionId);

            promotedBooking = this.db.updateBooking(nextInLine.id, {
              booking_status: 'CONFIRMED',
              waitlist_position: null,
            });
            promotedStudent = nextStudent;

            const session = this.db.getSessionById(sessionId);
            const sessionDate = session ? session.start_time.split('T')[0] : '';
            const sessionTime = session && session.start_time.includes('T')
              ? session.start_time.split('T')[1].substring(0, 5)
              : '';

            const messageText = buildWaitlistPromotionAlert({
              studentName: nextStudent.name,
              instructorName: session?.instructor_name ?? 'Andrea',
              sessionDate,
              sessionTime,
            });

            promotionNotification = {
              recipientPhone: nextStudent.phone,
              whatsAppLink: generateWhatsAppLink(nextStudent.phone, messageText),
              messageText,
            };
          }
        }

        // Reordenar posiciones de la lista de espera restante
        this.reorderWaitlist(sessionId);
      }
    } else if (previousStatus === 'WAITLISTED') {
      // Reordenar posiciones de espera tras salida voluntaria de waitlist
      this.reorderWaitlist(sessionId);
    }

    return {
      cancelledBooking,
      promotedStudent,
      promotedBooking,
      promotionNotification,
    };
  }

  /**
   * Reorganiza las posiciones de la lista de espera para que sean correlativas 1, 2, 3...
   */
  private reorderWaitlist(sessionId: string): void {
    const waitlisted = this.getWaitlistedBookings(sessionId);
    waitlisted.forEach((item, index) => {
      const newPos = index + 1;
      if (item.waitlist_position !== newPos) {
        this.db.updateBooking(item.id, { waitlist_position: newPos });
      }
    });
  }

  /**
   * Marca asistencia presencial de una alumna en la clase.
   */
  public markAttendance(sessionId: string, studentId: string): Booking {
    const booking = this.db.getBookingBySessionAndStudent(sessionId, studentId);
    if (!booking || booking.booking_status !== 'CONFIRMED') {
      throw new Error('La alumna debe tener una reserva confirmada para registrar su asistencia.');
    }
    // Spec 001: si la reserva no cobró la clase, se cobra ahora con rastro de la instructora.
    if (this.packageService.chargedForSession(studentId, sessionId) >= 0) {
      this.packageService.registerAttendance(studentId, sessionId, 'INSTRUCTOR');
    }
    return this.db.updateBooking(booking.id, { booking_status: 'ATTENDED' });
  }

  /**
   * Cancelación de emergencia por enfermedad de instructora o contingencia mayor.
   * 1. La sesión pasa a 'CANCELLED'.
   * 2. Todas las reservas CONFIRMED o ATTENDED reembolsan la clase consumida (delta = +1).
   * 3. Genera reporte con enlaces directos de WhatsApp para notificar a todas las afectadas.
   */
  public cancelSessionDueToEmergency(
    sessionId: string,
    reason: string = 'Enfermedad de instructora',
    performedBy: AuditPerformedBy = 'ADMIN'
  ): EmergencyCancellationReport {
    const session = this.db.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    // Actualizar estado de la sesión
    const updatedSession = this.db.updateSession(sessionId, { status: 'CANCELLED' });

    const bookings = this.db.getBookingsBySessionId(sessionId);
    const confirmedBookings = bookings.filter(
      (b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'ATTENDED'
    );

    const affectedStudents: EmergencyCancellationReport['affectedStudents'] = [];

    const sessionDate = session.start_time.split('T')[0];
    const sessionTime = session.start_time.includes('T')
      ? session.start_time.split('T')[1].substring(0, 5)
      : '';

    for (const booking of confirmedBookings) {
      const student = this.db.getStudentById(booking.student_id);
      if (!student) continue;

      // Reembolsar clase consumida
      const studentPackages = this.packageService.getPackagesByStudent(student.id);
      const pkgToRefund = studentPackages.find((p) => p.status === 'ACTIVE' || p.status === 'EXHAUSTED');

      if (pkgToRefund) {
        this.packageService.refundClass(pkgToRefund.id, 'EMERGENCY_CANCEL_REFUND', performedBy, sessionId);
      }

      // Marcar reserva como CANCELLED
      this.db.updateBooking(booking.id, {
        booking_status: 'CANCELLED',
        waitlist_position: null,
      });

      const messageText = buildEmergencyCancellationAlert({
        studentName: student.name,
        instructorName: session.instructor_name,
        sessionDate,
        sessionTime,
        reason,
      });

      affectedStudents.push({
        student,
        booking,
        whatsAppLink: generateWhatsAppLink(student.phone, messageText),
        messageText,
      });
    }

    // Cancelar reservas en waitlist también (sin reembolsos ya que no habían sido cobradas)
    const waitlistedBookings = bookings.filter((b) => b.booking_status === 'WAITLISTED');
    for (const b of waitlistedBookings) {
      this.db.updateBooking(b.id, {
        booking_status: 'CANCELLED',
        waitlist_position: null,
      });
    }

    return {
      session: updatedSession,
      affectedStudents,
    };
  }

  /**
   * Sustitución de instructora por contingencia.
   */
  public substituteInstructor(
    sessionId: string,
    newInstructor: InstructorName
  ): {
    session: ClassSession;
    affectedStudents: Array<{ student: Student; whatsAppLink: string; messageText: string }>;
  } {
    const session = this.db.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    const originalInstructor = session.instructor_name;
    const updatedSession = this.db.updateSession(sessionId, {
      instructor_name: newInstructor,
      status: 'SUBSTITUTED',
    });

    const confirmed = this.getConfirmedBookings(sessionId);
    const sessionDate = session.start_time.split('T')[0];
    const sessionTime = session.start_time.includes('T')
      ? session.start_time.split('T')[1].substring(0, 5)
      : '';

    const affectedStudents = confirmed.map((b) => {
      const student = this.db.getStudentById(b.student_id)!;
      const messageText = buildSubstitutionAlert({
        studentName: student.name,
        originalInstructor,
        newInstructor,
        sessionDate,
        sessionTime,
      });
      return {
        student,
        whatsAppLink: generateWhatsAppLink(student.phone, messageText),
        messageText,
      };
    });

    return {
      session: updatedSession,
      affectedStudents,
    };
  }
}
