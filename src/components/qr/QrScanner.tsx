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
        <div className={`${styles.qrReaderContainer} flex aspect-square w-full items-center justify-center rounded-2xl bg-gray-100`}>
          {disabled ? (
            <div className="p-4 text-center text-gray-500">
              <CameraSlash size={48} className="mx-auto mb-4" />
              <p>{disabledMessage}</p>
            </div>
          ) : (
            <QrReader
              delay={300}
              onError={handleError}
              onScan={handleScanFromLibrary}
              constraints={{ video: { facingMode: "environment" } }}
              className="h-full w-full"
            />
          )}
        </div>
      )}
      {scanError && <p className="mt-4 text-center text-sm text-danger">{scanError}</p>}
      {!disabled && (
        <p className="mt-2 text-center text-sm text-gray-500">Apuntá al QR</p>
      )}
    </div>
  );
};

export default QrScanner;
