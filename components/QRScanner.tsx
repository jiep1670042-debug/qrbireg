'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanFailure?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanFailure }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // 既にスキャナーが起動中の場合はスキップ（React Strict Mode対策）
    if (scannerRef.current) return;
    
    const element = document.getElementById("qr-reader");
    if (!element) return;

    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScanSuccess(decodedText);
      },
      (error) => {
        if (onScanFailure) {
          onScanFailure(error);
        }
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
        scannerRef.current = null;
      }
    };
  }, [onScanSuccess, onScanFailure]);

  return (
    <div className="w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-sm border border-slate-200">
      <div id="qr-reader" className="w-full bg-slate-50"></div>
      <style jsx global>{`
        #qr-reader {
          border: none !important;
        }
        #qr-reader__scan_region {
          background-color: white;
        }
        #qr-reader__dashboard {
          padding: 16px;
          background-color: white;
        }
        #qr-reader button {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          color: #334155;
          font-weight: bold;
          margin: 4px;
          cursor: pointer;
        }
        #qr-reader button:hover {
          background-color: #e2e8f0;
        }
        #qr-reader select {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          margin-bottom: 8px;
          max-width: 100%;
        }
        #qr-reader a {
          display: none;
        }
      `}</style>
    </div>
  );
}
