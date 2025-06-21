/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { X } from 'lucide-react';

interface FullScreenImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center p-4 z-50"
      onClick={onClose} 
    >
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Vista ampliada" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
          aria-label="Cerrar imagen"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
};

export default FullScreenImageModal;