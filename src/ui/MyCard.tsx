/**
 * Spec 003 — Vista de la alumna al abrir el link de WhatsApp.
 * Lee la tarjeta del fragmento de la URL (no hay servidor) y deja pedir lugar por WhatsApp.
 * Identidad visual y voz: skills/brand-design/SKILL.md
 */
import React, { useMemo } from 'react';
import { Leaf, MessageCircle } from 'lucide-react';
import { CardSnapshot, buildPlaceRequestLink, decodeCardHash, formatDay, formatTime } from '../domain/myCard.ts';
import { NO_BALANCE_MESSAGE } from '../domain/packages.ts';
import { REASON_LABEL } from './StudentCard.tsx';

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

export function MyCard({ hash }: { hash: string }) {
  const card = useMemo(() => decodeCardHash(hash), [hash]);

  return (
    <div className="min-h-screen bg-[#F6F1E9] text-[#2E2A26] font-sans px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />
          <p className="text-lg font-semibold" style={SERIF}>Estudio Andrea</p>
        </header>
        {card ? <CardView card={card} /> : <BrokenLink />}
        <p className="text-sm text-center text-[#4F5F45]">Demo con datos ficticios</p>
      </div>
    </div>
  );
}

function BrokenLink() {
  return (
    <section className="rounded-2xl bg-white p-6 space-y-2 shadow-[0_2px_8px_rgb(46_42_38/0.06)]">
      <h1 className="text-xl font-semibold" style={SERIF}>Este enlace no funciona.</h1>
      <p className="text-base">Pídele uno nuevo a Andrea.</p>
    </section>
  );
}

function CardView({ card }: { card: CardSnapshot }) {
  const used = card.total - card.remaining;
  const low = card.remaining > 0 && card.remaining <= 2;
  const updated = `${formatDay(card.at)} a las ${formatTime(card.at)}`;

  return (
    <>
      <section className="rounded-2xl bg-white p-6 text-center space-y-4 shadow-[0_2px_8px_rgb(46_42_38/0.06)]">
        <h1 className="text-2xl font-semibold" style={SERIF}>Hola, {card.name}.</h1>
        <p className="text-sm text-[#4F5F45]">Clases disponibles</p>
        <p
          className={`text-5xl font-bold ${card.remaining === 0 ? 'text-[#B3261E]' : low ? 'text-[#C46A4A]' : 'text-[#4F5F45]'}`}
        >
          {card.remaining}
          <span className="text-lg font-medium text-[#2E2A26]"> / {card.total}</span>
        </p>
        <div className="grid grid-cols-5 gap-3 justify-items-center" aria-label={`${used} sellos usados de ${card.total}`}>
          {Array.from({ length: card.total }, (_, i) => (
            <span
              key={i}
              className={`w-9 h-9 rounded-full border-2 ${i < used ? 'bg-[#7A8F6B] border-[#7A8F6B]' : 'border-[#E4DDD2]'}`}
            />
          ))}
        </div>
        {low && <p className="text-sm font-medium text-[#C46A4A]">Te quedan pocas clases.</p>}
        {card.remaining === 0 && <p className="text-sm font-medium text-[#B3261E]">{NO_BALANCE_MESSAGE}</p>}
        <p className="text-sm text-[#4F5F45]">Actualizada el {updated}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold" style={SERIF}>Próximas clases</h2>
        {card.classes.length === 0 ? (
          <p className="text-base">No hay clases agendadas esta semana.</p>
        ) : (
          <ul className="space-y-3">
            {card.classes.map((c) => {
              const link = buildPlaceRequestLink(card, c.id);
              return (
                <li key={c.id} className="rounded-2xl bg-white p-4 space-y-3 shadow-[0_2px_8px_rgb(46_42_38/0.06)]">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-base font-medium">
                      {formatDay(c.start)} · {formatTime(c.start)}
                      <span className="block text-sm font-normal text-[#4F5F45]">con {c.instructor}</span>
                    </p>
                    <p className={`text-sm font-medium ${c.free === 0 ? 'text-[#C46A4A]' : 'text-[#4F5F45]'}`}>
                      {c.free === 0 ? 'Clase llena' : c.free === 1 ? 'Queda 1 lugar' : `Quedan ${c.free} lugares`}
                    </p>
                  </div>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full min-h-11 rounded-full flex items-center justify-center gap-2 font-medium ${
                        c.free === 0
                          ? 'border border-[#4F5F45] text-[#4F5F45] hover:bg-[#F6F1E9]'
                          : 'bg-[#4F5F45] hover:bg-[#2E2A26] text-white'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" strokeWidth={1.5} aria-hidden />
                      {c.free === 0 ? 'Anotarme en espera' : 'Pedir lugar'}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-[#4F5F45]">Andrea te confirma el lugar por WhatsApp.</p>
      </section>

      {card.history.length > 0 && (
        <details className="rounded-2xl bg-white">
          <summary className="min-h-11 px-4 flex items-center cursor-pointer font-medium">Historial</summary>
          <ul className="divide-y divide-[#E4DDD2]">
            {card.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm text-[#4F5F45]">{formatDay(h.at)} · {formatTime(h.at)}</p>
                  <p className="text-base">{REASON_LABEL[h.reason] ?? 'Movimiento'}</p>
                </div>
                <span className="text-base font-bold">{h.delta > 0 ? `+${h.delta}` : `−${Math.abs(h.delta)}`}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
