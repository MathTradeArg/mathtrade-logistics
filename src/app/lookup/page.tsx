"use client";

import { Chip, LoadingSpinner, type ChipTone } from '@/components/common/ui';
import QrScanner from '@/components/qr/QrScanner';
import { GameRow, ProblemHeader, StaffEmpty, StaffError, StaffPage, StaffSearch, StaffSegmented } from '@/components/staff';
import { EVENT_LOCATION_ID } from '@/constants/event';
import MemberNameSearch from '@/components/staff/MemberNameSearch';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import {
  GameStatusDisplayMap,
  getGameStatusText,
  type DeliverTrade,
  type GameBoxInfo,
  type GameDetail,
  type GameSearchResult,
  type ReceiveTrade,
  type TradeResponse,
  type User,
} from '@/types';
import { useSearchParams } from 'next/navigation';
import { formatTradeCode, parseTradeCodeQuery } from '@/utils/tradeCode';
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from 'react';

type LookupMode = 'member' | 'game';

const presetMode = (value: string | null): LookupMode | null =>
  value === 'participant' ? 'member' : value === 'game' ? 'game' : null;

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

const MIN_TITLE_LENGTH = 2;

/** Chip of a box the copy travels in. "Abrió" means received at the event, never "being packed". */
function boxChip(box: GameBoxInfo): { label: string; tone: ChipTone } {
  if (box.origin_id === EVENT_LOCATION_ID) {
    if (box.has_tracking) return { label: 'Armada en AMBA, enviada', tone: 'info' };
    if (!box.closed) return { label: 'En armado', tone: 'none' };
    return { label: 'Armada en AMBA, sin enviar', tone: 'none' };
  }
  if (!box.closed) return { label: 'En armado', tone: 'none' };
  if (box.opened) return { label: 'Ya se abrió', tone: 'good' };
  return { label: 'Sin abrir', tone: 'used' };
}

function receivedText(box: GameBoxInfo): string {
  return `${box.received_count} de ${box.item_count} ${box.item_count === 1 ? 'juego recibido' : 'juegos recibidos'}`;
}

