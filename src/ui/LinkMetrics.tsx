/**
 * Spec 003 · CA6 — Panel de métricas de las tarjetas enviadas, en Gestión.
 * Todo se calcula en el navegador de Andrea; no hay servicios de analítica.
 */
import React, { useMemo } from 'react';
import { Database } from '../infrastructure/db.ts';
import { computeLinkMetrics } from '../domain/myCard.ts';
import { loadLinkEvents } from '../infrastructure/linkEvents.ts';

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

export function LinkMetrics({ db }: { db: Database }) {
  const metrics = useMemo(() => {
    const bookings = db.getAllSessions().flatMap((s) => db.getBookingsBySessionId(s.id));
    return computeLinkMetrics(loadLinkEvents(), bookings, new Date());
  }, [db]);

  const tiles = [
    { label: 'Tarjetas mandadas', value: String(metrics.sent), hint: `${metrics.students} alumnas` },
    { label: 'Reservan en 7 días', value: `${metrics.activationPercent} %`, hint: 'Meta: 40 %' },
    { label: 'Vuelven en 14 días', value: `${metrics.retentionPercent} %`, hint: 'Meta: 30 %' },
  ];

  return (
    <section className="max-w-md mx-auto space-y-3">
      <h2 className="text-xl font-semibold" style={SERIF}>Tarjetas por WhatsApp</h2>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl bg-white p-3 border border-[#E4DDD2] space-y-1">
            <p className="text-2xl font-bold text-[#4F5F45]">{t.value}</p>
            <p className="text-sm leading-tight">{t.label}</p>
            <p className="text-sm text-[#4F5F45]">{t.hint}</p>
          </div>
        ))}
      </div>
      {metrics.sent === 0 && (
        <p className="text-sm text-[#4F5F45]">Todavía no mandaste tarjetas. Elige una alumna abajo y toca "Mandar tarjeta por WhatsApp".</p>
      )}
    </section>
  );
}
