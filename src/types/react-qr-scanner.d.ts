declare module 'react-qrcode-scanner-mi' {
  import * as React from 'react';

  interface QrScannerProps {
    delay?: number | false;
    style?: React.CSSProperties;
    onError?: (error: any) => void;
    onScan: (data: string) => void;
    constraints?: MediaStreamConstraints;
    className?: string;
    facingMode?: 'user' | 'environment'; 
    legacyMode?: boolean;
    maxImageSize?: number;
    chooseDevice?: (devices: MediaDeviceInfo[]) => MediaDeviceInfo;
  }
  
  const QrScanner: React.FC<QrScannerProps>;

  export { QrScanner }; 
}
