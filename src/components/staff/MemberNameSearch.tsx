"use client";

import { GameRow, StaffEmpty, StaffSearch } from '@/components/staff';
import { useCallback, useEffect, useState } from 'react';

type MemberHit = {
  uuid: string;
  user_id: number;
  first_name: string;
  last_name: string;
};

interface MemberNameSearchProps {
  onSelect: (member: MemberHit) => void;
  disabled?: boolean;
}

export default function MemberNameSearch({ onSelect, disabled = false }: MemberNameSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberHit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }
    const token = localStorage.getItem('authToken');
    const host = process.env.NEXT_PUBLIC_MT_API_HOST || '';
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${host}logistics/members/search/?q=${encodeURIComponent(q.trim())}`,
        { headers: { Authorization: `token ${token}` } },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({ detail: 'No se pudo buscar.' }));
        throw new Error(body.detail || 'No se pudo buscar.');
      }
      const data: MemberHit[] = await response.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'No se pudo buscar.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      search(query);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, search]);

  return (
    <div className="mt-6 w-full">
      <StaffSearch
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre y apellido"
        aria-label="Buscar socio por nombre"
        disabled={disabled}
      />
      {isLoading && <p className="mt-3 text-center text-sm text-gray-500">Buscando...</p>}
      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
      {!isLoading && !error && query.trim().length >= 2 && results.length === 0 && (
        <StaffEmpty>No hay socios que coincidan.</StaffEmpty>
      )}
      {results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {results.map((member) => (
            <li key={member.uuid}>
              <GameRow
                title={`${member.first_name} ${member.last_name}`.trim()}
                onClick={() => onSelect(member)}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
