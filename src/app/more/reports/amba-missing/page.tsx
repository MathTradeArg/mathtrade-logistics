"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { StaffEmpty, StaffError, StaffPage, StaffSearch } from '@/components/staff';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useMemo, useState } from 'react';

type MissingAmbaItem = {
  report_id: number;
  item_id: number;
  title: string;
  assigned_trade_code: number;
  box_id: number;
  box_number: number | null;
  origin_name: string | null;
};

type MissingAmbaRecipient = {
  user_id: number;
  first_name: string;
  last_name: string;
  table_number: string | null;
  items: MissingAmbaItem[];
};

export default function AmbaMissingPage() {
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [query, setQuery] = useState('');
  const { data, isLoading, error, execute } = useApi<MissingAmbaRecipient[]>('reports/amba-missing/');

  useEffect(() => {
    if (!isAuthenticated) return;
    execute();
  }, [isAuthenticated, execute]);

  const visible = useMemo(() => {
    const rows = data || [];
    if (!query.trim()) return rows;
    const term = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return rows.filter((row) => {
      const name = `${row.first_name} ${row.last_name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const codes = row.items.map((item) => String(item.assigned_trade_code)).join(' ');
      const titles = row.items.map((item) => item.title.toLowerCase()).join(' ');
      return name.includes(term) || codes.includes(term) || titles.includes(term) || (row.table_number || '').includes(term);
    });
  }, [data, query]);

  if (authIsLoading || isAuthenticated === null || (isLoading && !data && !error)) {
    return <div className="flex min-h-[50dvh] items-center justify-center"><LoadingSpinner message="Cargando faltantes..." /></div>;
  }

  if (error) {
    return <StaffPage><StaffError>{error}</StaffError></StaffPage>;
  }

  return (
    <StaffPage>
      <StaffSearch
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar socio, mesa o etiqueta"
        aria-label="Buscar destinatarios con faltantes"
      />
      {visible.length === 0 ? (
        <StaffEmpty>{query ? 'No hay coincidencias.' : 'Nadie que retire en AMBA tiene faltantes abiertos.'}</StaffEmpty>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((row) => (
            <li key={row.user_id} className="staff-card p-4">
              <p className="font-semibold text-gray-900">{row.first_name} {row.last_name}</p>
              <p className="text-sm text-gray-500">
                {row.table_number ? `Mesa ${row.table_number}` : 'Sin mesa'}
                {` · ${row.items.length} faltante${row.items.length === 1 ? '' : 's'}`}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {row.items.map((item) => (
                  <li key={item.report_id} className="text-sm text-gray-700">
                    #{item.assigned_trade_code} · {item.title}
                    {item.box_number != null ? ` · caja #${item.box_number}` : ''}
                    {item.origin_name ? ` ${item.origin_name}` : ''}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </StaffPage>
  );
}
