"use client";

import { LoadingSpinner } from '@/components/common/ui';
import { GameRow, StaffEmpty, StaffError } from '@/components/staff';
import { listBoxes } from '@/hooks/boxes/boxApi';
import { boxGoesViaHub, boxLabel, destinationLabel, splitByRoute } from '@/hooks/boxes/boxGrouping';
import { saveTracking, uploadReceipt, type TrackingInput } from '@/hooks/city/cityApi';
import type { Box, Tracking } from '@/types';
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { apiErrorMessage } from './errors';

const inputClass =
  'mt-2 block min-h-14 w-full rounded-md border border-stroke bg-white px-4 text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none';
const labelClass = 'block text-sm font-medium text-gray-700';

type Props = {
  cityId: number;
  /** The shipment being edited; omitted for a new one. */
  tracking?: Tracking | null;
  onSaved: (tracking: Tracking) => void;
  onCancel: () => void;
};

/** Create or edit a shipment of the city's closed boxes, with its receipt photo. */
export default function TrackingEditor({ cityId, tracking, onSaved, onCancel }: Props) {
  const [closedBoxes, setClosedBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [destination, setDestination] = useState<number | null>(tracking?.destiny ?? null);
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set((tracking?.boxes ?? []).map((box) => box.id)),
  );
  const [code, setCode] = useState(tracking?.tracking_code ?? '');
  const [price, setPrice] = useState(tracking?.price != null ? String(tracking.price) : '');
  const [weight, setWeight] = useState(tracking?.weight != null ? String(tracking.weight) : '');
  const [image, setImage] = useState<string>(tracking?.image ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listBoxes({ origin: cityId, status: 'closed' })
      .then((boxes) => {
        if (!cancelled) setClosedBoxes(boxes);
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorMessage(err, 'No se pudieron cargar las cajas.'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const ownBoxIds = useMemo(
    () => new Set((tracking?.boxes ?? []).map((box) => box.id)),
    [tracking],
  );

  const destinations = useMemo(() => {
    const map = new Map<number, { name: string; viaHub: boolean }>();
    [...closedBoxes, ...(tracking?.boxes ?? [])].forEach((box) => {
      const current = map.get(box.destiny);
      map.set(box.destiny, {
        name: box.destination_name || current?.name || `Destino ${box.destiny}`,
        viaHub: Boolean(current?.viaHub) || boxGoesViaHub(box),
      });
    });
    return Array.from(map.entries())
      .map(([id, { name, viaHub }]) => ({ id, name, viaHub, label: destinationLabel(name, viaHub) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [closedBoxes, tracking]);

  // Boxes not shipped yet, plus the ones already in this shipment.
  const boxOptions = useMemo(() => {
    if (destination == null) return [];
    const byId = new Map<number, Box>();
    closedBoxes
      .filter((box) => box.destiny === destination && (!box.tracking || ownBoxIds.has(box.id)))
      .forEach((box) => byId.set(box.id, box));
    (tracking?.boxes ?? [])
      .filter((box) => box.destiny === destination)
      .forEach((box) => byId.set(box.id, byId.get(box.id) ?? box));
    return Array.from(byId.values()).sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
  }, [closedBoxes, destination, ownBoxIds, tracking]);

  const changeDestination = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value ? Number(event.target.value) : null;
    setDestination(value);
    setSelected(new Set());
  };

  const toggleBox = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      setImage(await uploadReceipt(file));
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo subir el comprobante.'));
    } finally {
      setUploading(false);
    }
  };

  const boxIds = boxOptions.filter((box) => selected.has(box.id)).map((box) => box.id);
  const canSave =
    destination != null &&
    boxIds.length > 0 &&
    code.trim() !== '' &&
    price.trim() !== '' &&
    weight.trim() !== '' &&
    !uploading &&
    !saving;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || destination == null) return;
    const body: TrackingInput = {
      destiny: destination,
      tracking_code: code.trim(),
      boxes: boxIds,
      weight: Number(weight),
      price: price.trim(),
      image,
    };
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveTracking(body, tracking?.id));
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo guardar el envío.'));
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner message="Cargando cajas..." />;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label htmlFor="tracking-destination" className={labelClass}>Destino</label>
        <select
          id="tracking-destination"
          value={destination ?? ''}
          onChange={changeDestination}
          className={inputClass}
        >
          <option value="">Elegí un destino</option>
          {splitByRoute(destinations, (dest) => dest.id, (dest) => dest.viaHub).map((section) => (
            <optgroup key={section.key} label={section.title}>
              {section.entries.map((dest) => (
                <option key={dest.id} value={dest.id}>{dest.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {destinations.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No hay cajas cerradas para enviar.</p>
        )}
      </div>

      {destination != null && (
        <fieldset>
          <legend className={labelClass}>Cajas</legend>
          {boxOptions.length === 0 ? (
            <StaffEmpty>No hay cajas cerradas sin envío para este destino.</StaffEmpty>
          ) : (
            <ul className="mt-2 flex flex-col gap-3">
              {boxOptions.map((box) => (
                <li key={box.id}>
                  <GameRow
                    title={`Caja ${boxLabel(box)}`}
                    subtitle={`${box.math_items.length} juegos`}
                    selected={selected.has(box.id)}
                    onClick={() => toggleBox(box.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}

      <div>
        <label htmlFor="tracking-code" className={labelClass}>Código de seguimiento</label>
        <input
          id="tracking-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="tracking-price" className={labelClass}>Precio ($)</label>
          <input
            id="tracking-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label htmlFor="tracking-weight" className={labelClass}>Peso (kg)</label>
          <input
            id="tracking-weight"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputClass}
            required
          />
        </div>
      </div>

      <div>
        <span className={labelClass}>Comprobante</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
          aria-label="Foto del comprobante"
          data-testid="receipt-input"
        />
        {image ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Comprobante" className="h-24 w-24 rounded-md object-cover" />
            <button
              type="button"
              className="staff-btn staff-btn-outline"
              onClick={() => setImage('')}
              disabled={uploading || saving}
            >
              Quitar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="staff-btn staff-btn-outline mt-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || saving}
          >
            {uploading ? 'Subiendo...' : 'Subir foto'}
          </button>
        )}
      </div>

      {error && <StaffError>{error}</StaffError>}

      <div className="flex flex-col gap-3">
        <button type="submit" className="staff-btn staff-btn-primary" disabled={!canSave}>
          {saving ? 'Guardando...' : 'Guardar envío'}
        </button>
        <button type="button" className="staff-btn staff-btn-outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