/** "Dónde está": only when the backend sends the box/attendance fields. */
function WhereIsBlock({ game }: { game: GameDetail }) {
  if (game.boxes === undefined && game.giver_attends_event === undefined) return null;
  const boxes = game.boxes ?? [];
  const attends = game.giver_attends_event === true;
  return (
    <div className="mt-3 border-t border-stroke pt-3">
      <p className="text-body font-semibold text-gray-500">Dónde está</p>
      {attends && (
        <>
          <p className="mt-1 text-body text-gray-900">Lo trae {fullName(game.membership)} (AMBA)</p>
          {game.status >= 5 && <p className="mt-1 text-body text-gray-900">Ya llegó al evento</p>}
        </>
      )}
      {!attends && boxes.length === 0 && (
        <p className="mt-1 text-body text-gray-900">No está en ninguna caja</p>
      )}
      {boxes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {boxes.map((box) => {
            const chip = boxChip(box);
            const showReceived = box.origin_id !== EVENT_LOCATION_ID && !box.opened;
            return (
              <li key={box.id} className="flex flex-col gap-1">
                <p className="text-body text-gray-900">
                  Caja {box.number == null ? 'en armado' : `#${box.number}`} de {box.origin_name} a {box.destination_name}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                  {showReceived && <span className="text-caption text-gray-500">{receivedText(box)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
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
      <p className="mt-0.5 text-body text-gray-500">{formatTradeCode(code)} · {tableText(table)} · {status}</p>
      <p className="mt-0.5 text-body text-gray-500">{personLabel}: {personName}</p>
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
  const { execute: searchGames } = useApi<GameSearchResult[]>('logistics/game/');

  const preset = presetMode(searchParams.get('mode'));
  const [mode, setMode] = useState<LookupMode>(preset ?? 'member');

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
  const [matches, setMatches] = useState<GameSearchResult[] | null>(null);
  const [searchedTitle, setSearchedTitle] = useState('');
  const gameRequest = useRef(0);

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

  const loadGame = async (tradeCode: string) => {
    const request = ++gameRequest.current;
    setIsSearchingGame(true);
    setGameError(null);
    setGame(null);
    try {
      const detail = await fetchGame(undefined, `${tradeCode}/detail/`);
      if (request !== gameRequest.current) return;
      if (detail) setGame(detail);
      else setGameError('No se encontró ese código.');
    } catch (err) {
      if (request !== gameRequest.current) return;
      setGameError(err instanceof Error ? err.message : 'No se encontró ese código.');
    } finally {
      if (request === gameRequest.current) setIsSearchingGame(false);
    }
  };

  const handleGameSearch = async (event: FormEvent) => {
    event.preventDefault();
    const text = code.trim();
    if (!text) return;
    const tradeCode = parseTradeCodeQuery(text);
    if (tradeCode) {
      setMatches(null);
      await loadGame(tradeCode);
      return;
    }
    const request = ++gameRequest.current;
    setGame(null);
    setMatches(null);
    if (text.length < MIN_TITLE_LENGTH) {
      setIsSearchingGame(false);
      setGameError('Escribí al menos 2 letras del título.');
      return;
    }
    setIsSearchingGame(true);
    setGameError(null);
    setSearchedTitle(text);
    try {
      const results = await searchGames(undefined, `search/?q=${encodeURIComponent(text)}`);
      if (request !== gameRequest.current) return;
      setMatches(results ?? []);
    } catch (err) {
      if (request !== gameRequest.current) return;
      setGameError(err instanceof Error ? err.message : 'No se pudo buscar el juego.');
    } finally {
      if (request === gameRequest.current) setIsSearchingGame(false);
    }
  };

  if (authIsLoading || isAuthenticated === null) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando..." /></div>;
  }

  const hasMemberResult = member !== null && !isLoadingMember && !memberError;

  return (
    <StaffPage className="pb-8">
      {preset && <ProblemHeader id={preset === 'member' ? 'no-label' : 'where-is-game'} />}
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
              <h2 className="text-heading font-bold">{fullName(member)}</h2>
              {member.comment_on_user && (
                <p className="mt-2 rounded-lg border border-warning/40 bg-warning/20 px-4 py-3 text-body text-gray-900">
                  {member.comment_on_user}
                </p>
              )}

              <h3 className="mt-6 text-body font-semibold text-gray-500">Trae / entrega ({brings.length})</h3>
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

              <h3 className="mt-6 text-body font-semibold text-gray-500">Recibe ({receives.length})</h3>
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
          <form onSubmit={handleGameSearch} className="flex flex-col gap-3">
            <StaffSearch
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Título o código de etiqueta"
              aria-label="Buscar juego por título o código"
            />
            <button type="submit" className="min-h-14 rounded-lg bg-brand font-semibold text-brand-ink hover:brightness-95">Buscar</button>
          </form>
          {isSearchingGame && <LoadingSpinner message="Buscando..." />}
          {gameError && <StaffError>{gameError}</StaffError>}
          {matches && !game && !isSearchingGame && !gameError && (
            matches.length === 0 ? (
              <StaffEmpty>No hay juegos con “{searchedTitle}” en el título.</StaffEmpty>
            ) : (
              <ul className="mt-4 flex flex-col gap-3" aria-label="Juegos encontrados">
                {matches.map((match) => (
                  <li key={match.assigned_trade_code}>
                    <GameRow
                      title={match.title || `Código ${formatTradeCode(match.assigned_trade_code)}`}
                      subtitle={`Entrega: ${fullName({ first_name: match.giver_first_name, last_name: match.giver_last_name })} · Recibe: ${fullName({ first_name: match.receiver_first_name, last_name: match.receiver_last_name })}`}
                      trailing={<span className="shrink-0 text-body text-gray-500">{statusText(match.status_display)}</span>}
                      onClick={() => loadGame(String(match.assigned_trade_code))}
                    />
                  </li>
                ))}
              </ul>
            )
          )}
          {matches && matches.length > 0 && (game || gameError) && !isSearchingGame && (
            <button
              type="button"
              onClick={() => { setGame(null); setGameError(null); }}
              className="staff-btn staff-btn-outline mt-4"
            >
              Volver a los resultados
            </button>
          )}
          {game && (
            <div className="staff-card mt-4 px-4 py-3 text-gray-900">
              <p className="font-semibold leading-tight">{game.item_to?.title || `Código ${formatTradeCode(game.assigned_trade_code)}`}</p>
              <p className="mt-0.5 text-body text-gray-500">
                {formatTradeCode(game.assigned_trade_code)} · {tableText(game.table_number)} · {getGameStatusText(game.status)}
              </p>
              <p className="mt-0.5 text-body text-gray-500">Entrega: {fullName(game.membership)}</p>
              <p className="mt-0.5 text-body text-gray-500">Recibe: {fullName(game.member_to)}</p>
              <WhereIsBlock game={game} />
            </div>
          )}
        </div>
      )}
    </StaffPage>
  );
}
