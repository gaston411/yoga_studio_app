/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Student, ClassSession, InstructorName } from '../infrastructure/db.ts';
import { PackageService } from '../domain/packages.ts';
import { REASON_LABEL, BY_LABEL } from './StudentCard.tsx';
import { SessionService, EmergencyCancellationReport } from '../domain/sessions.ts';
import {
  Users,
  CreditCard,
  AlertTriangle,
  Calendar,
  MessageCircle,
  PlusCircle,
  History,
  CheckCircle2,
  Phone,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardProps {
  db: Database;
  packageService: PackageService;
  sessionService: SessionService;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  db,
  packageService,
  sessionService,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'packages' | 'sessions' | 'emergency'>('packages');

  // Form states for student/package
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('+54 9 11 ');
  const [packageClasses, setPackageClasses] = useState(10);
  const [selectedStudentForAudit, setSelectedStudentForAudit] = useState<Student | null>(null);

  // Form states for new session
  const [sessionInstructor, setSessionInstructor] = useState<InstructorName>('Andrea');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('19:00');

  // Emergency cancellation state
  const [selectedEmergencySession, setSelectedEmergencySession] = useState<string>('');
  const [emergencyReason, setEmergencyReason] = useState('Enfermedad de instructora');
  const [emergencyReport, setEmergencyReport] = useState<EmergencyCancellationReport | null>(null);

  // Feedback notifications
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const students = db.getAllStudents();
  const sessions = sessionService.getAllSessions();

  const handleCreateStudentAndPackage = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!studentName.trim() || !studentPhone.trim()) {
        setFeedback({ type: 'error', message: 'Falta el nombre o el teléfono.' });
        return;
      }
      const student = db.createStudent({ name: studentName, phone: studentPhone });
      const pkg = packageService.createPackage(student.id, Number(packageClasses), 'ADMIN');
      setFeedback({
        type: 'success',
        message: `Listo. ${student.name} arranca con ${pkg.total_classes} clases.`,
      });
      setStudentName('');
      setStudentPhone('+54 9 11 ');
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'No pudimos dar de alta el paquete. Prueba otra vez.' });
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = `${sessionDate}T${sessionTime}:00Z`;
      sessionService.createSession({
        instructor_name: sessionInstructor,
        start_time: startTime,
        max_capacity: 12,
      });
      setFeedback({
        type: 'success',
        message: `Agendada con ${sessionInstructor}. 12 lugares libres.`,
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'No se pudo crear la clase.' });
    }
  };

  const handleTriggerEmergencyCancellation = () => {
    if (!selectedEmergencySession) {
      setFeedback({ type: 'error', message: 'Elige la clase que quieres cancelar.' });
      return;
    }
    try {
      const report = sessionService.cancelSessionDueToEmergency(
        selectedEmergencySession,
        emergencyReason,
        'ADMIN'
      );
      setEmergencyReport(report);
      setFeedback({
        type: 'success',
        message: `Clase cancelada. Les devolvimos la clase a ${report.affectedStudents.length} alumnas. Ahora avísales.`,
      });
      onRefresh();
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'No pudimos cancelar la clase. Prueba otra vez.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Administradora */}
      <div className="bg-[#2E2A26] text-[#7A8F6B]/10 rounded-2xl p-6 shadow-md border border-[#4F5F45]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-[#E4DDD2]">
              Gestión
            </span>
            <h2 className="text-2xl font-semibold mt-1 text-white" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>Todo el estudio, a mano.</h2>
            <p className="text-[#E4DDD2] text-sm mt-0.5">
              Paquetes, clases y avisos. Sin vueltas.
            </p>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="flex gap-2 mt-6 border-b border-[#4F5F45]/70 pb-1">
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'packages'
                ? 'bg-[#4F5F45] text-white shadow-sm'
                : 'text-[#E4DDD2] hover:bg-[#4F5F45]/50 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Paquetes
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'sessions'
                ? 'bg-[#4F5F45] text-white shadow-sm'
                : 'text-[#E4DDD2] hover:bg-[#4F5F45]/50 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Clases
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'emergency'
                ? 'bg-red-700 text-white shadow-sm'
                : 'text-[#E4DDD2] hover:bg-red-950/60 hover:text-red-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Avisos
          </button>
        </div>
      </div>

      {/* Alerta de feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-[#7A8F6B]/10 text-[#2E2A26] border border-[#E4DDD2]'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-75"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* TAB 1: PAQUETES Y AUDITORÍA */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario de Nuevo paquete */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E4DDD2] lg:col-span-1">
            <h3 className="text-lg font-bold text-[#2E2A26] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#4F5F45]" />
              Nuevo paquete
            </h3>
            <p className="text-xs text-[#4F5F45] mt-1 mb-4">
              Cobra en el estudio o por transferencia y registra aquí el paquete de 10 clases.
            </p>

            <form onSubmit={handleCreateStudentAndPackage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sofía Gómez"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  required
                  placeholder="+54 9 11 0000-0000"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B]"
                />
                <span className="text-[10px] text-[#4F5F45]">
                  Con código de país, para poder escribirle por WhatsApp.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Clases</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={packageClasses}
                  onChange={(e) => setPackageClasses(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B]"
                />
                <span className="text-[10px] text-[#4F5F45]">Estándar del estudio: 10 clases</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#4F5F45] hover:bg-[#2E2A26] text-white font-medium text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Dar de alta paquete
              </button>
            </form>
          </div>

          {/* Listado de Alumnas, Saldos y Auditoría */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E4DDD2] lg:col-span-2">
            <h3 className="text-lg font-bold text-[#2E2A26] flex items-center gap-2 mb-1">
              <Users className="w-5 h-5 text-[#4F5F45]" />
              Alumnas
            </h3>
            <p className="text-xs text-[#4F5F45] mb-4">
              Mira cuántas clases le quedan a cada alumna y su historial.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4DDD2] text-[#4F5F45] text-xs font-semibold uppercase">
                    <th className="py-2.5 px-3">Alumna</th>
                    <th className="py-2.5 px-3">Teléfono</th>
                    <th className="py-2.5 px-3">Saldo</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Historial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F6F1E9]">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#4F5F45] text-xs">
                        Todavía no hay alumnas. Da de alta la primera.
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const activePkg = packageService.getActivePackage(student.id);
                      const allPkgs = packageService.getPackagesByStudent(student.id);
                      const latestPkg = allPkgs[allPkgs.length - 1];

                      return (
                        <tr key={student.id} className="hover:bg-[#F6F1E9]/80">
                          <td className="py-3 px-3 font-medium text-[#2E2A26]">{student.name}</td>
                          <td className="py-3 px-3 text-[#4F5F45] text-xs">{student.phone}</td>
                          <td className="py-3 px-3">
                            {activePkg ? (
                              <span className="font-semibold text-[#4F5F45]">
                                {activePkg.remaining_classes} / {activePkg.total_classes} clases
                              </span>
                            ) : latestPkg ? (
                              <span className="font-semibold text-[#4F5F45]">
                                0 / {latestPkg.total_classes} clases
                              </span>
                            ) : (
                              <span className="text-[#4F5F45] text-xs">Sin paquete</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {activePkg ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#7A8F6B]/15 text-[#4F5F45]">
                                ACTIVO
                              </span>
                            ) : latestPkg?.status === 'EXHAUSTED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                Sin clases
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F6F1E9] text-[#4F5F45]">
                                Sin clases
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedStudentForAudit(student)}
                              className="inline-flex items-center gap-1 text-xs text-[#4F5F45] hover:text-[#2E2A26] font-semibold px-2.5 py-1 rounded-md bg-[#7A8F6B]/10 hover:bg-[#7A8F6B]/15 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                              Historial
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal de Auditoría Inmutable */}
            {selectedStudentForAudit && (
              <div className="fixed inset-0 bg-[#2E2A26]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#E4DDD2] max-h-[85vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#E4DDD2]">
                    <div>
                      <h4 className="font-bold text-[#2E2A26]">
                        Historial de {selectedStudentForAudit.name}
                      </h4>
                      <p className="text-xs text-[#4F5F45]">
                        Todos los movimientos del paquete. No se pueden borrar.
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedStudentForAudit(null)}
                      className="text-[#4F5F45] hover:text-[#4F5F45] text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {(() => {
                    const auditTrail = packageService.getStudentFullAuditTrail(selectedStudentForAudit.id);
                    if (auditTrail.length === 0 || auditTrail.every((t) => t.logs.length === 0)) {
                      return <p className="text-xs text-[#4F5F45] py-4">Sin movimientos todavía.</p>;
                    }

                    return (
                      <div className="space-y-4">
                        {auditTrail.map((item, idx) => (
                          <div key={item.package.id} className="bg-[#F6F1E9] p-4 rounded-xl border border-[#E4DDD2]">
                            <div className="flex justify-between items-center text-xs font-semibold text-[#4F5F45] mb-2">
                              <span>Paquete #{idx + 1} ({item.package.total_classes} clases)</span>
                              <span className="text-[#4F5F45] font-bold">
                                Saldo actual: {item.package.remaining_classes}
                              </span>
                            </div>
                            <div className="space-y-2">
                              {item.logs.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between text-xs bg-white p-2 rounded border border-[#F6F1E9]"
                                >
                                  <div>
                                    <div className="font-semibold text-[#2E2A26] flex items-center gap-1.5">
                                      <span
                                        className={`font-mono font-bold ${
                                          log.delta > 0 ? 'text-[#4F5F45]' : 'text-red-700'
                                        }`}
                                      >
                                        {log.delta > 0 ? `+${log.delta}` : log.delta}
                                      </span>
                                      <span>— {REASON_LABEL[log.reason] ?? log.reason}</span>
                                    </div>
                                    <div className="text-[10px] text-[#4F5F45] mt-0.5">
                                      {new Date(log.timestamp).toLocaleString('es-AR', { hour12: false })} • Registró: {BY_LABEL[log.performed_by] ?? log.performed_by}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedStudentForAudit(null)}
                      className="px-4 py-2 bg-[#E4DDD2] hover:bg-[#E4DDD2] text-[#2E2A26] rounded-lg text-xs font-semibold"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CLASES Y AFORO */}
      {activeTab === 'sessions' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E4DDD2] lg:col-span-1">
            <h3 className="text-lg font-bold text-[#2E2A26] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#4F5F45]" />
              Nueva clase
            </h3>
            <p className="text-xs text-[#4F5F45] mt-1 mb-4">
              Cada clase tiene 12 lugares. Quien reserve después entra a la lista de espera.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Instructora</label>
                <select
                  value={sessionInstructor}
                  onChange={(e) => setSessionInstructor(e.target.value as InstructorName)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B] bg-white"
                >
                  <option value="Andrea">Andrea</option>
                  <option value="Marta">Marta</option>
                  <option value="Sofía">Sofía</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Hora</label>
                <select
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A8F6B] bg-white"
                >
                  <option value="18:00">18:00 hs</option>
                  <option value="19:00">19:00 hs</option>
                  <option value="19:30">19:30 hs</option>
                  <option value="20:30">20:30 hs</option>
                </select>
              </div>

              <div className="bg-[#F6F1E9] p-3 rounded-lg border border-[#E4DDD2] text-xs text-[#4F5F45]">
                <span className="font-semibold block text-[#2E2A26]">Lugares:</span>
                12 lugares. Desde la alumna 13, las reservas pasan a la lista de espera.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-[#4F5F45] hover:bg-[#2E2A26] text-white font-medium text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Agendar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E4DDD2] lg:col-span-2">
            <h3 className="text-lg font-bold text-[#2E2A26] flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-[#4F5F45]" />
              Clases agendadas
            </h3>
            <p className="text-xs text-[#4F5F45] mb-4">
              Lugares ocupados y lista de espera de cada clase.
            </p>

            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-[#4F5F45] text-sm border border-dashed rounded-xl">
                  Nada agendado todavía.
                </div>
              ) : (
                sessions.map((session) => {
                  const confirmed = sessionService.getConfirmedBookings(session.id);
                  const waitlisted = sessionService.getWaitlistedBookings(session.id);
                  const isFull = confirmed.length >= (session.max_capacity ?? 12);
                  const isCancelled = session.status === 'CANCELLED';

                  return (
                    <div
                      key={session.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCancelled
                          ? 'bg-red-50/50 border-red-200 opacity-80'
                          : isFull
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-[#E4DDD2] hover:border-[#E4DDD2]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#2E2A26]">
                              {session.instructor_name}
                            </span>
                            {isCancelled ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                                Cancelada
                              </span>
                            ) : session.status === 'SUBSTITUTED' ? (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                Con reemplazo
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7A8F6B]/15 text-[#4F5F45]">
                                Agendada
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#4F5F45] mt-0.5">
                            Fecha: {session.start_time.split('T')[0]} a las{' '}
                            {session.start_time.includes('T')
                              ? session.start_time.split('T')[1].substring(0, 5)
                              : ''}{' '}
                            hs
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-right">
                            <span className="font-bold text-[#2E2A26] text-sm">
                              {confirmed.length} / {session.max_capacity ?? 12}
                            </span>
                            <span className="block text-[10px] text-[#4F5F45]">anotadas</span>
                          </div>

                          {waitlisted.length > 0 && (
                            <div className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg text-right font-medium">
                              <span className="font-bold text-xs">{waitlisted.length}</span>
                              <span className="block text-[10px]">en espera</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progreso del cupo de 12 */}
                      <div className="mt-3">
                        <div className="w-full bg-[#E4DDD2] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              isCancelled
                                ? 'bg-red-400'
                                : isFull
                                ? 'bg-amber-500'
                                : 'bg-[#7A8F6B]'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (confirmed.length / (session.max_capacity ?? 12)) * 100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTINGENCIA Y WHATSAPP */}
      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-red-950">
                  Cancelar una clase
                </h3>
                <p className="text-xs text-red-800 leading-relaxed max-w-2xl">
                  Si alguien se enferma: cancelas acá, a cada alumna se le devuelve la clase
                  y te dejamos listo un WhatsApp para avisarle.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">
                  Clase
                </label>
                <select
                  value={selectedEmergencySession}
                  onChange={(e) => setSelectedEmergencySession(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                >
                  <option value="">Elige una clase</option>
                  {sessions
                    .filter((s) => s.status !== 'CANCELLED')
                    .map((s) => {
                      const count = sessionService.getConfirmedBookings(s.id).length;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.start_time.split('T')[0]} {s.start_time.split('T')[1].substring(0, 5)} hs —{' '}
                          {s.instructor_name} ({count} confirmadas)
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4F5F45] mb-1">Motivo</label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E4DDD2] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={handleTriggerEmergencyCancellation}
                className="py-2.5 px-6 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Cancelar y devolver clases
              </button>
            </div>
          </div>

          {/* Reporte de Alumnas Afectadas y Botones de WhatsApp */}
          {emergencyReport && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E4DDD2]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold text-[#2E2A26] flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#7A8F6B]" />
                    Avisa a {emergencyReport.affectedStudents.length} alumnas
                  </h4>
                  <p className="text-xs text-[#4F5F45]">
                    Toca cada botón: se abre WhatsApp con el mensaje listo.
                  </p>
                </div>
              </div>

              {emergencyReport.affectedStudents.length === 0 ? (
                <div className="p-4 bg-[#F6F1E9] rounded-xl text-[#4F5F45] text-xs">
                  La clase no tenía alumnas anotadas. Quedó cancelada.
                </div>
              ) : (
                <div className="space-y-3">
                  {emergencyReport.affectedStudents.map((item) => (
                    <div
                      key={item.student.id}
                      className="p-4 rounded-xl border border-[#E4DDD2] bg-[#F6F1E9]/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#2E2A26] text-sm">
                            {item.student.name}
                          </span>
                          <span className="text-xs font-mono text-[#4F5F45] bg-[#E4DDD2] px-2 py-0.5 rounded">
                            {item.student.phone}
                          </span>
                          <span className="text-[11px] font-semibold text-[#4F5F45] bg-[#7A8F6B]/15 px-2 py-0.5 rounded">
                            Clase devuelta (+1)
                          </span>
                        </div>
                        <p className="text-xs text-[#4F5F45] italic line-clamp-1 max-w-xl">
                          "{item.messageText}"
                        </p>
                      </div>

                      <a
                        href={item.whatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#7A8F6B] hover:bg-[#4F5F45] text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Avisar
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
