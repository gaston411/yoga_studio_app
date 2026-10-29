/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Leaf, RotateCcw } from 'lucide-react';
import { globalDb, seedInitialDemoData } from './infrastructure/db.ts';
import { PackageService } from './domain/packages.ts';
import { SessionService } from './domain/sessions.ts';
import { AdminDashboard } from './ui/AdminDashboard.tsx';
import { StudentCard } from './ui/StudentCard.tsx';
import { Today, CalmErrorBoundary } from './ui/Today.tsx';

type Role = 'admin' | 'instructor' | 'student';
type AdminTab = 'today' | 'manage';

const ROLES: { id: Role; label: string }[] = [
  { id: 'admin', label: 'Andrea' },
  { id: 'instructor', label: 'Instructoras' },
  { id: 'student', label: 'Alumna' },
];

const SERIF = { fontFamily: 'Fraunces, Georgia, "Times New Roman", serif' };

export default function App() {
  const [role, setRole] = useState<Role>('admin');
  const [adminTab, setAdminTab] = useState<AdminTab>('today');
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const packageService = new PackageService(globalDb);
  const sessionService = new SessionService(globalDb, packageService);

  useEffect(() => {
    seedInitialDemoData(globalDb);
    setResetKey((k) => k + 1);
  }, []);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleResetData = () => {
    if (confirm('¿Empezar de cero con los datos de demostración? Se pierde lo que cambiaste.')) {
      globalDb.clearAll();
      seedInitialDemoData(globalDb);
      setResetKey((k) => k + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F1E9] text-[#2E2A26] font-sans">
      <header className="sticky top-0 z-40 bg-[#F6F1E9]/90 backdrop-blur border-b border-[#E4DDD2]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-[#4F5F45]" strokeWidth={1.5} aria-hidden />
            <h1 className="text-lg font-semibold" style={SERIF}>Estudio Andrea</h1>
          </div>

          <div className="flex items-center gap-2">
            <nav aria-label="¿Quién eres?" className="flex rounded-full bg-white border border-[#E4DDD2] p-1">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  aria-pressed={role === r.id}
                  className={`min-h-9 px-4 rounded-full text-sm font-medium transition ${
                    role === r.id ? 'bg-[#4F5F45] text-white' : 'text-[#4F5F45] hover:bg-[#F6F1E9]'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </nav>
            <button
              onClick={handleResetData}
              title="Empezar de cero"
              aria-label="Empezar de cero con los datos de demostración"
              className="w-11 h-11 rounded-full flex items-center justify-center text-[#4F5F45] hover:bg-white"
            >
              <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {role === 'admin' && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-6 text-base">
            {(['today', 'manage'] as AdminTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                aria-pressed={adminTab === tab}
                className={`min-h-11 border-b-2 transition ${
                  adminTab === tab ? 'border-[#4F5F45] font-semibold' : 'border-transparent text-[#4F5F45]'
                }`}
              >
                {tab === 'today' ? 'Hoy' : 'Gestión'}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8" key={resetKey}>
        <CalmErrorBoundary>
          {role !== 'student' && (role === 'instructor' || adminTab === 'today') && (
            <Today db={globalDb} sessionService={sessionService} onRefresh={handleRefresh} />
          )}

          {role === 'admin' && adminTab === 'manage' && (
            <div className="space-y-10">
              <AdminDashboard
                key={refreshKey}
                db={globalDb}
                packageService={packageService}
                sessionService={sessionService}
                onRefresh={handleRefresh}
              />
              <StudentCard db={globalDb} packageService={packageService} canAdjust onRefresh={handleRefresh} />
            </div>
          )}

          {role === 'student' && <StudentCard db={globalDb} packageService={packageService} />}
        </CalmErrorBoundary>
      </main>

      <footer className="py-8 text-center text-sm text-[#4F5F45]">
        Demo con datos ficticios · Estudio de Yoga Andrea
      </footer>
    </div>
  );
}
