/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, InstructorName } from '../infrastructure/db.ts';
import { PackageService } from '../domain/packages.ts';
import { SessionService, CancellationResult } from '../domain/sessions.ts';
import {
  Users,
  CheckCircle,
  Clock,
  UserCheck,
  AlertCircle,
  MessageCircle,
  ExternalLink,
  XCircle,
} from 'lucide-react';

interface AttendanceListProps {
  db: Database;
  packageService: PackageService;
  sessionService: SessionService;
  onRefresh: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  db,
  sessionService,
  onRefresh,
}) => {
  const [selectedInstructor, setSelectedInstructor] = useState<InstructorName>('Instructora 1');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [notificationModal, setNotificationModal] = useState<CancellationResult['promotionNotification'] | null>(
    null
  );
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sessions = sessionService
    .getAllSessions()
    .filter((s) => s.status !== 'CANCELLED');

  // Seleccionar por defecto la primera sesión si no hay seleccionada
  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];
  const activeSessionId = currentSession?.id || '';

  const confirmedBookings = activeSessionId
    ? sessionService.getConfirmedBookings(activeSessionId)
    : [];
  const waitlistedBookings = activeSessionId
    ? sessionService.getWaitlistedBookings(activeSessionId)
    : [];

  const handleMarkAttendance = (studentId: string) => {
    try {
      sessionService.markAttendance(activeSessionId, studentId);
      setMessage({ type: 'success', text: 'Asistencia registrada con éxito.' });
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al registrar asistencia' });
    }
  };

  const handleEarlyCancel = (studentId: string, studentName: string) => {
    if (!confirm(`¿Confirmas la cancelación anticipada del turno de ${studentName}? Si hay lista de espera, se promoverá automáticamente a la siguiente alumna (FIFO).`)) {
      return;
    }
    try {
      const res = sessionService.cancelBooking(activeSessionId, studentId);
      if (res.promotionNotification && res.promotedStudent) {
        setNotificationModal(res.promotionNotification);
        setMessage({
          type: 'success',
          text: `Turno cancelado. ¡Se promovió automáticamente a ${res.promotedStudent.name} de la lista de espera!`,
        });
      } else {
        setMessage({ type: 'success', text: 'Turno cancelado y crédito reembolsado a la alumna.' });
      }
      onRefresh();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al cancelar reserva' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Instructora */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-md border border-stone-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Vista Operativa en Estudio
            </span>
            <h2 className="text-2xl font-bold mt-1 text-white">Lista de Asistencia & Aforo</h2>
            <p className="text-stone-300 text-sm mt-0.5">
              Control presencial para el ingreso de alumnas y gestión FIFO en caso de cancelaciones.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-stone-400">Instructora en turno:</label>
            <select
              value={selectedInstructor}
              onChange={(e) => setSelectedInstructor(e.target.value as InstructorName)}
              className="bg-stone-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-700 focus:outline-none"
            >
              <option value="Instructora 1">Instructora 1</option>
              <option value="Instructora 2">Instructora 2</option>
              <option value="Andrea">Andrea</option>
            </select>
          </div>
        </div>

        {/* Selector de Sesión */}
        <div className="mt-6 flex flex-wrap gap-2">
          {sessions.map((s) => {
            const confirmedCount = sessionService.getConfirmedBookings(s.id).length;
            const isSelected = s.id === (currentSession?.id || '');
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <span>
                  {s.start_time.split('T')[0]} • {s.start_time.split('T')[1].substring(0, 5)} hs
                </span>
                <span className="bg-stone-900/50 px-1.5 py-0.5 rounded text-[10px]">
                  {confirmedCount}/12
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-75"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Modal / Banner de Promoción de Lista de Espera */}
      {notificationModal && (
        <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Promoción Automática FIFO Exitosa
            </span>
            <p className="text-sm font-semibold text-emerald-950">
              Se asignó el cupo liberado a la primera alumna en lista de espera y se debitó su clase.
            </p>
            <p className="text-xs text-stone-600">
              Notifícala ahora por WhatsApp para que asista al estudio:
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={notificationModal.whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Avisar por WhatsApp
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setNotificationModal(null)}
              className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {!currentSession ? (
        <div className="bg-white rounded-2xl p-8 text-center text-stone-400 border border-stone-200">
          No hay sesiones programadas en este momento. Andrea puede crearlas desde el Panel de Administración.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Lista de Alumnas Confirmadas (Cupo máx 12) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                  Alumnas Confirmadas ({confirmedBookings.length} / {currentSession.max_capacity ?? 12})
                </h3>
                <p className="text-xs text-stone-500">
                  Instructora: <span className="font-semibold text-stone-700">{currentSession.instructor_name}</span> • Límite estricto de 12 personas.
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {currentSession.max_capacity - confirmedBookings.length} cupos libres
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {confirmedBookings.length === 0 ? (
                <div className="p-8 text-center text-stone-400 text-xs border border-dashed rounded-xl">
                  Aún no hay reservas confirmadas para esta clase.
                </div>
              ) : (
                confirmedBookings.map((booking, idx) => {
                  const student = db.getStudentById(booking.student_id);
                  if (!student) return null;
                  const isAttended = booking.booking_status === 'ATTENDED';

                  return (
                    <div
                      key={booking.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                        isAttended
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-600 font-mono text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-stone-900 text-sm block">
                            {student.name}
                          </span>
                          <span className="text-xs text-stone-500">{student.phone}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAttended ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-emerald-700" />
                            Presente
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAttendance(student.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Marcar Asistencia
                          </button>
                        )}

                        <button
                          onClick={() => handleEarlyCancel(student.id, student.name)}
                          title="Cancelar reserva de la alumna y promover lista de espera"
                          className="p-1.5 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha: Lista de Espera FIFO */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 lg:col-span-1">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Lista de Espera FIFO
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {waitlistedBookings.length} en espera
              </span>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Orden estricto de llegada (FIFO). La posición 1 será promovida automáticamente si se cancela un cupo confirmado.
            </p>

            <div className="space-y-2">
              {waitlistedBookings.length === 0 ? (
                <div className="p-6 text-center text-stone-400 text-xs border border-dashed rounded-xl">
                  No hay alumnas en espera. El aforo está disponible o dentro de los 12 lugares.
                </div>
              ) : (
                waitlistedBookings.map((booking) => {
                  const student = db.getStudentById(booking.student_id);
                  if (!student) return null;

                  return (
                    <div
                      key={booking.id}
                      className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-amber-600 text-white font-mono text-xs font-bold flex items-center justify-center">
                          #{booking.waitlist_position}
                        </span>
                        <div>
                          <span className="font-semibold text-stone-900 text-xs block">
                            {student.name}
                          </span>
                          <span className="text-[11px] text-stone-500">{student.phone}</span>
                        </div>
                      </div>

                      <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Espera
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
