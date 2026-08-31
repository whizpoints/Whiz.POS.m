import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../../store/posStore';
import { QrCode, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  totalAmount: number;
}

export default function MpesaQR({ totalAmount }: Props) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { businessSetup } = usePosStore();

  useEffect(() => {
    let isMounted = true;
    
    const fetchQRCode = async () => {
      const activeBusinessId = (businessSetup as any)?.businessId || (businessSetup as any)?.cloudBusinessId;
      if (!businessSetup || !activeBusinessId || totalAmount <= 0) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
        const res = await fetch(`${cloudUrl}/api/mpesa/qrcode`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            businessId: activeBusinessId,
            locationId: (businessSetup as any)?.locationId,
            amount: totalAmount,
            refNo: `INV-${Date.now().toString().slice(-5)}`
          })
        });
        
        if (!res.ok) {
          throw new Error('Failed to generate QR Code');
        }
        
        const data = await res.json();
        
        if (isMounted) {
          if (data.QRCode) {
            setQrCodeData(data.QRCode);
          } else {
            throw new Error('QR Code data missing from response');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError('Could not generate M-Pesa QR Code.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchQRCode();
    
    return () => {
      isMounted = false;
    };
  }, [totalAmount, businessSetup]);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-2">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Scan to Pay</h4>
        <p className="text-xs text-gray-500 mt-1">Point your M-Pesa app camera here</p>
      </div>

      <div className="bg-white p-2 rounded-xl border-2 border-gray-100 shadow-sm relative min-h-[140px] min-w-[140px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs">Generating...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-red-400">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs text-center px-4">{error}</span>
          </div>
        ) : qrCodeData ? (
          <div className="relative">
            <img 
              src={`data:image/png;base64,${qrCodeData}`} 
              alt="M-Pesa QR Code" 
              className="w-32 h-32 md:w-36 md:h-36 object-contain rounded-lg"
            />
            {/* Optional M-Pesa Logo in center overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1 rounded-full shadow-sm">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="w-6 h-6 object-contain" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <QrCode className="w-8 h-8 opacity-50" />
            <span className="text-xs">No QR Code available</span>
          </div>
        )}
      </div>
      
      {qrCodeData && !isLoading && !error && (
        <p className="text-[10px] text-gray-400 mt-3 max-w-[200px] leading-tight">
          This QR Code is unique to this transaction and includes the exact amount.
        </p>
      )}
    </div>
  );
}
