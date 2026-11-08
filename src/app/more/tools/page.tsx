"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { ProblemHeader, StaffDialog, StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { useActionStatus } from '@/contexts/ActionStatusContext';
import { bulkUpdateTradeStatus } from '@/hooks/boxes/boxApi';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import type { GameDetail } from '@/types';
import { formatTradeCode, parseTradeCodeQuery } from '@/utils/tradeCode';
import { FormEvent, useState } from 'react';

export default function ToolsPage() {
  const { isAuthenticated, isLoading: authIsLoading, userId, isAdmin } = useAuth();
  const { setSuccess, setError: setActionError } = useActionStatus();
  const { execute: searchGame } = useApi<GameDetail>('logistics/game/');

  const [code, setCode] = useState('');
  const [game, setGame] = useState<GameDetail | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<5 | 6 | 4 | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCodeSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = parseTradeCodeQuery(code);
    if (!code.trim()) return;
    if (!query) {
      setGame(null);
      setGameError('No se encontró ese código.');
      return;
    }
    setIsSearching(true);
    setGameError(null);
    setGame(null);
    try {
      const detail = await searchGame(undefined, `${query}/detail/`);
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

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  if (!isAdmin) {
    return (
      <StaffPage>
        <StaffEmpty>Esto lo resuelve un admin. Avisale a uno.</StaffEmpty>
      </StaffPage>
    );
  }

  const showEvento = game && game.status < 5;
  const showEntregado = game && game.status < 6;
  const showPendiente = game && game.status > 4;

  return (
    <StaffPage className="pb-8">
      <ProblemHeader id="wrong-state" />
      <p className="rounded-lg bg-warning/20 px-4 py-3 text-body text-gray-900">
        Avisá si no estás seguro. Estas acciones fuerzan el estado de un juego.
      </p>

      <h2 className="mt-8 text-body font-semibold text-gray-500">Forzar juego</h2>
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
          <p className="font-medium">{game.item_to?.title || `Código ${formatTradeCode(game.assigned_trade_code)}`}</p>
          <p className="mt-1 text-body text-gray-500">{formatTradeCode(game.assigned_trade_code)} · estado {game.status}</p>
          <div className="mt-4 flex flex-col gap-3">
            {showEvento && (
              <button type="button" onClick={() => setPendingStatus(5)} className="min-h-14 rounded-lg bg-want font-semibold text-white">Marcar en evento</button>
            )}
            {showEntregado && (
              <button type="button" onClick={() => setPendingStatus(6)} className="min-h-14 rounded-lg bg-primary font-semibold text-white">Marcar entregado</button>
            )}
            {showPendiente && (
              <button type="button" onClick={() => setPendingStatus(4)} className="min-h-14 rounded-lg bg-warning font-semibold text-gray-900">Volver a pendiente</button>
            )}
          </div>
        </div>
      )}

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
    </StaffPage>
  );
}
