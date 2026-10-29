/**
 * Spec 001 — Tarjeta digital del paquete.
 * La alumna ve su saldo como "sellos" y el historial que lo explica.
 * Andrea (canAdjust) puede hacer ajustes manuales con motivo obligatorio.
 * Identidad visual: skills/brand-design/SKILL.md
 */
import React, { useMemo, useState } from 'react';
import { Leaf, Search } from 'lucide-react';
import { Database, PackageAuditLog } from '../infrastructure/db.ts';
import { PackageService, PackageError, PACKAGE_SIZE } from '../domain/packages.ts';

interface StudentCardProps {
  db: Database;
  packageService: PackageService;
  canAdjust?: boolean;
  onRefresh?: () => void;
}

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

const REASON_LABEL: Record<string, string> = {
  PACKAGE_CREATED: 'Alta de paquete',
  CLASS_ATTENDED: 'Clase tomada',
  MANUAL_ADJUSTMENT: 'Ajuste de Andrea',
  EMERGENCY_CANCEL_REFUND: 'Clase cancelada, se devuelve',
  LATE_CANCEL_CHARGE: 'Cancelación tardía',
  WAITLIST_PROMOTED: 'Lugar desde lista de espera',
};

const BY_LABEL: Record<string, string> = {
  ADMIN: 'Andrea',
  INSTRUCTOR: 'Instructora',
  SYSTEM: 'Reserva',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function StudentCard({ db, packageService, canAdjust = false, onRefresh }: StudentCardProps) {
  const students = useMemo(
    () => db.getAllStudents().sort((a, b) => a.name.localeCompare(b.name)),
    [db]
  );
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? '');
  const [delta, setDelta] = useState('1');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [version, setVersion] = useState(0);

  const filtered = students.filter((s) =>
    `${s.name} ${s.phone}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  const card = useMemo(() => packageService.getCard(studentId), [studentId, version, packageService]);
  const remaining = card.remainingClasses;
  const used = PACKAGE_SIZE - remaining;
  const low = remaining > 0 && remaining <= 2;

  const describeClass = (entry: PackageAuditLog): string => {
    if (!entry.session_id) return '';
    const session = db.getSessionById(entry.session_id);
    if (!session) return '';
    return `Clase ${formatDateTime(session.start_time)} · ${session.instructor_name}`;
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card.package) return;
    try {
      packageService.adjustBalance(card.package.id, Number(delta), note);
      setMessage({ kind: 'ok', text: 'Ajuste guardado en el historial.' });
      setNote('');
      setVersion((v) => v + 1);
      onRefresh?.();
    } catch (err: unknown) {
      const text = err instanceof PackageError || err instanceof Error ? err.message : 'No se pudo guardar.';
      setMessage({ kind: 'error', text });
    }
  };

  return (
    <section className="max-w-md mx-auto rounded-2xl bg-[#F6F1E9] text-[#2E2A26] p-4 sm:p-6 space-y-6 border border-[#E4DDD2]">
      <header className="flex items-center gap-2">
        <Leaf className="w-5 h-5 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />
        <h2 className="text-xl font-semibold" style={SERIF}>
          {canAdjust ? 'Tarjetas de las alumnas' : 'Mi tarjeta'}
        </h2>
      </header>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="card-search">
          {canAdjust ? 'Busca a la alumna' : 'Busca tu nombre o teléfono'}
        </label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />
          <input
            id="card-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={60}
            className="w-full min-h-11 pl-10 pr-4 rounded-full bg-white border border-[#E4DDD2] text-base focus:outline-2 focus:outline-[#7A8F6B]"
          />
        </div>
        <select
          aria-label="Alumna"
          value={studentId}
          onChange={(e) => { setStudentId(e.target.value); setMessage(null); }}
          className="w-full min-h-11 px-4 rounded-full bg-white border border-[#E4DDD2] text-base"
        >
          {filtered.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {!card.package ? (
        <p className="text-sm">Todavía no tienes un paquete. Habla con Andrea para darlo de alta.</p>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_8px_rgb(46_42_38/0.06)] text-center space-y-4">
            <p className="text-sm text-[#4F5F45]">Clases disponibles</p>
            <p
              className={`text-5xl font-bold ${remaining === 0 ? 'text-[#B3261E]' : low ? 'text-[#C46A4A]' : 'text-[#4F5F45]'}`}
              aria-live="polite"
            >
              {remaining}
              <span className="text-lg font-medium text-[#2E2A26]"> / {PACKAGE_SIZE}</span>
            </p>
            <div className="grid grid-cols-5 gap-3 justify-items-center" aria-label={`${used} sellos usados de ${PACKAGE_SIZE}`}>
              {Array.from({ length: PACKAGE_SIZE }, (_, i) => (
                <span
                  key={i}
                  className={`w-9 h-9 rounded-full border-2 ${i < used ? 'bg-[#7A8F6B] border-[#7A8F6B]' : 'border-[#E4DDD2]'}`}
                />
              ))}
            </div>
            {low && <p className="text-sm font-medium text-[#C46A4A]">Te quedan pocas clases.</p>}
            {remaining === 0 && (
              <p className="text-sm font-medium text-[#B3261E]">
                No te quedan clases. Habla con Andrea para renovar tu paquete.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold" style={SERIF}>Historial</h3>
            <ul className="divide-y divide-[#E4DDD2] rounded-2xl bg-white">
              {card.history.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm text-[#4F5F45]">{formatDateTime(entry.timestamp)}</p>
                    <p className="text-base">{REASON_LABEL[entry.reason] ?? entry.reason}</p>
                    {describeClass(entry) && <p className="text-sm text-[#4F5F45]">{describeClass(entry)}</p>}
                    {entry.note && <p className="text-sm text-[#4F5F45] italic">“{entry.note}”</p>}
                    <p className="text-sm text-[#4F5F45]">Registró: {BY_LABEL[entry.performed_by] ?? entry.performed_by}</p>
                  </div>
                  <span className={`text-base font-bold ${entry.delta < 0 ? 'text-[#2E2A26]' : 'text-[#4F5F45]'}`}>
                    {entry.delta > 0 ? `+${entry.delta}` : `−${Math.abs(entry.delta)}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {canAdjust && (
            <form onSubmit={handleAdjust} className="rounded-2xl bg-white p-4 space-y-3">
              <h3 className="text-lg font-semibold" style={SERIF}>Ajuste manual</h3>
              <label className="block text-sm font-medium" htmlFor="adjust-delta">Clases (+ suma, − resta)</label>
              <input
                id="adjust-delta"
                type="number"
                step={1}
                min={-PACKAGE_SIZE}
                max={PACKAGE_SIZE}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="w-full min-h-11 px-4 rounded-full border border-[#E4DDD2] text-base"
              />
              <label className="block text-sm font-medium" htmlFor="adjust-note">Motivo (obligatorio)</label>
              <input
                id="adjust-note"
                value={note}
                maxLength={200}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ej.: se marcó una clase por error"
                className="w-full min-h-11 px-4 rounded-full border border-[#E4DDD2] text-base"
              />
              <button
                type="submit"
                className="w-full min-h-11 rounded-full bg-[#4F5F45] hover:bg-[#2E2A26] text-white font-medium"
              >
                Guardar ajuste
              </button>
              {message && (
                <p role="status" className={`text-sm ${message.kind === 'error' ? 'text-[#B3261E]' : 'text-[#4F5F45]'}`}>
                  {message.text}
                </p>
              )}
            </form>
          )}
        </>
      )}
    </section>
  );
}
