"use client";

import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useEffect } from 'react';

interface QrScannerProps {
  onScan: (data: string) => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan }) => {

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true, 
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA], 
        /*videoConstraints: {
          facingMode: { exact: "environment" } 
        }*/
      },
      false 
    );

    const onScanSuccess = (decodedText: string) => {
      scanner.clear();
      onScan(decodedText);
    };

    const onScanFailure = () => {
    };

    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      scanner.clear().catch(error => {
        console.error("Error al limpiar el scanner, probablemente ya estaba detenido.", error);
      });
    };
  }, [onScan]); 

  return (
        <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Escanear Código QR</h2>
      <div id="qr-reader-container" className="w-full aspect-square border-2 border-gray-300 rounded-lg overflow-hidden mb-4 md:w-80 md:h-80">
      </div>
      <p className="text-gray-600 text-center">
        Apuntá la cámara al código QR
      </p>
    </div>
  );
};

export default QrScanner;