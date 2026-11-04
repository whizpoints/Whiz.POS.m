import React, { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../../../store/posStore';
import { QrCode, AlertCircle, Loader2, RotateCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  totalAmount: number;
}

export default function MpesaQR({ totalAmount }: Props) {
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract primitive values from store to avoid unnecessary re-triggers
  const activeBusinessId = usePosStore(s => (s.businessSetup as any)?.cloudBusinessId || (s.businessSetup as any)?.businessId || (s.businessSetup as any)?.id);
  const locationId = usePosStore(s => (s.businessSetup as any)?.locationId || (s.businessSetup as any)?.cloudLocationId);
  const backOfficeUrl = usePosStore(s => s.businessSetup?.backOfficeUrl || s.businessSetup?.cloudUrl);
  const mpesaQrUrl = usePosStore(s => s.businessSetup?.mpesaQrUrl);
  const apiUrl = usePosStore(s => s.businessSetup?.apiUrl);

  // Stable invoice reference for this transaction session
  const invoiceRef = useRef<string>('');
  if (!invoiceRef.current) {
    invoiceRef.current = `INV-${Date.now().toString().slice(-6)}`;
  }

  // Prevent repeated background polls from re-fetching if already fetched for this amount & business
  const lastFetchedKey = useRef<string>('');

  const fetchQRCode = async (forceRefresh = false) => {
    if (!activeBusinessId || totalAmount <= 0) return;

    const requestKey = `${activeBusinessId}-${locationId || ''}-${totalAmount}-${invoiceRef.current}`;
    if (!forceRefresh && lastFetchedKey.current === requestKey && qrCodeData) {
      return; // Already generated consistently for this sale
    }

    if (forceRefresh) {
      invoiceRef.current = `INV-${Date.now().toString().slice(-6)}`;
    }

    setIsLoading(true);
    setError(null);

    try {
      const isLocalHost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        !window.location.hostname
      );

      const candidateUrls: string[] = [];
      if (isLocalHost) {
        candidateUrls.push('http://localhost:3000/api/mpesa/qrcode');
      }
      if (mpesaQrUrl) candidateUrls.push(mpesaQrUrl);
      const webportalBase = (backOfficeUrl || 'https://backoffice.whizpoint.app').replace(/\/+$/, '');
      candidateUrls.push(`${webportalBase}/api/mpesa/qrcode`);
      const localServerBase = (apiUrl || '').replace(/\/+$/, '').replace(/\/api$/, '');
      if (localServerBase) candidateUrls.push(`${localServerBase}/api/mpesa/qrcode`);
      if (!isLocalHost) candidateUrls.push('http://localhost:3000/api/mpesa/qrcode');

      const uniqueUrls = Array.from(new Set(candidateUrls.filter(Boolean)));
      let res: Response | null = null;

      const payload = JSON.stringify({
        businessId: activeBusinessId,
        locationId: locationId,
        amount: totalAmount,
        refNo: invoiceRef.current
      });

      for (const url of uniqueUrls) {
        try {
          res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            signal: AbortSignal.timeout(3000)
          });
          if (res && res.ok) break;
        } catch (e) {
          // Continue to next candidate URL without erroring
        }
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.QRCode) {
          setQrCodeData(data.QRCode);
          lastFetchedKey.current = `${activeBusinessId}-${locationId || ''}-${totalAmount}-${invoiceRef.current}`;
          return;
        }
      }
      // If server QR fetch fails, fallback silently to local QRCodeSVG
    } catch (err: any) {
      console.warn('[MpesaQR] Server QR fetch note (using instant local fallback):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCode(false);
  }, [totalAmount, activeBusinessId, locationId]);

  const businessSetup = usePosStore(s => s.businessSetup);
  const tillOrShortcode = (businessSetup?.mpesaConfig?.partyB || businessSetup?.mpesaConfig?.shortcode || (businessSetup as any)?.tillNumber || (businessSetup as any)?.shortcode || '3098707');
  const isPaybill = (businessSetup?.mpesaConfig?.type as string)?.toLowerCase() === 'paybill' || businessSetup?.mpesaConfig?.type === 'Paybill';

  // Standard Scannable payload for M-Pesa App Camera & QR readers
  const fallbackQrPayload = isPaybill 
    ? `PB:${tillOrShortcode}:${invoiceRef.current}:${Math.round(totalAmount)}`
    : `BG:${tillOrShortcode}:${Math.round(totalAmount)}`;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-2">
      <div className="mb-2 flex items-center justify-between w-full max-w-[200px]">
        <div className="text-left">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Scan or Send</h4>
          <p className="text-[10px] text-gray-500">M-Pesa Camera / Direct Till</p>
        </div>
        <button
          type="button"
          onClick={() => fetchQRCode(true)}
          disabled={isLoading}
          title="Regenerate QR Code"
          className="p-1 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-gray-100 transition-colors"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white p-2.5 rounded-xl border-2 border-gray-100 shadow-sm relative min-h-[148px] min-w-[148px] flex items-center justify-center">
        {qrCodeData ? (
          <div className="relative group">
            <img 
              src={`data:image/png;base64,${qrCodeData}`} 
              alt="M-Pesa QR Code" 
              className="w-32 h-32 md:w-36 md:h-36 object-contain rounded-lg"
            />
            {/* M-Pesa Center Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1 rounded-full shadow-md border border-gray-100">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="w-5 h-5 object-contain" />
              </div>
            </div>
          </div>
        ) : tillOrShortcode ? (
          <div className="relative flex flex-col items-center">
            <QRCodeSVG 
              value={fallbackQrPayload}
              size={136}
              level="M"
              includeMargin={false}
              className="rounded-lg shadow-inner"
            />
            {/* Center Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white p-1 rounded-full shadow-md border border-gray-100">
                <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="M-Pesa" className="w-5 h-5 object-contain" />
              </div>
            </div>
            {isLoading && (
              <div className="absolute -top-1.5 -right-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full px-1.5 py-0.5 text-[9px] flex items-center gap-1 shadow-sm font-medium">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-600" />
                Live
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <QrCode className="w-8 h-8 opacity-40" />
            <span className="text-xs">No QR Code available</span>
          </div>
        )}
      </div>
      
      {tillOrShortcode ? (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
            {isPaybill ? `Paybill: ${tillOrShortcode}` : `Till No: ${tillOrShortcode}`}
          </span>
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
            Ref: {invoiceRef.current}
          </p>
        </div>
      ) : qrCodeData ? (
        <p className="text-[10px] text-gray-400 mt-2 max-w-[200px] leading-tight font-mono">
          Ref: {invoiceRef.current} • Consistent for this sale
        </p>
      ) : null}
    </div>
  );
}
