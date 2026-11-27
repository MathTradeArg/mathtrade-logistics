import { RefreshCw, TriangleAlert } from 'lucide-react';
import type { UserWithWindow } from '@/types/window';

export function displayName(user: Pick<UserWithWindow, 'first_name' | 'last_name'>): string {
  return `${user.first_name} ${user.last_name}`
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function CallQueue({ calling, waiting }: { calling: UserWithWindow[]; waiting: number }) {
  return (
    <section className="flex flex-col gap-6">
      <p className="text-center text-2xl text-gray-700 md:text-3xl">
        Tené a mano tu QR y acercate a la boca cuando veas tu nombre
      </p>
      {calling.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-2xl text-gray-600 md:text-3xl">No hay nadie en la fila en este momento.</p>
        </div>
      ) : (
        <>
          <h2 className="text-center text-heading font-bold text-primary md:text-2xl">Pasan ahora</h2>
          <ul className="flex flex-col gap-4">
            {calling.map((user) => {
              const receiving = user.status === 'receiving';
              const noShow = user.status === 'no_show';
              return (
                <li
                  key={user.id}
                  className={`rounded-lg border-l-[6px] p-4 text-center ${
                    receiving ? 'border-primary bg-primary/10' : 'border-want bg-want/10'
                  }`}
                >
                  <p className="flex items-center justify-center gap-4 break-words text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                    {receiving && <RefreshCw className="shrink-0 text-primary" size={48} aria-hidden="true" />}
                    {noShow && <TriangleAlert className="shrink-0 fill-sun text-ink" size={48} aria-hidden="true" />}
                    <span>{displayName(user)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          {waiting > 0 && <p className="text-center text-heading text-gray-600">En espera: {waiting}</p>}
        </>
      )}
    </section>
  );
}
