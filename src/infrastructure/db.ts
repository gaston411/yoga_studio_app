/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string;
  name: string;
  phone: string;
  created_at: string;
}

export type PackageStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';

export interface ClassPackage {
  id: string;
  student_id: string;
  total_classes: number;
  remaining_classes: number;
  status: PackageStatus;
  created_at: string;
}

export type AuditReason =
  | 'CLASS_ATTENDED'
  | 'MANUAL_ADJUSTMENT'
  | 'LATE_CANCEL_CHARGE'
  | 'EMERGENCY_CANCEL_REFUND'
  | 'WAITLIST_PROMOTED';

export type AuditPerformedBy = 'ADMIN' | 'SYSTEM';

export interface PackageAuditLog {
  id: string;
  package_id: string;
  delta: number;
  reason: AuditReason;
  performed_by: AuditPerformedBy;
  timestamp: string;
}

export type InstructorName = 'Instructora 1' | 'Instructora 2' | 'Andrea';
export type SessionStatus = 'SCHEDULED' | 'CANCELLED' | 'SUBSTITUTED';

export interface ClassSession {
  id: string;
  instructor_name: InstructorName;
  start_time: string; // ISO string
  max_capacity: number; // default 12
  status: SessionStatus;
}

export type BookingStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED' | 'ATTENDED';

export interface Booking {
  id: string;
  session_id: string;
  student_id: string;
  booking_status: BookingStatus;
  waitlist_position: number | null;
  created_at: string;
}

const STORAGE_KEY = 'andrea_yoga_engine_v1';

export class Database {
  private students: Map<string, Student> = new Map();
  private packages: Map<string, ClassPackage> = new Map();
  private auditLogs: PackageAuditLog[] = [];
  private sessions: Map<string, ClassSession> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private isPersisting: boolean = false;

  constructor(enablePersistence: boolean = false) {
    this.isPersisting = enablePersistence;
    if (enablePersistence && typeof window !== 'undefined' && window.localStorage) {
      this.loadFromStorage();
    }
  }

