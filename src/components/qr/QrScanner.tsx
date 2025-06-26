"use client";

import React, { useState, useEffect } from 'react';
import styles from './QrScanner.module.css';
import { QrScanner as QrReader } from 'react-qrcode-scanner-mi';
import { CameraSlash } from 'phosphor-react';

interface QrScannerProps {
  onScan: (data: string) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan, disabled = false, disabledMessage = "El escaneo de QR está deshabilitado en la fase actual." }) => {
  const [isClient, setIsClient] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleScanFromLibrary = (scannedData: string | null) => {
    if (scannedData && !disabled) {
      onScan(scannedData);
      setScanError(null);
    }
  };

  const handleError = (err: any) => {
    console.error("Error del QrScanner:", err);
    setScanError("Error de cámara/scan. ¿Diste permisos?");
  };

  return (
    <div className="w-full max-w-md mx-auto my-2 flex flex-col items-center space-y-5"> 
      {isClient && (
        <div className={`${styles.qrReaderContainer} w-full aspect-square rounded-2xl bg-gray-100 dark:bg-[#23272f] flex items-center justify-center`} style={{ background: 'inherit' }}>
          {disabled ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              <CameraSlash size={48} className="mx-auto mb-4" />
              <p>{disabledMessage}</p>
            </div>
          ) : (
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScanFromLibrary}
              constraints={{ video: { facingMode: "environment" } }}
              className="w-full h-full"
            />
          )}
        </div>
      )}
      {scanError && <p className="text-red-500 dark:text-red-400 text-center mt-4 text-sm nm-font nm-text-no-shadow">{scanError}</p>}
      {!disabled && (
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2 nm-font nm-text-no-shadow">Apuntá al QR</p>
      )}
    </div>
  );
};

export default QrScanner;
