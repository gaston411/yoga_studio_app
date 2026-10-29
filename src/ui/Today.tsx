/**
 * Spec 002 — Pantalla "Hoy" para Andrea y las instructoras.
 * Voz e identidad: skills/brand-design/SKILL.md ("Calma Activa").
 */
import React, { useState } from 'react';
import { Check, ChevronLeft, Users } from 'lucide-react';
import { Database } from '../infrastructure/db.ts';
import { SessionService } from '../domain/sessions.ts';
import {
  attendanceMessage,
  buildTodaySummary,
  dayRange,
  formatTime,
  loadClasses,
  weekRange,
  weeklyOccupancy,
  TodayClass,
} from '../domain/today.ts';

interface TodayProps {
  db: Database;
  sessionService: SessionService;
  onRefresh: () => void;
}

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

export function Today({ db, sessionService, onRefresh }: TodayProps) {
  const [openClassId, setOpenClassId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [, setTick] = useState(0);

  const now = new Date();
  const todayClasses = loadClasses(db, ...dayRange(now)).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const summary = buildTodaySummary(todayClasses, now);
  const occupancy = weeklyOccupancy(loadClasses(db, ...weekRange(now)));
  const openClass = todayClasses.find((c) => c.id === openClassId);

  const markHere = (studentId: string, name: string) => {
    try {
      sessionService.markAttendance(openClassId!, studentId);
      setToast({ kind: 'ok', text: attendanceMessage(name) });
      setTick((t) => t + 1);
      onRefresh();
    } catch (err: unknown) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'No pudimos marcarla. Prueba otra vez.' });
    }
  };

  if (openClass) {
    return (
      <ClassAttendance
        db={db}
        cls={openClass}
        toast={toast}
        onBack={() => { setOpenClassId(null); setToast(null); }}
        onMark={markHere}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <header className="space-y-1 pt-2">
        <h2 className="text-3xl font-semibold leading-tight" style={SERIF}>{summary.title}</h2>
        <p className="text-base text-[#4F5F45]">{summary.detail}</p>
      </header>

      <section aria-label="Ocupación de la semana" className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[#4F5F45]">Esta semana</p>
          <p className="text-sm font-semibold">{occupancy.percent} %</p>
        </div>
        <div
          className="h-3 rounded-full bg-[#E4DDD2] overflow-hidden"
          role="meter"
          aria-valuenow={occupancy.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Ocupación"
        >
          <div
            className="h-full rounded-full bg-[#7A8F6B] transition-[width] duration-700"
            style={{ width: `${occupancy.percent}%` }}
          />
        </div>
        <p className="text-base">{occupancy.label}</p>
      </section>

      <section className="space-y-3">
        {todayClasses.map((c) => (
          <ClassCard key={c.id} cls={c} isPast={new Date(c.startTime) < now} onOpen={() => setOpenClassId(c.id)} />
        ))}
      </section>
    </div>
  );
}

function ClassCard({ cls, isPast, onOpen }: { cls: TodayClass; isPast: boolean; onOpen: () => void }) {
  const free = cls.capacity - cls.taken;
  return (
    <button
      onClick={onOpen}
      disabled={cls.cancelled}
      className={`w-full text-left rounded-2xl bg-white p-4 min-h-11 flex items-center gap-4 border border-[#E4DDD2] shadow-[0_2px_8px_rgb(46_42_38/0.06)] ${
        cls.cancelled ? 'opacity-60' : 'hover:border-[#7A8F6B] active:scale-[0.99] transition'
      }`}
    >
      <span className={`text-2xl font-semibold tabular-nums ${isPast ? 'text-[#4F5F45]' : ''}`} style={SERIF}>
        {formatTime(cls.startTime)}
      </span>
      <span className="flex-1">
        <span className="block text-base font-medium">{cls.instructor}</span>
        <span className="block text-sm text-[#4F5F45]">
          {cls.cancelled
            ? 'Cancelada'
            : free > 0
              ? `${cls.taken} de ${cls.capacity} · quedan ${free}`
              : `Llena${cls.waiting ? ` · ${cls.waiting} en espera` : ''}`}
        </span>
      </span>
      {!cls.cancelled && <Users className="w-5 h-5 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />}
    </button>
  );
}

function ClassAttendance({
  db,
  cls,
  toast,
  onBack,
  onMark,
}: {
  db: Database;
  cls: TodayClass;
  toast: { kind: 'ok' | 'error'; text: string } | null;
  onBack: () => void;
  onMark: (studentId: string, name: string) => void;
}) {
  const bookings = db
    .getBookingsBySessionId(cls.id)
    .filter((b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'ATTENDED')
    .map((b) => ({ ...b, student: db.getStudentById(b.student_id) }))
    .sort((a, b) => (a.student?.name ?? '').localeCompare(b.student?.name ?? ''));
  const here = bookings.filter((b) => b.booking_status === 'ATTENDED').length;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <button onClick={onBack} className="min-h-11 -ml-2 px-2 flex items-center gap-1 text-[#4F5F45] font-medium">
        <ChevronLeft className="w-5 h-5" strokeWidth={1.5} aria-hidden />
        Hoy
      </button>

      <header className="space-y-1">
        <h2 className="text-3xl font-semibold" style={SERIF}>
          {formatTime(cls.startTime)} con {cls.instructor}
        </h2>
        <p className="text-base text-[#4F5F45]">
          {here === 0 ? 'Toca a cada alumna cuando llegue.' : `${here} de ${bookings.length} en la sala.`}
        </p>
      </header>

      {toast && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-3 text-base ${
            toast.kind === 'ok' ? 'bg-[#7A8F6B]/15 text-[#2E2A26]' : 'bg-[#B3261E]/10 text-[#B3261E]'
          }`}
        >
          {toast.text}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="text-base">Nadie anotada todavía.</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => {
            const done = b.booking_status === 'ATTENDED';
            const name = b.student?.name ?? 'Alumna';
            return (
              <li key={b.id}>
                <button
                  onClick={() => onMark(b.student_id, name)}
                  disabled={done}
                  className={`w-full min-h-14 rounded-full px-5 flex items-center justify-between text-base font-medium border transition ${
                    done
                      ? 'bg-[#4F5F45] text-white border-[#4F5F45]'
                      : 'bg-white border-[#E4DDD2] hover:border-[#7A8F6B] active:scale-[0.99]'
                  }`}
                  aria-label={done ? `${name} ya está en la sala` : `Marcar a ${name}`}
                >
                  {name}
                  {done ? (
                    <span className="flex items-center gap-1 text-sm">
                      <Check className="w-4 h-4" strokeWidth={2} aria-hidden /> En la sala
                    </span>
                  ) : (
                    <span className="text-sm text-[#4F5F45]">Llegó</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Si algo se rompe, la app lo admite con calma y ofrece reintentar. */
export class CalmErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="max-w-md mx-auto py-16 space-y-4 text-center">
        <h2 className="text-3xl font-semibold" style={SERIF}>Perdimos el equilibrio.</h2>
        <p className="text-base text-[#4F5F45]">Algo se cayó por aquí. Danos un segundo para volver al eje.</p>
        <button
          onClick={() => this.setState({ failed: false })}
          className="min-h-11 px-8 rounded-full bg-[#4F5F45] text-white font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
