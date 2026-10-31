"use client";

import { LoadingSpinner } from '@/components/common/ui';
import NoCity from '@/components/city/NoCity';
import ReadOnlyBadge from '@/components/city/ReadOnlyBadge';
import { apiErrorMessage } from '@/components/city/errors';
import { StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { useCityView } from '@/contexts/CityViewContext';
import { matchesSearch } from '@/hooks/boxes/boxGrouping';
import { getActiveMathtradeId, listCityMembers } from '@/hooks/city/cityApi';
import type { CityMember } from '@/types';
import { whatsappLink } from '@/utils/whatsapp';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';

const fullName = (member: CityMember) => `${member.first_name} ${member.last_name}`.trim() || '—';

const linkClass = 'font-semibold text-primary underline';

function Phone({ value }: { value?: string | null }) {
  const wa = whatsappLink(value);
  if (!value) return <>—</>;
  return wa ? (
    <a href={wa} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {value}
    </a>
  ) : (
    <>{value}</>
  );
}

function Telegram({ value }: { value?: string | null }) {
  const handle = value?.replace(/^@/, '');
  if (!handle) return <>—</>;
  return (
    <a href={`https://t.me/${handle}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
      @{handle}
    </a>
  );
}

/** Usuarios de la ciudad. The referrer (and the admin, as one) gets the
 *  full contact and status columns; a local volunteer only name, phone and
 *  Telegram (the backend sends no more than that). */
export default function CityUsersPage() {
  const { cityId, kind, params } = useCityView();
  const mathtrade = params.mathtrade;
  const isReferrer = kind === 'referrer';
  const [members, setMembers] = useState<CityMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyCommitted, setOnlyCommitted] = useState(false);

  useEffect(() => {
    if (cityId === null) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      const mathtradeId = mathtrade ?? (await getActiveMathtradeId());
      if (mathtradeId == null) throw new Error('No hay una edición en curso.');
      const rows = await listCityMembers(mathtradeId, cityId);
      if (!cancelled) setMembers(rows);
    })()
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar los usuarios.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId, mathtrade]);

  const rows = useMemo(
    () =>
      members
        .filter((member) => !onlyCommitted || member.commitment)
        .filter((member) => matchesSearch(`${fullName(member)} ${member.bgg_user ?? ''} ${member.email ?? ''}`, query))
        .sort((a, b) => fullName(a).localeCompare(fullName(b), 'es')),
    [members, onlyCommitted, query],
  );

  if (cityId === null) return <NoCity />;

  return (
    <StaffPage>
      <ReadOnlyBadge />
      <StaffSearch
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre"
        aria-label="Buscar usuarios"
      />
      {isReferrer && (
        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-gray-700">
          <input
            type="checkbox"
            checked={onlyCommitted}
            onChange={(event) => setOnlyCommitted(event.target.checked)}
            className="h-5 w-5"
          />
          Mostrar sólo los que COMPROMETIERON
        </label>
      )}
      {isLoading && <LoadingSpinner message="Cargando usuarios..." />}
      {error && <StaffError>{error}</StaffError>}
      {!isLoading && !error && rows.length === 0 && <StaffEmpty>No hay usuarios para mostrar.</StaffEmpty>}
      {rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm text-gray-900">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Telegram</th>
                {isReferrer && (
                  <>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">BGG</th>
                    <th className="px-3 py-2">Ejemplares</th>
                    <th className="px-3 py-2">Intercambios</th>
                    <th className="px-3 py-2">Comprometió</th>
                    <th className="px-3 py-2">Pagó</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr
                  key={member.id}
                  data-testid="member-row"
                  className={clsx(
                    'border-t border-stroke',
                    isReferrer && member.paid === true && 'bg-green-50',
                    isReferrer && member.paid === false && 'bg-red-50',
                  )}
                >
                  <td className="px-3 py-2 font-semibold">{fullName(member)}</td>
                  <td className="px-3 py-2"><Phone value={member.phone} /></td>
                  <td className="px-3 py-2"><Telegram value={member.telegram} /></td>
                  {isReferrer && (
                    <>
                      <td className="px-3 py-2">{member.email || '—'}</td>
                      <td className="px-3 py-2">{member.bgg_user || '—'}</td>
                      <td className="px-3 py-2">{member.items ?? '—'}</td>
                      <td className="px-3 py-2">{member.trades ?? '—'}</td>
                      <td className="px-3 py-2">{member.commitment ? 'Sí' : 'No'}</td>
                      <td className="px-3 py-2">{member.paid ? 'Sí' : 'No'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StaffPage>
  );
}
