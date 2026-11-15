"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffBanner, StaffPage } from '@/components/staff';
import { ROLES } from '@/config/roles';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';
import { useOperationalExport } from '@/hooks/useOperationalExport';
import { EVENT_SHEETS, useXlsxExport } from '@/hooks/useXlsxExport';
import Link from 'next/link';
import { useState } from 'react';

const formatClock = (at: Date) =>
  `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;

const primaryRowClass = 'flex min-h-14 w-full items-center rounded-lg bg-brand px-4 text-left font-semibold text-brand-ink hover:brightness-95';
const rowClass = 'staff-card flex min-h-14 w-full items-center px-4 text-left font-medium text-gray-900';

const EVENT_SHEET_BUTTONS = [
  { sheet: EVENT_SHEETS.incomingBoxes, title: 'Cajas entrantes', help: 'Una pestaña por origen y tipo de caja, con su estado de apertura.' },
  { sheet: EVENT_SHEETS.outgoingGames, title: 'Juegos que salen', help: 'Una pestaña por destino.' },
  { sheet: EVENT_SHEETS.toReceive, title: 'Juegos a recibir por usuario', help: 'Lo que cada usuario del evento trae.' },
  { sheet: EVENT_SHEETS.toDeliver, title: 'Juegos a entregar por usuario', help: 'Lo que cada usuario del evento retira, con su estado ahora.' },
] as const;

function EventSheetButton({ sheet, title, help }: { sheet: { endpoint: string; filePrefix: string }; title: string; help: string }) {
  const { download, isLoading, error, lastDownloadedAt } = useXlsxExport(sheet.endpoint, sheet.filePrefix);
  return (
    <li>
      <button type="button" className={`${rowClass} disabled:opacity-60`} disabled={isLoading} onClick={() => download()}>
        {isLoading ? `${title} (armando la planilla...)` : title}
      </button>
      <p className="mt-2 px-1 text-body text-gray-500">{help}</p>
      {error && <StaffBanner>{error}</StaffBanner>}
      {lastDownloadedAt && (
        <p className="mt-2 px-1 text-body text-gray-500">Descargada a las {formatClock(lastDownloadedAt)}</p>
      )}
    </li>
  );
}

export default function MorePage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading, role, cityAccess } = useAuth();
  const { eventPhase, isLoadingEventPhase, updateEventPhase } = useEventPhase();
  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);
  const operationalExport = useOperationalExport();

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

  // A referrer / local volunteer without an event role: the staff rows call
  // staff-only endpoints, so they only get their city.
  if (!isAdmin && !role && cityAccess) {
    return (
      <StaffPage>
        <h2 className="text-body font-semibold text-gray-500">{cityAccess.city.name}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          <li>
            <GameRow title="Mi ciudad" href="/city" />
          </li>
          <li>
            <GameRow title="Imprimir etiquetas" href="/more/print?tab=labels" />
          </li>
          <li>
            <GameRow title="Instructivo" href="/city/instructivo" />
          </li>
          <li>
            <GameRow title="Usuarios" href="/city/users" />
          </li>
          {cityAccess.kind === 'referrer' && (
            <li>
              <GameRow title="Voluntarios" href="/city/volunteers" />
            </li>
          )}
        </ul>
      </StaffPage>
    );
  }

  return (
    <StaffPage>
      <ul className="flex flex-col gap-3">
        <li>
          <GameRow tone="critical" title="Hay un problema" subtitle="Falta un juego, alguien no vino…" href="/problem" />
        </li>
        {cityAccess && (
          <li>
            <GameRow title={`Mi ciudad: ${cityAccess.city.name}`} href="/city" />
          </li>
        )}
        {isAdmin && !cityAccess && (
          <li>
            <GameRow title="Ver una ciudad" href="/city" />
          </li>
        )}
        {cityAccess && (
          <li>
            <GameRow title={`Usuarios de ${cityAccess.city.name}`} href="/city/users" />
          </li>
        )}
        {cityAccess?.kind === 'referrer' && (
          <li>
            <GameRow title={`Voluntarios de ${cityAccess.city.name}`} href="/city/volunteers" />
          </li>
        )}
        {!isAdmin && role && (
          <li>
            <GameRow title={`Mi rol: ${ROLES[role].label}`} href="/more/role" />
          </li>
        )}
      </ul>

      <h2 className="mt-8 text-body font-semibold text-gray-500">Entrega y consultas</h2>
      <ul className="mt-3 flex flex-col gap-3">
        <li>
          <Link href="/tables" className={primaryRowClass}>Mis mesas: juegos</Link>
        </li>
        <li>
          <Link href="/lookup" className={primaryRowClass}>Buscar participante o juego</Link>
        </li>
        <li>
          <Link href="/more/reports" className={rowClass}>Reportes cargados</Link>
        </li>
      </ul>

      <h2 className="mt-8 text-body font-semibold text-gray-500">Herramientas</h2>
      <ul className="mt-3 flex flex-col gap-3">
        <li>
          <Link href="/more/print" className={rowClass}>Imprimir etiquetas, sectores y mesas</Link>
        </li>
      </ul>

      {isAdmin && (
        <div className="mt-10">
          <h2 className="text-body font-semibold text-gray-500">Administrar el evento</h2>
          <div className="staff-panel mt-3 p-4">
            <p className="text-body font-medium text-gray-700">Fase del evento</p>
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
              <GameRow title="Quién retiró" href="/admin/ready-to-pickup" />
            </li>
            <li>
              <GameRow title="Configurar ventanillas" href="/admin/window-config" />
            </li>
            <li>
              <GameRow title="Administrar voluntarios" href="/admin/volunteers" />
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
                Abrir pantalla de retiros (tele)
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`${rowClass} disabled:opacity-60`}
                disabled={operationalExport.isLoading}
                onClick={() => operationalExport.download()}
              >
                {operationalExport.isLoading ? 'Armando la planilla...' : 'Descargar planilla del evento (Excel)'}
              </button>
              {operationalExport.error && <StaffBanner>{operationalExport.error}</StaffBanner>}
              {operationalExport.lastDownloadedAt && (
                <p className="mt-2 px-1 text-body text-gray-500">
                  Descargada a las {formatClock(operationalExport.lastDownloadedAt)}
                </p>
              )}
            </li>
            {EVENT_SHEET_BUTTONS.map((b) => (
              <EventSheetButton key={b.sheet.endpoint} {...b} />
            ))}
          </ul>
        </div>
      )}
    </StaffPage>
  );
}
