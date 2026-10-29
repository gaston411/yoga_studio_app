/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Student } from '../infrastructure/db.ts';
import { PackageService } from '../domain/packages.ts';
import { SessionService } from '../domain/sessions.ts';
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  History,
  XCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

interface StudentBookingProps {
  db: Database;
  packageService: PackageService;
  sessionService: SessionService;
  onRefresh: () => void;
}

export const StudentBooking: React.FC<StudentBookingProps> = ({
  db,
  packageService,
  sessionService,
  onRefresh,
}) => {
  const students = db.getAllStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length > 0 ? students[0].id : ''
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null
  );
  const [showHistory, setShowHistory] = useState(false);

  // Alumna seleccionada actualmente
  const currentStudent = students.find((s) => s.id === selectedStudentId);
  const activePackage = currentStudent ? packageService.getActivePackage(currentStudent.id) : undefined;
  const allPackages = currentStudent ? packageService.getPackagesByStudent(currentStudent.id) : [];
  const latestPackage = allPackages[allPackages.length - 1];

  const sessions = sessionService.getAllSessions();

  const handleBookSession = (sessionId: string) => {
    if (!currentStudent) return;
    try {
      const booking = sessionService.bookSession(sessionId, currentStudent.id);
      if (booking.booking_status === 'CONFIRMED') {
        setFeedback({
          type: 'success',
          message: '¡Lugar confirmado! Se debitó 1 clase de tu paquete activo.',
        });
      } else {
        setFeedback({
          type: 'info',
          message: `Clase completa. Has ingresado a la Lista de Espera en la Posición #${booking.waitlist_position}. Tu saldo NO será debitado hasta que se confirme tu lugar.`,
        });
      }
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al procesar la reserva',
      });
    }
  };

  const handleCancelBooking = (sessionId: string) => {
    if (!currentStudent) return;
    try {
      const res = sessionService.cancelBooking(sessionId, currentStudent.id);
      setFeedback({
        type: 'info',
        message: 'Reserva cancelada correctamente. Tu saldo de clase ha sido restituido a tu paquete.',
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al cancelar la reserva',
      });
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5 pb-12">
      {/* Header móvil de Andrea Yoga */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-3xl p-6 shadow-lg border border-emerald-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-emerald-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Andrea Yoga Estudio</h1>
          </div>
          <span className="text-[11px] font-semibold bg-emerald-700/80 px-2.5 py-1 rounded-full text-emerald-200">
            Portal Alumna
          </span>
        </div>

        {/* Selector de perfil de alumna para simulación o uso directo */}
        <div className="bg-emerald-950/40 p-3 rounded-2xl border border-emerald-700/40 mb-4">
          <label className="block text-[11px] text-emerald-300 font-medium mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Alumna activa:
          </label>
          {students.length === 0 ? (
            <p className="text-xs text-emerald-200">No hay alumnas registradas. Regístrate con Andrea.</p>
          ) : (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-emerald-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tarjeta de Saldo del Paquete */}
        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-emerald-200 font-medium block">
                Tu Paquete de Clases
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl font-black text-white">
                  {activePackage ? activePackage.remaining_classes : 0}
                </span>
                <span className="text-sm text-emerald-200 font-medium">
                  / {activePackage ? activePackage.total_classes : latestPackage?.total_classes || 10} disponibles
                </span>
              </div>
            </div>

            <div className="text-right">
              {activePackage ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ACTIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-400/20 text-red-300 border border-red-400/30">
                  <AlertCircle className="w-3.5 h-3.5" />
                  AGOTADO
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="text-emerald-200 text-[11px]">
              {activePackage && activePackage.remaining_classes === 1
                ? '¡Última clase de tu paquete!'
                : activePackage
                ? 'Control transaccional y auditoría inmutable'
                : 'Contacta a Andrea para renovar tu paquete'}
            </span>

            {currentStudent && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-[11px] font-bold underline text-white hover:text-emerald-200 flex items-center gap-1"
              >
                <History className="w-3 h-3" />
                {showHistory ? 'Ocultar' : 'Movimientos'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Historial de Auditoría Desplegable para Alumna */}
      {showHistory && currentStudent && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-200 text-xs space-y-3">
          <h4 className="font-bold text-stone-900 flex items-center gap-1.5">
            <History className="w-4 h-4 text-emerald-700" />
            Trazabilidad de tus Clases
          </h4>
          {(() => {
            const auditTrail = packageService.getStudentFullAuditTrail(currentStudent.id);
            const allLogs = auditTrail.flatMap((t) => t.logs);
            if (allLogs.length === 0) {
              return <p className="text-stone-400">Sin movimientos registrados aún.</p>;
            }
            return (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {allLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex justify-between items-center p-2 rounded-lg bg-stone-50 border border-stone-100"
                  >
                    <div>
                      <span className="font-semibold text-stone-800 block">{log.reason}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(log.timestamp).toLocaleDateString()} • {log.performed_by}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        log.delta > 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {log.delta > 0 ? `+${log.delta}` : log.delta}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Mensajes de Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-start justify-between gap-2 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : feedback.type === 'error'
              ? 'bg-red-50 text-red-900 border border-red-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="font-bold text-stone-500 hover:text-stone-800">
            ✕
          </button>
        </div>
      )}

      {/* Cartelera de Clases Vespertinas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-800" />
            Clases Vespertinas Disponibles
          </h2>
          <span className="text-[11px] font-semibold text-stone-500">Tope: 12 personas</span>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-stone-400 text-xs border border-stone-200">
            No hay clases vespertinas programadas actualmente.
          </div>
        ) : (
          sessions.map((session) => {
            const confirmedBookings = sessionService.getConfirmedBookings(session.id);
            const waitlistedBookings = sessionService.getWaitlistedBookings(session.id);
            const userBooking = currentStudent
              ? sessionService.getBooking(session.id, currentStudent.id)
              : undefined;

            const isConfirmed = userBooking?.booking_status === 'CONFIRMED' || userBooking?.booking_status === 'ATTENDED';
            const isWaitlisted = userBooking?.booking_status === 'WAITLISTED';
            const isFull = confirmedBookings.length >= (session.max_capacity ?? 12);
            const isCancelled = session.status === 'CANCELLED';

            return (
              <div
                key={session.id}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                  isCancelled
                    ? 'border-red-200 bg-red-50/30'
                    : isConfirmed
                    ? 'border-emerald-300 ring-2 ring-emerald-200'
                    : isWaitlisted
                    ? 'border-amber-300 ring-2 ring-amber-100'
                    : 'border-stone-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                      {session.instructor_name}
                      {session.status === 'SUBSTITUTED' && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          Sustitución
                        </span>
                      )}
                    </span>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                      <span>{session.start_time.split('T')[0]}</span>
                      <span>•</span>
                      <span className="font-semibold text-stone-700">
                        {session.start_time.includes('T')
                          ? session.start_time.split('T')[1].substring(0, 5)
                          : ''}{' '}
                        hs
                      </span>
                    </div>
                  </div>

                  {/* Estado de cupo */}
                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isCancelled
                          ? 'bg-red-100 text-red-800'
                          : isFull
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isCancelled
                        ? 'Cancelada'
                        : isFull
                        ? '12/12 Completo'
                        : `${confirmedBookings.length}/12 Lugares`}
                    </span>
                  </div>
                </div>

                {/* Mensaje de espera si hay cola */}
                {isFull && !isCancelled && waitlistedBookings.length > 0 && (
                  <p className="text-[10px] text-amber-700 mb-2">
                    {waitlistedBookings.length} en lista de espera FIFO
                  </p>
                )}

                {/* Acciones de Reserva */}
                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between">
                  {isCancelled ? (
                    <span className="text-xs font-semibold text-red-700">
                      Clase suspendida por contingencia (crédito restituido).
                    </span>
                  ) : isConfirmed ? (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Tu lugar está confirmado
                      </span>
                      <button
                        onClick={() => handleCancelBooking(session.id)}
                        className="text-xs font-semibold text-red-700 hover:text-red-900 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                      >
                        Cancelar Lugar
                      </button>
                    </div>
                  ) : isWaitlisted ? (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                        <Clock className="w-4 h-4 text-amber-600" />
                        En espera (Posición #{userBooking?.waitlist_position})
                      </span>
                      <button
                        onClick={() => handleCancelBooking(session.id)}
                        className="text-xs font-semibold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
                      >
                        Salir de espera
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBookSession(session.id)}
                      disabled={!activePackage || activePackage.remaining_classes <= 0}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                        !activePackage || activePackage.remaining_classes <= 0
                          ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          : isFull
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                      }`}
                    >
                      {isFull ? (
                        <>
                          <Clock className="w-4 h-4" />
                          Anotarme en Lista de Espera (Sin costo)
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Reservar Lugar (-1 clase)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reglas de Servicio y Transparencia */}
      <div className="p-4 bg-stone-100 rounded-2xl text-[11px] text-stone-600 space-y-1.5">
        <span className="font-bold text-stone-800 block flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
          Reglas del Estudio Andrea Yoga:
        </span>
        <p>• El aforo vespertino máximo es de 12 personas para garantizar la práctica personalizada.</p>
        <p>• La lista de espera funciona por orden de llegada (FIFO). Si alguien cancela, entras automáticamente.</p>
        <p>• Tu crédito de clase NO se debita mientras estés en lista de espera.</p>
      </div>
    </div>
  );
};
