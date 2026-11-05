"use client";

import { LoadingSpinner } from '@/components/common/ui';
import QrScanner from '@/components/qr/QrScanner';
import { StaffEmpty, StaffError, StaffPage, StaffSearch, StaffSegmented } from '@/components/staff';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import {
  GameStatusDisplayMap,
  getGameStatusText,
  type DeliverTrade,
  type GameDetail,
  type ReceiveTrade,
  type TradeResponse,
  type User,
} from '@/types';
import { useSearchParams } from 'next/navigation';
import { formatTradeCode, parseTradeCodeQuery } from '@/utils/tradeCode';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';

type LookupMode = 'member' | 'game';

type PersonName = { first_name?: string; last_name?: string } | null | undefined;

function fullName(person: PersonName): string {
  if (!person) return '—';
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim() || '—';
}

function statusText(statusDisplay: string | undefined): string {
  if (!statusDisplay) return 'Desconocido';
  return GameStatusDisplayMap[statusDisplay] ?? statusDisplay;
}

function tableText(table: number | string | null | undefined): string {
  return table === null || table === undefined || table === '' ? 'Mesa —' : `Mesa ${table}`;
}

function TradeCard({
  title,
  code,
  table,
  status,
  personLabel,
  personName,
}: {
  title: string;
  code: number;
  table: number | string | null | undefined;
  status: string;
  personLabel: string;
  personName: string;
}) {
  return (
    <div className="staff-card px-4 py-3 text-gray-900">
      <p className="font-semibold leading-tight">{title || `Código ${formatTradeCode(code)}`}</p>
      <p className="mt-0.5 text-sm text-gray-500">{formatTradeCode(code)} · {tableText(table)} · {status}</p>
      <p className="mt-0.5 text-sm text-gray-500">{personLabel}: {personName}</p>
    </div>
  );
}

export default function LookupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>}>
      <LookupPageContent />
    </Suspense>
  );
}

