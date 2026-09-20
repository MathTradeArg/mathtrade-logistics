"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffDialog, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { bulkUpdateTradeStatus } from '@/hooks/boxes/boxApi';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { GameDetail } from '@/types';
import { FormEvent, useState } from 'react';

export default function ToolsPage() {
  const { isAuthenticated, isLoading: authIsLoading, userId, isAdmin } = useAuth();
  const { setSuccess, setError: setActionError } = useActionStatus();
  const { execute: searchGame } = useApi<GameDetail>('logistics/game/');
  const { execute: updateUserStatus } = useApi<{ status: string }>('logistics/users/update-status/', { method: 'PATCH' });

  const [code, setCode] = useState('');
  const [game, setGame] = useState<GameDetail | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<5 | 6 | 4 | null>(null);
  const [noShowMember, setNoShowMember] = useState<{ id: number; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCodeSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setIsSearching(true);
    setGameError(null);
    setGame(null);
    try {
      const detail = await searchGame(undefined, `${code.trim()}/detail/`);
      if (detail) setGame(detail);
      else setGameError('No se encontró ese código.');
    } catch (err) {
      setGameError(err instanceof Error ? err.message : 'No se encontró ese código.');
    } finally {
      setIsSearching(false);
    }
  };

  const confirmStatus = async () => {
    if (!game || pendingStatus == null || busy) return;
    setBusy(true);
    try {
      await bulkUpdateTradeStatus([game.assigned_trade_code], pendingStatus, userId);
      setGame({ ...game, status: pendingStatus });
      setSuccess('Estado actualizado.');
      setPendingStatus(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar.';
      setActionError(message);
    } finally {
      setBusy(false);
    }
  };

  const confirmNoShow = async () => {
    if (!noShowMember || busy) return;
    setBusy(true);
    try {
      await updateUserStatus({ user_id: noShowMember.id, status: 'no_show' });
      setSuccess(`${noShowMember.name} marcado como no apareció.`);
      setNoShowMember(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo marcar no_show.';
      setActionError(message);
    } finally {
      setBusy(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  const showEvento = game && game.status < 5;
  const showEntregado = game && game.status < 6;
  const showPendiente = isAdmin && game && game.status > 4;

  return (
    <StaffPage className="pb-8">
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Avisá si no estás seguro. Estas acciones fuerzan estados y se ven en la tele.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-gray-500">Forzar juego</h2>
      <form onSubmit={handleCodeSearch} className="mt-3 flex flex-col gap-3">
        <StaffSearch
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Código de etiqueta"
          aria-label="Buscar juego por código"
          inputMode="numeric"
        />
        <button type="submit" className="min-h-14 rounded-lg bg-primary font-semibold text-white">Buscar código</button>
      </form>
      {isSearching && <LoadingSpinner message="Buscando..." />}
      {gameError && <StaffError>{gameError}</StaffError>}
      {game && (
        <div className="mt-4 rounded-lg bg-white p-4">
          <p className="font-medium">{game.item_to?.title || `Código ${game.assigned_trade_code}`}</p>
          <p className="mt-1 text-sm text-gray-500">#{game.assigned_trade_code} · estado {game.status}</p>
          <div className="mt-4 flex flex-col gap-3">
            {showEvento && (
              <button type="button" onClick={() => setPendingStatus(5)} className="min-h-14 rounded-lg bg-want font-semibold text-white">Marcar en evento</button>
            )}
            {showEntregado && (
              <button type="button" onClick={() => setPendingStatus(6)} className="min-h-14 rounded-lg bg-primary font-semibold text-white">Marcar entregado</button>
            )}
            {showPendiente && (
              <button type="button" onClick={() => setPendingStatus(4)} className="min-h-14 rounded-lg bg-amber-500 font-semibold text-white">Volver a pendiente</button>
            )}
          </div>
        </div>
      )}

      <h2 className="mt-10 text-sm font-semibold text-gray-500">Marcar no apareció</h2>
      <MemberNameSearch
        onSelect={(member) => setNoShowMember({ id: member.user_id, name: `${member.first_name} ${member.last_name}`.trim() })}
      />

      <h2 className="mt-10 text-sm font-semibold text-gray-500">Interior</h2>
      <div className="mt-3 flex flex-col gap-3">
        <GameRow title="Pendientes AMBA del interior" href="/more/tools/amba-pending" />
        <GameRow title="Faltantes AMBA" href="/more/reports/amba-missing" />
      </div>

      <StaffDialog
        open={pendingStatus != null}
        title="Confirmar cambio de estado"
        confirmLabel="Sí, forzar"
        confirmDisabled={busy}
        onConfirm={confirmStatus}
        onCancel={() => setPendingStatus(null)}
      >
        {pendingStatus === 5 && 'Vas a marcar este juego como en evento. Avisá si no estás seguro.'}
        {pendingStatus === 6 && 'Vas a marcar este juego como entregado. Avisá si no estás seguro.'}
        {pendingStatus === 4 && 'Vas a volver este juego a pendiente.'}
      </StaffDialog>

      <StaffDialog
        open={noShowMember != null}
        title="Marcar no apareció"
        confirmLabel="Sí, marcar no_show"
        variant="danger"
        confirmDisabled={busy}
        onConfirm={confirmNoShow}
        onCancel={() => setNoShowMember(null)}
      >
        {noShowMember ? `${noShowMember.name} va a aparecer como no apareció en la tele.` : null}
      </StaffDialog>
    </StaffPage>
  );
}
