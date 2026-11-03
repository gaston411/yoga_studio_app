/**
 * Spec 003 — Portada de Sello (nombre del producto) para el ICP: la dueña de un estudio chico de yoga o pilates.
 * Voz "Calma Activa": directa, sin promesas infladas. Identidad: skills/brand-design/SKILL.md
 */
import React from 'react';
import { Leaf, Stamp, Users, MessageCircle } from 'lucide-react';

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

const BENEFITS = [
  {
    icon: Stamp,
    title: 'La tarjeta, sin papel.',
    text: 'Cada alumna tiene sus 10 sellos y un historial que explica cada clase. Cero discusiones.',
  },
  {
    icon: MessageCircle,
    title: 'Su saldo, en un toque.',
    text: 'Le mandas la tarjeta por WhatsApp. Ve cuántas clases le quedan y te pide lugar. Sin cuentas ni contraseñas.',
  },
  {
    icon: Users,
    title: 'Nunca más 13 en 12 mats.',
    text: 'Cupo de 12, lista de espera en orden y asistencia en un toque desde el celular.',
  },
];

export function Landing({ onTryDemo }: { onTryDemo: () => void }) {
  return (
    <div className="min-h-screen bg-[#F6F1E9] text-[#2E2A26] font-sans">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />
        <p className="text-lg font-semibold" style={SERIF}>Sello</p>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        <section className="py-12 sm:py-20 max-w-2xl space-y-6">
          <p className="text-sm font-medium text-[#C46A4A]">Para estudios chicos de yoga y pilates</p>
          <h1 className="text-4xl sm:text-6xl font-semibold leading-tight" style={SERIF}>
            Adiós a las tarjetas de papel.
          </h1>
          <p className="text-lg max-w-xl">
            Tus alumnas saben cuántas clases les quedan. Tú dejas de contestarlo por WhatsApp.
            Y vuelves al mat.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onTryDemo}
              className="min-h-12 px-8 rounded-full bg-[#4F5F45] hover:bg-[#2E2A26] text-white font-medium"
            >
              Probar la demo
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="Qué resuelve">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-2xl bg-white p-6 space-y-3 shadow-[0_2px_8px_rgb(46_42_38/0.06)]">
              <Icon className="w-6 h-6 text-[#7A8F6B]" strokeWidth={1.5} aria-hidden />
              <h2 className="text-xl font-semibold" style={SERIF}>{title}</h2>
              <p className="text-base">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-[#E4DDD2] p-6 max-w-2xl space-y-2">
          <h2 className="text-xl font-semibold" style={SERIF}>Hecha para tu estudio, no para un gimnasio.</h2>
          <p className="text-base">
            1 sala, hasta 3 instructoras y 150 alumnas. Cobras como siempre: en persona o por transferencia.
            Sin comisiones, sin pagos online.
          </p>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-[#4F5F45]">
        Sello · La demo usa el estudio ficticio de Andrea
      </footer>
    </div>
  );
}