function LookupPageContent() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const searchParams = useSearchParams();
  // Read-only page: every request here is a GET.
  const { execute: fetchBrings } = useApi<TradeResponse<ReceiveTrade>>('logistics/user/');
  const { execute: fetchReceives } = useApi<TradeResponse<DeliverTrade>>('logistics/user/');
  const { execute: fetchGame } = useApi<GameDetail>('logistics/game/');

  const [mode, setMode] = useState<LookupMode>('member');

  const [showScanner, setShowScanner] = useState(false);
  const [member, setMember] = useState<User | null>(null);
  const [brings, setBrings] = useState<ReceiveTrade[]>([]);
  const [receives, setReceives] = useState<DeliverTrade[]>([]);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isLoadingMember, setIsLoadingMember] = useState(false);
  const memberRequest = useRef(0);
  const initialQrHandled = useRef(false);

  const [code, setCode] = useState('');
  const [game, setGame] = useState<GameDetail | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isSearchingGame, setIsSearchingGame] = useState(false);

  const loadMember = useCallback(async (uuid: string) => {
    const request = ++memberRequest.current;
    setShowScanner(false);
    setIsLoadingMember(true);
    setMemberError(null);
    setMember(null);
    setBrings([]);
    setReceives([]);
    try {
      const [receiveData, deliverData] = await Promise.all([
        fetchBrings(undefined, `${uuid}/games/receive/`),
        fetchReceives(undefined, `${uuid}/games/deliver/`),
      ]);
      if (request !== memberRequest.current) return;
      setMember(receiveData?.user ?? deliverData?.user ?? null);
      setBrings(receiveData?.games ?? []);
      setReceives(deliverData?.games ?? []);
    } catch (err) {
      if (request !== memberRequest.current) return;
      setMemberError(err instanceof Error ? err.message : 'No se pudo buscar el participante.');
    } finally {
      if (request === memberRequest.current) setIsLoadingMember(false);
    }
  }, [fetchBrings, fetchReceives]);

  useEffect(() => {
    if (initialQrHandled.current || authIsLoading || !isAuthenticated) return;
    const qr = searchParams.get('qr');
    if (!qr) return;
    initialQrHandled.current = true;
    setMode('member');
    loadMember(qr);
  }, [searchParams, authIsLoading, isAuthenticated, loadMember]);

  const handleCodeSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = parseTradeCodeQuery(code);
    if (!code.trim()) return;
    if (!query) {
      setGame(null);
      setGameError('No se encontró ese código.');
      return;
    }
    setIsSearchingGame(true);
    setGameError(null);
    setGame(null);
    try {
      const detail = await fetchGame(undefined, `${query}/detail/`);
      if (detail) setGame(detail);
      else setGameError('No se encontró ese código.');
    } catch (err) {
      setGameError(err instanceof Error ? err.message : 'No se encontró ese código.');
    } finally {
      setIsSearchingGame(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  const hasMemberResult = member !== null && !isLoadingMember && !memberError;

  return (
    <StaffPage className="pb-8">
      <StaffSegmented
        value={mode}
        onChange={setMode}
        options={[
          { id: 'member', label: 'Participante' },
          { id: 'game', label: 'Juego' },
        ]}
      />

      {mode === 'member' && (
        <div className="mt-4">
          <MemberNameSearch onSelect={(hit) => loadMember(hit.uuid)} />
          <button
            type="button"
            onClick={() => setShowScanner((open) => !open)}
            className="staff-btn staff-btn-outline mt-4"
          >
            {showScanner ? 'Cerrar cámara' : 'Escanear QR'}
          </button>
          {showScanner && (
            <div className="mt-4">
              <QrScanner onScan={(uuid) => loadMember(uuid)} />
            </div>
          )}

          {isLoadingMember && <LoadingSpinner message="Buscando..." />}
          {memberError && <StaffError>{memberError}</StaffError>}

          {hasMemberResult && (
            <div className="mt-6">
              <h2 className="text-lg font-bold">{fullName(member)}</h2>
              {member.comment_on_user && (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {member.comment_on_user}
                </p>
              )}

              <h3 className="mt-6 text-sm font-semibold text-gray-500">Trae / entrega ({brings.length})</h3>
              {brings.length === 0 ? (
                <StaffEmpty>No trae juegos.</StaffEmpty>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {brings.map((trade) => (
                    <li key={trade.result.assigned_trade_code}>
                      <TradeCard
                        title={trade.math_item_exchanged?.title}
                        code={trade.result.assigned_trade_code}
                        table={trade.result.table_number}
                        status={statusText(trade.result.status_display)}
                        personLabel="Para"
                        personName={fullName(trade.to_member)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="mt-6 text-sm font-semibold text-gray-500">Recibe ({receives.length})</h3>
              {receives.length === 0 ? (
                <StaffEmpty>No recibe juegos.</StaffEmpty>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {receives.map((trade) => (
                    <li key={trade.result.assigned_trade_code}>
                      <TradeCard
                        title={trade.math_item_exchanged?.title}
                        code={trade.result.assigned_trade_code}
                        table={trade.result.table_number}
                        status={statusText(trade.result.status_display)}
                        personLabel="De"
                        personName={fullName(trade.from_member)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {mode === 'game' && (
        <div className="mt-4">
          <form onSubmit={handleCodeSearch} className="flex flex-col gap-3">
            <StaffSearch
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Código de etiqueta"
              aria-label="Buscar juego por código"
              inputMode="numeric"
            />
            <button type="submit" className="min-h-14 rounded-lg bg-primary font-semibold text-white">Buscar código</button>
          </form>
          {isSearchingGame && <LoadingSpinner message="Buscando..." />}
          {gameError && <StaffError>{gameError}</StaffError>}
          {game && (
            <div className="staff-card mt-4 px-4 py-3 text-gray-900">
              <p className="font-semibold leading-tight">{game.item_to?.title || `Código ${formatTradeCode(game.assigned_trade_code)}`}</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {formatTradeCode(game.assigned_trade_code)} · {tableText(game.table_number)} · {getGameStatusText(game.status)}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">Entrega: {fullName(game.membership)}</p>
              <p className="mt-0.5 text-sm text-gray-500">Recibe: {fullName(game.member_to)}</p>
            </div>
          )}
        </div>
      )}
    </StaffPage>
  );
}
