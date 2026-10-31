"use client";

import NoCity from '@/components/city/NoCity';
import { GameRow, StaffPage } from '@/components/staff';
import { useAuth } from '@/hooks/useAuth';

export default function CityHomePage() {
  const { cityAccess } = useAuth();
  if (!cityAccess) return <NoCity />;

  return (
    <StaffPage>
      <h1 className="text-xl font-bold">{cityAccess.city.name}</h1>
      <ul className="mt-6 flex flex-col gap-3">
        <li>
          <GameRow
            title="Armar cajas"
            subtitle="Las cajas que salen de tu ciudad"
            href="/city/boxes"
          />
        </li>
        <li>
          <GameRow title="Instructivo" subtitle="Cómo preparar las cajas" href="/city/instructivo" />
        </li>
        {cityAccess.kind === 'referrer' && (
          <li>
            <GameRow title="Envíos" subtitle="Tus envíos y sus comprobantes" href="/city/shipments" />
          </li>
        )}
        {cityAccess.kind === 'referrer' && (
          <li>
            <GameRow
              title="Voluntarios"
              subtitle="Quiénes te ayudan a armar las cajas"
              href="/city/volunteers"
            />
          </li>
        )}
      </ul>
    </StaffPage>
  );
}
