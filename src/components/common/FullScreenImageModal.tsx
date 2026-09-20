import React from 'react';
import Image from 'next/image';
import { X } from 'phosphor-react';
import { useHapticClick } from '@/hooks/useHapticClick';

interface FullScreenImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({ imageUrl, onClose }) => {
  const handleClose = useHapticClick(onClose);
  
  if (!imageUrl) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/80 p-4"
      onClick={handleClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()} 
      >
        <Image
          src={imageUrl}
          alt="Imagen en pantalla completa"
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          fill
          sizes="100vw"
          style={{ objectFit: 'contain' }}
          priority
        />
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-full bg-white p-2"
          aria-label="Cerrar imagen"
        >
          <X size={24} className="text-gray-800" />
        </button>
      </div>
    </div>
  );
};

export default FullScreenImageModal;