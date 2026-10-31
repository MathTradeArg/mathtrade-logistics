"use client";

import { StaffPage } from '@/components/staff';
import { ROLE_ORDER, ROLES, roleHome } from '@/config/roles';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useApi } from '@/hooks/useApi';
import { useAuth, type MeResponse } from '@/hooks/useAuth';
import type { VolunteerRole } from '@/types/volunteer';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** First choice of role: no confirmation (changing it later is "Mi rol"). */
export default function SelectRolePage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading, role, applyRole } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();
  const { setError } = useActionStatus();
  const router = useRouter();
  const [saving, setSaving] = useState<VolunteerRole | null>(null);
  const { execute: patchMe } = useApi<MeResponse>('logistics/me/', { method: 'PATCH' });

  useEffect(() => {
    if (authIsLoading || !isAuthenticated) return;
    if (isAdmin) {
      router.replace('/');
    } else if (role && !isLoadingEventPhase) {
      router.replace(roleHome(role, eventPhase));
    }
  }, [authIsLoading, isAuthenticated, isAdmin, role, eventPhase, isLoadingEventPhase, router]);

  const choose = async (next: VolunteerRole) => {
    setSaving(next);
    try {
      await patchMe({ role: next });
      applyRole(next);
      router.replace(roleHome(next, eventPhase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el rol.');
      setSaving(null);
    }
  };

  return (
    <StaffPage>
      <h1 className="text-xl font-bold">¿Qué vas a hacer hoy?</h1>
      <ul className="mt-6 flex flex-col gap-4">
        {ROLE_ORDER.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => choose(id)}
              disabled={saving !== null}
              className="staff-card flex w-full flex-col items-start gap-1 px-5 py-5 text-left disabled:opacity-60"
            >
              <span className="text-lg font-bold text-gray-900">{ROLES[id].label}</span>
              <span className="text-sm text-gray-600">{ROLES[id].description}</span>
              {saving === id && <span className="text-sm text-gray-500">Guardando...</span>}
            </button>
          </li>
        ))}
      </ul>
    </StaffPage>
  );
}
