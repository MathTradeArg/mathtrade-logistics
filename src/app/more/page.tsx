"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffPage } from '@/components/staff';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useState } from 'react';

const rowClass = 'staff-card flex min-h-14 w-full items-center px-4 text-left font-medium text-gray-900';

export default function MorePage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading } = useAuth();
  const { eventPhase, isLoadingEventPhase, updateEventPhase } = useEventPhase();
  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);

  const handlePhase = async (phase: number) => {
    const names = ['no iniciado', 'recepción', 'entrega'];
    if (!window.confirm(`¿Pasar a la fase de ${names[phase]}?`)) return;
    setIsUpdatingPhase(true);
    await updateEventPhase(phase);
    setIsUpdatingPhase(false);
  };

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  return (
    <StaffPage>
      <ul className="flex flex-col gap-3">
        <li>
          <Link href="/more/report" className={rowClass}>Nuevo reporte</Link>
        </li>
        <li>
          <Link href="/more/reports" className={rowClass}>Ver reportes</Link>
        </li>
        <li>
          <Link href="/more/reports/amba-missing" className={rowClass}>Faltantes AMBA</Link>
        </li>
        <li>
          <Link href="/more/tools" className={rowClass}>Herramientas</Link>
        </li>
      </ul>

      {isAdmin && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-gray-500">Admin</h2>
          <div className="staff-panel mt-3 p-4">
            <p className="text-sm font-medium text-gray-700">Fase del evento</p>
            <div className="mt-3 flex flex-col gap-3">
              {[
                { id: 0, label: 'No iniciado' },
                { id: 1, label: 'Recepción' },
                { id: 2, label: 'Entrega' },
              ].map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  disabled={isUpdatingPhase}
                  onClick={() => {
                    if (eventPhase === phase.id) return;
                    handlePhase(phase.id);
                  }}
                  className={`staff-btn ${
                    eventPhase === phase.id ? 'staff-btn-primary' : 'staff-btn-outline'
                  }`}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            <li>
              <GameRow title="Usuarios" href="/admin/ready-to-pickup" />
            </li>
            <li>
              <GameRow title="Ventanillas" href="/admin/window-config" />
            </li>
            <li>
              <button
                type="button"
                className={rowClass}
                onClick={() => {
                  const win = window.open('/display/ready-to-pickup', '_blank', 'noopener,noreferrer');
                  win?.focus();
                }}
              >
                Tele
              </button>
            </li>
          </ul>
        </div>
      )}
    </StaffPage>
  );
}
