declare module 'react-qr-scanner' {
  import * as React from 'react';

  interface QrReaderProps {
    delay?: number | false;
    style?: React.CSSProperties;
    onError?: (error: any) => void;
    onScan?: (data: { text: string } | null) => void;
    constraints?: MediaStreamConstraints;
    className?: string;
    facingMode?: 'user' | 'environment'; 
    legacyMode?: boolean;
    maxImageSize?: number;
    chooseDevice?: (devices: MediaDeviceInfo[]) => MediaDeviceInfo;
  }

  class QrReader extends React.Component<QrReaderProps> {}

  export default QrReader;
}