  // UUID generator
  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }

  private saveToStorage() {
    if (!this.isPersisting || typeof window === 'undefined' || !window.localStorage) return;
    try {
      const data = {
        students: Array.from(this.students.values()),
        packages: Array.from(this.packages.values()),
        auditLogs: this.auditLogs,
        sessions: Array.from(this.sessions.values()),
        bookings: Array.from(this.bookings.values()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.students)) {
        data.students.forEach((s: Student) => this.students.set(s.id, s));
      }
      if (Array.isArray(data.packages)) {
        data.packages.forEach((p: ClassPackage) => this.packages.set(p.id, p));
      }
      if (Array.isArray(data.auditLogs)) {
        this.auditLogs = data.auditLogs;
      }
      if (Array.isArray(data.sessions)) {
        data.sessions.forEach((s: ClassSession) => this.sessions.set(s.id, s));
      }
      if (Array.isArray(data.bookings)) {
        data.bookings.forEach((b: Booking) => this.bookings.set(b.id, b));
      }
    } catch {
      // Ignore parse errors
    }
  }

  // --- Students ---
  public createStudent(data: { name: string; phone: string }): Student {
    // Unique phone constraint check
    const existing = Array.from(this.students.values()).find(
      (s) => s.phone.replace(/\D/g, '') === data.phone.replace(/\D/g, '')
    );
    if (existing) {
      return existing;
    }
    const student: Student = {
      id: this.generateId(),
      name: data.name.trim(),
      phone: data.phone.trim(),
      created_at: new Date().toISOString(),
    };
    this.students.set(student.id, student);
    this.saveToStorage();
    return student;
  }

  public getStudentById(id: string): Student | undefined {
    return this.students.get(id);
  }

  public getAllStudents(): Student[] {
    return Array.from(this.students.values());
  }

  // --- Packages ---
  public createPackage(data: {
    student_id: string;
    total_classes?: number;
    remaining_classes?: number;
    status?: PackageStatus;
  }): ClassPackage {
    const total = data.total_classes ?? 10;
    const remaining = data.remaining_classes ?? total;
    if (remaining < 0) {
      throw new Error('remaining_classes must be >= 0');
    }
    const pkg: ClassPackage = {
      id: this.generateId(),
      student_id: data.student_id,
      total_classes: total,
      remaining_classes: remaining,
      status: data.status ?? (remaining > 0 ? 'ACTIVE' : 'EXHAUSTED'),
      created_at: new Date().toISOString(),
    };
    this.packages.set(pkg.id, pkg);
    this.saveToStorage();
    return pkg;
  }

  public getPackageById(id: string): ClassPackage | undefined {
    const pkg = this.packages.get(id);
    return pkg ? { ...pkg } : undefined;
  }

  public getPackagesByStudentId(studentId: string): ClassPackage[] {
    return Array.from(this.packages.values())
      .filter((p) => p.student_id === studentId)
      .map((p) => ({ ...p }));
  }

  public updatePackage(id: string, updates: Partial<ClassPackage>): ClassPackage {
    const pkg = this.packages.get(id);
    if (!pkg) {
      throw new Error(`Package with id ${id} not found`);
    }
    const updated: ClassPackage = {
      ...pkg,
      ...updates,
    };
    if (updated.remaining_classes < 0) {
      throw new Error('CHECK constraint violation: remaining_classes >= 0');
    }
    this.packages.set(id, updated);
    this.saveToStorage();
    return { ...updated };
  }

  // --- Package Audit Log (Immutable) ---
  public addAuditLog(entry: {
    package_id: string;
    delta: number;
    reason: AuditReason;
    performed_by: AuditPerformedBy;
  }): PackageAuditLog {
    const log: PackageAuditLog = {
      id: this.generateId(),
      package_id: entry.package_id,
      delta: entry.delta,
      reason: entry.reason,
      performed_by: entry.performed_by,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.push(log);
    this.saveToStorage();
    return { ...log };
  }

  public getAuditLogsByPackageId(packageId: string): PackageAuditLog[] {
    return this.auditLogs
      .filter((l) => l.package_id === packageId)
      .map((l) => ({ ...l }));
  }

  public getAllAuditLogs(): PackageAuditLog[] {
    return this.auditLogs.map((l) => ({ ...l }));
  }

  // --- Class Sessions ---
  public createSession(data: {
    instructor_name: InstructorName;
    start_time: string;
    max_capacity?: number;
    status?: SessionStatus;
  }): ClassSession {
    const session: ClassSession = {
      id: this.generateId(),
      instructor_name: data.instructor_name,
      start_time: data.start_time,
      max_capacity: data.max_capacity ?? 12,
      status: data.status ?? 'SCHEDULED',
    };
    this.sessions.set(session.id, session);
    this.saveToStorage();
    return { ...session };
  }

  public getSessionById(id: string): ClassSession | undefined {
    const session = this.sessions.get(id);
    return session ? { ...session } : undefined;
  }

  public getAllSessions(): ClassSession[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .map((s) => ({ ...s }));
  }

  public updateSession(id: string, updates: Partial<ClassSession>): ClassSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Session with id ${id} not found`);
    }
    const updated: ClassSession = {
      ...session,
      ...updates,
    };
    this.sessions.set(id, updated);
    this.saveToStorage();
    return { ...updated };
  }

  // --- Bookings ---
  public createBooking(data: {
    session_id: string;
    student_id: string;
    booking_status: BookingStatus;
    waitlist_position?: number | null;
  }): Booking {
    // Check UNIQUE(session_id, student_id)
    const existing = this.getBookingBySessionAndStudent(data.session_id, data.student_id);
    if (existing && existing.booking_status !== 'CANCELLED') {
      throw new Error('UNIQUE constraint violation: student already has an active booking or waitlist for this session');
    }

    const booking: Booking = {
      id: existing ? existing.id : this.generateId(),
      session_id: data.session_id,
      student_id: data.student_id,
      booking_status: data.booking_status,
      waitlist_position: data.waitlist_position ?? null,
      created_at: existing ? existing.created_at : new Date().toISOString(),
    };
    this.bookings.set(booking.id, booking);
    this.saveToStorage();
    return { ...booking };
  }

  public getBookingById(id: string): Booking | undefined {
    const b = this.bookings.get(id);
    return b ? { ...b } : undefined;
  }

  public getBookingBySessionAndStudent(sessionId: string, studentId: string): Booking | undefined {
    const b = Array.from(this.bookings.values()).find(
      (item) => item.session_id === sessionId && item.student_id === studentId
    );
    return b ? { ...b } : undefined;
  }

  public getBookingsBySessionId(sessionId: string): Booking[] {
    return Array.from(this.bookings.values())
      .filter((b) => b.session_id === sessionId)
      .map((b) => ({ ...b }));
  }

  public updateBooking(id: string, updates: Partial<Booking>): Booking {
    const booking = this.bookings.get(id);
    if (!booking) {
      throw new Error(`Booking with id ${id} not found`);
    }
    const updated: Booking = {
      ...booking,
      ...updates,
    };
    this.bookings.set(id, updated);
    this.saveToStorage();
    return { ...updated };
  }

  public clearAll() {
    this.students.clear();
    this.packages.clear();
    this.auditLogs = [];
    this.sessions.clear();
    this.bookings.clear();
    this.saveToStorage();
  }
}

// Global shared singleton for the application UI
export const globalDb = new Database(true);

export function seedInitialDemoData(db: Database) {
  if (db.getAllStudents().length > 0) return;

  const names = [
    { name: 'Camila Rossi', phone: '+5491145218899' },
    { name: 'Valentina Gomez', phone: '+5491155327788' },
    { name: 'Lucia Alvarez', phone: '+5491166436677' },
    { name: 'Mariana Castro', phone: '+5491177545566' },
    { name: 'Florencia Diaz', phone: '+5491188654455' },
    { name: 'Sofia Romero', phone: '+5491199763344' },
    { name: 'Martina Benitez', phone: '+5491122872233' },
    { name: 'Julieta Silva', phone: '+5491133981122' },
    { name: 'Agustina Perez', phone: '+5491144090011' },
    { name: 'Paula Molina', phone: '+5491155109900' },
    { name: 'Daniela Ortiz', phone: '+5491166218800' },
    { name: 'Carolina Ruiz', phone: '+5491177327700' },
    { name: 'Belen Suarez', phone: '+5491188436600' },
    { name: 'Micaela Torres', phone: '+5491199545500' },
  ];

  const students = names.map((item) => db.createStudent(item));

  // Crear paquetes iniciales de 10 clases
  students.forEach((student) => {
    const pkg = db.createPackage({
      student_id: student.id,
      total_classes: 10,
      remaining_classes: 10,
      status: 'ACTIVE',
    });
    db.addAuditLog({
      package_id: pkg.id,
      delta: 10,
      reason: 'MANUAL_ADJUSTMENT',
      performed_by: 'ADMIN',
    });
  });

  // Sesión 1: Hoy 19:00 hs con 11 alumnas confirmadas (1 cupo libre para probar el aforo de 12)
  const today = new Date().toISOString().split('T')[0];
  const s1 = db.createSession({
    instructor_name: 'Andrea',
    start_time: `${today}T19:00:00Z`,
    max_capacity: 12,
  });

  for (let i = 0; i < 11; i++) {
    const student = students[i];
    const pkg = db.getPackagesByStudentId(student.id)[0];
    db.updatePackage(pkg.id, { remaining_classes: 9 });
    db.addAuditLog({
      package_id: pkg.id,
      delta: -1,
      reason: 'CLASS_ATTENDED',
      performed_by: 'SYSTEM',
    });
    db.createBooking({
      session_id: s1.id,
      student_id: student.id,
      booking_status: 'CONFIRMED',
    });
  }

  // Sesión 2: Hoy 20:15 hs con 12 confirmadas y 2 en espera (para probar FIFO y promoción por cancelación)
  const s2 = db.createSession({
    instructor_name: 'Instructora 1',
    start_time: `${today}T20:15:00Z`,
    max_capacity: 12,
  });

  for (let i = 0; i < 12; i++) {
    const student = students[i];
    db.createBooking({
      session_id: s2.id,
      student_id: student.id,
      booking_status: 'CONFIRMED',
    });
  }

  // En espera: 13 y 14 (sin debitar créditos)
  db.createBooking({
    session_id: s2.id,
    student_id: students[12].id,
    booking_status: 'WAITLISTED',
    waitlist_position: 1,
  });
  db.createBooking({
    session_id: s2.id,
    student_id: students[13].id,
    booking_status: 'WAITLISTED',
    waitlist_position: 2,
  });
}
