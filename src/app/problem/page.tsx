"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffEmpty, StaffPage } from '@/components/staff';
import { PROBLEM_GROUPS, getVisibleProblems } from '@/config/problems';
import { useEventPhase } from '@/contexts/EventPhaseContext';
import { useAuth } from '@/hooks/useAuth';

export default function ProblemPage() {
  const { isAuthenticated, isAdmin, isLoading: authIsLoading, role, cityAccess } = useAuth();
  const { eventPhase, isLoadingEventPhase } = useEventPhase();

  if (authIsLoading || isAuthenticated === null || isLoadingEventPhase) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  const visible = getVisibleProblems({ role: role ?? null, isAdmin: Boolean(isAdmin), city: cityAccess ?? null }, eventPhase);

  return (
    <StaffPage>
      <p className="text-body text-gray-500">Elegí qué te pasa y te llevamos a donde se resuelve.</p>
      {PROBLEM_GROUPS.map((g) => {
        const items = visible.filter((v) => v.problem.group === g.id);
        if (!items.length) return null;
        return (
          <section key={g.id} className="mt-8">
            <h2 className="text-body font-semibold text-gray-500">{g.label}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {items.map(({ problem, href, needsAdmin }) => (
                <li key={problem.id}>
                  <GameRow
                    title={problem.question}
                    subtitle={needsAdmin ? 'Avisá a un organizador' : problem.hint}
                    href={href ?? undefined}
                    tone={!needsAdmin ? problem.tone : undefined}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {visible.length === 0 && <StaffEmpty>No hay nada para mostrarte acá.</StaffEmpty>}
    </StaffPage>
  );
}
