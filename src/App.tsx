/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { globalDb, seedInitialDemoData } from './infrastructure/db.ts';
import { PackageService } from './domain/packages.ts';
import { SessionService } from './domain/sessions.ts';
import { AdminDashboard } from './ui/AdminDashboard.tsx';
import { AttendanceList } from './ui/AttendanceList.tsx';
import { StudentBooking } from './ui/StudentBooking.tsx';
import { StudentCard } from './ui/StudentCard.tsx';
import {
  Sparkles,
  Shield,
  Users,
  Smartphone,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'admin' | 'instructor' | 'student'>('admin');
  const [refreshKey, setRefreshKey] = useState(0);

  // Instanciar servicios
  const packageService = new PackageService(globalDb);
  const sessionService = new SessionService(globalDb, packageService);

  useEffect(() => {
    // Si la base está vacía en primer inicio, cargar datos demo con escenarios preparados
    seedInitialDemoData(globalDb);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleResetData = () => {
    if (confirm('¿Volver a los datos de demostración? Se borran los cambios que hiciste.')) {
      globalDb.clearAll();
      seedInitialDemoData(globalDb);
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
      {/* Barra de Navegación y Selector de Roles */}
      <header className="sticky top-0 z-40 bg-stone-900 text-white border-b border-stone-800 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">
                Estudio de Yoga Andrea
              </h1>
              <p className="text-[11px] text-stone-400">
                Paquetes, clases y avisos en un solo lugar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Rol */}
            <div className="bg-stone-800 p-1 rounded-xl flex items-center gap-1 border border-stone-700">
              <button
                onClick={() => setRole('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'admin'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Andrea
              </button>

              <button
                onClick={() => setRole('instructor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'instructor'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Instructora
              </button>

              <button
                onClick={() => setRole('student')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  role === 'student'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Alumna
              </button>
            </div>

            <button
              onClick={handleResetData}
              title="Volver a los datos de demostración" aria-label="Volver a los datos de demostración"
              className="p-2 text-stone-400 hover:text-stone-200 bg-stone-800 hover:bg-stone-700 rounded-lg transition-colors border border-stone-700 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-6xl mx-auto px-4 py-6" key={refreshKey}>
        {role === 'admin' && (
          <AdminDashboard
            db={globalDb}
            packageService={packageService}
            sessionService={sessionService}
            onRefresh={handleRefresh}
          />
        )}

        {role === 'admin' && (
          <div className="mt-8">
            <StudentCard db={globalDb} packageService={packageService} canAdjust onRefresh={handleRefresh} />
          </div>
        )}

        {role === 'instructor' && (
          <AttendanceList
            db={globalDb}
            packageService={packageService}
            sessionService={sessionService}
            onRefresh={handleRefresh}
          />
        )}

        {role === 'student' && (
          <div className="mb-8">
            <StudentCard db={globalDb} packageService={packageService} />
          </div>
        )}

        {role === 'student' && (
          <StudentBooking
            db={globalDb}
            packageService={packageService}
            sessionService={sessionService}
            onRefresh={handleRefresh}
          />
        )}
      </main>

      {/* Footer informativo sobre alcance y contratos del sistema */}
      <footer className="border-t border-stone-200 bg-white/70 py-4 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-700" />
            Demo con datos ficticios. Cada clase tiene 12 lugares y lista de espera por orden de llegada.
          </p>
          <p className="text-[11px] text-stone-400">
            Estudio de Yoga Andrea
          </p>
        </div>
      </footer>
    </div>
  );
}
