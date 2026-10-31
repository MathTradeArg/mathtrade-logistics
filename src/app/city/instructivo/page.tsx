"use client";

import { StaffPage } from '@/components/staff';

// Same images as the web Área de referentes (web-ui img/tut-boxes).
const IMAGES = [
  { src: '/tut-boxes/2_300.jpg', width: 1000, height: 400 },
  { src: '/tut-boxes/4_300.jpg', width: 1000, height: 569 },
  { src: '/tut-boxes/5_300.jpg', width: 1000, height: 457 },
];

export default function CityInstructivoPage() {
  return (
    <StaffPage>
      <h1 className="text-center text-lg font-semibold text-gray-700">
        Reglas para preparar las cajas para los envíos
      </h1>
      <div className="mt-4 flex flex-col overflow-hidden rounded-xl border border-gray-300 bg-white">
        {IMAGES.map((img) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={img.src}
            src={img.src}
            alt=""
            width={img.width}
            height={img.height}
            className="block h-auto w-full"
          />
        ))}
      </div>
    </StaffPage>
  );
}
