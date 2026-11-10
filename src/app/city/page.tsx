"use client";

import CityViewSelector from '@/components/city/CityViewSelector';
import NoCity from '@/components/city/NoCity';
import { GameRow, StaffEmpty, StaffHeading, StaffPage } from '@/components/staff';
import { useCityView } from '@/contexts/CityViewContext';

export default function CityHomePage() {
  const { isAdmin, kind, cityId, cityName } = useCityView();
  if (!isAdmin && cityId === null) return <NoCity />;

  const isReferrer = kind === 'referrer';

  return (
    <StaffPage>
      <CityViewSelector />
      {cityId === null ? (
        <StaffEmpty>Elegí una ciudad</StaffEmpty>
      ) : (
        <>
          <StaffHeading level={1}>{cityName}</StaffHeading>
          <h2 className="mt-6 text-body font-semibold text-gray-500">Cajas que salen</h2>
          <ul className="mt-3 flex flex-col gap-3">
            <li>
              <GameRow
                tone="primary"
                title="Armar cajas"
                subtitle="Las cajas que salen de tu ciudad"
                href="/city/boxes"
              />
            </li>
            <li>
              <GameRow
                title="Imprimir etiquetas"
                subtitle="Etiquetas para las cajas que salen de tu ciudad"
                href="/more/print?tab=labels"
              />
            </li>
            <li>
              <GameRow title="Instructivo" subtitle="Cómo preparar las cajas" href="/city/instructivo" />
            </li>
          </ul>

          <h2 className="mt-8 text-body font-semibold text-gray-500">Envíos y recepción</h2>
          <ul className="mt-3 flex flex-col gap-3">
            <li>
              <GameRow
                tone="primary"
                title="Envíos"
                subtitle={isReferrer ? 'Tus envíos, sus comprobantes y los ejemplares' : 'Los ejemplares que salen de tu ciudad'}
                href="/city/shipments"
              />
            </li>
            {isReferrer && (
              <li>
                <GameRow
                  tone="primary"
                  title="Recibidas"
                  subtitle="Las cajas y ejemplares que llegan"
                  href="/city/received"
                />
              </li>
            )}
          </ul>

          <h2 className="mt-8 text-body font-semibold text-gray-500">Personas</h2>
          <ul className="mt-3 flex flex-col gap-3">
            <li>
              <GameRow title="Usuarios" subtitle="Los participantes de tu ciudad" href="/city/users" />
            </li>
            {isReferrer && (
              <li>
                <GameRow
                  title="Voluntarios"
                  subtitle="Quiénes te ayudan a armar las cajas"
                  href="/city/volunteers"
                />
              </li>
            )}
          </ul>
        </>
      )}
    </StaffPage>
  );
}
