"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { HoldToConfirm, StaffDialog, StaffPage } from '@/components/staff';
import { getBottomNavSlots } from '@/config/nav';
import { ROLE_ORDER, ROLES, roleHome } from '@/config/roles';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useApi } from '@/hooks/useApi';
import { useAuth, type MeResponse } from '@/hooks/useAuth';
import type { VolunteerRole } from '@/types/volunteer';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function navLabels(role: VolunteerRole, eventPhase: number | null) {
  return getBottomNavSlots(eventPhase, { role, isAdmin: false })
    .filter((s) => s.id !== 'more')
    .map((s) => ({ id: s.id, label: s.label }));
}

function SlotList({ title, labels }: { title: string; labels: string[] }) {
  return (
    <div>
      <p className="font-semibold text-gray-900">{title}</p>
      {labels.length > 0 ? (
        <ul className="mt-1 list-disc pl-5">
          {labels.map((label) => <li key={label}>{label}</li>)}
        </ul>
      ) : (
        <p className="mt-1">Nada</p>
      )}
    </div>
  );
}

/** A volunteer changes their own role; the change takes a 2-second hold. */
export default function MyRolePage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading, role, applyRole } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { setSuccess, setError } = useActionStatus();
  const router = useRouter();
  const [target, setTarget] = useState<VolunteerRole | null>(null);
  const [saving, setSaving] = useState(false);
  const { execute: patchMe } = useApi<MeResponse>('logistics/me/', { method: 'PATCH' });

  // Admins have no role. A volunteer without one is sent to /select-role by StaffChrome.
  useEffect(() => {
    if (!authIsLoading && isAuthenticated && isAdmin) router.replace('/more');
  }, [authIsLoading, isAuthenticated, isAdmin, router]);

  if (authIsLoading || !isAuthenticated || isAdmin || !role || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  const change = async (next: VolunteerRole) => {
    setSaving(true);
    try {
      await patchMe({ role: next });
      applyRole(next);
      setSuccess(`Ahora sos ${ROLES[next].label}.`);
      router.replace(roleHome(next, eventPhase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol.');
      setSaving(false);
    }
  };

  const current = navLabels(role, eventPhase);
  const next = target ? navLabels(target, eventPhase) : [];
  const lose = current.filter((s) => !next.some((n) => n.id === s.id)).map((s) => s.label);
  const gain = next.filter((s) => !current.some((c) => c.id === s.id)).map((s) => s.label);

  return (
    <StaffPage>
      <div className="staff-panel p-4">
        <p className="text-sm text-gray-500">Tu rol actual</p>
        <p className="text-lg font-bold text-gray-900">{ROLES[role].label}</p>
        <p className="mt-1 text-sm text-gray-600">{ROLES[role].description}</p>
      </div>

      <h2 className="mt-8 text-sm font-semibold text-gray-500">Cambiar a</h2>
      <ul className="mt-3 flex flex-col gap-4">
        {ROLE_ORDER.filter((id) => id !== role).map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => setTarget(id)}
              className="staff-card flex w-full flex-col items-start gap-1 px-5 py-5 text-left"
            >
              <span className="text-lg font-bold text-gray-900">{ROLES[id].label}</span>
              <span className="text-sm text-gray-600">{ROLES[id].description}</span>
            </button>
          </li>
        ))}
      </ul>

      <StaffDialog
        open={target !== null}
        title={target ? `Cambiar a ${ROLES[target].label}` : ''}
        hideConfirm
        onCancel={() => { if (!saving) setTarget(null); }}
      >
        <div className="flex flex-col gap-3">
          <SlotList title="Vas a dejar de ver" labels={lose} />
          <SlotList title="Vas a ver" labels={gain} />
        </div>
        <div className="mt-5">
          <HoldToConfirm
            label="Mantené para cambiar"
            disabled={saving}
            onConfirm={() => { if (target) change(target); }}
          />
        </div>
      </StaffDialog>
    </StaffPage>
  );
}
