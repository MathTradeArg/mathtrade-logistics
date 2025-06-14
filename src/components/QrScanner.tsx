"use client";

import React, { useState, useEffect } from 'react';
import QrReader from 'react-qr-scanner';
interface QrScannerProps {
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan }) => {
  const [isClient, setIsClient] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScan = (data: { text: string } | null) => {
    if (data) {
      onScan(data.text);
      setScanError(null);
    }
  };

  const handleError = (err: any) => {
    console.error("Error del QrScanner:", err);
    setScanError("Error de cámara/scan. ¿Diste permisos?");
  };

  const previewStyle = {
    margin: 'auto',
  };

  return (
    <div className="w-full max-w-md mx-auto my-2 flex flex-col items-center space-y-5"> 
      {isClient && (
        <div className="w-full aspect-square rounded-xl overflow-hidden shadow-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <QrReader
            delay={300}
            style={previewStyle} 
            onError={handleError}
            onScan={handleScan}
            constraints={{ video: { facingMode: "environment" } }}
            className="w-full h-full object-cover bg-gray-100 dark:bg-gray-800" 
          /> 
        </div>
      )}
      {scanError && <p className="text-red-500 dark:text-red-400 text-center mt-4 text-sm">{scanError}</p>}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">Apuntá al QR</p>
    </div>
  );
};

export default QrScanner;
