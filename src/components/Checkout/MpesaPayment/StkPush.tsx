import React, { useState } from 'react';
import { Send, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { usePosStore } from '../../../store/posStore';
import { useToast } from '../../ui/use-toast';

interface Props {
  totalAmount: number;
}

export default function StkPush({ totalAmount }: Props) {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { toast } = useToast();
  const { businessSetup } = usePosStore();

  const normalizePhone = (p: string) => {
    let clean = p.replace(/\D/g, '');
    if (clean.startsWith('0')) clean = '254' + clean.slice(1);
    if (clean.startsWith('254') && clean.length === 12) return clean;
    if (clean.length === 9) return '254' + clean;
    return null;
  };

  const handleSend = async () => {
    const validPhone = normalizePhone(phone);
    if (!validPhone) {
      toast('Please enter a valid Kenyan phone number', 'error');
      return;
    }

    const activeBusinessId = businessSetup?.businessId || (businessSetup as any)?.cloudBusinessId;

    if (!activeBusinessId) {
      toast('Business context missing. Cannot send push. Please re-link your POS.', 'error');
      return;
    }

    setStatus('sending');
    
    try {
      const cloudUrl = import.meta.env.VITE_CLOUD_URL || 'https://api.whizpoint.app';
      console.log(`[STK Push] Initiating push to ${cloudUrl}/api/mpesa/stkpush for businessId ${activeBusinessId}`);

      const res = await fetch(`${cloudUrl}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: validPhone, amount: totalAmount, businessId: activeBusinessId, locationId: (businessSetup as any)?.locationId })
      });
      
      const data = await res.json();
      console.log(`[STK Push] Response received:`, data);
      
      if (data.success) {
        setStatus('sent');
        toast(`STK Push sent to ${validPhone}. Waiting for customer PIN.`, 'success');
      } else {
        setStatus('idle');
        toast(data.error || data.message || 'Failed to send STK Push', 'error');
      }
      
      setTimeout(() => setStatus('idle'), 15000);
    } catch (err) {
      setStatus('idle');
      toast('Could not connect to M-Pesa. Customer can still pay directly to the Till.', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="relative w-full">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">254</span>
        <input 
          type="text"
          value={phone}
          onChange={(e) => {
            // Strip non-digits and leading 254 if they paste it
            let val = e.target.value.replace(/\D/g, '');
            if (val.startsWith('254')) val = val.substring(3);
            setPhone(val);
          }}
          disabled={status !== 'idle'}
          placeholder="7XX XXX XXX"
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        />
      </div>
      
      <button 
        onClick={handleSend}
        disabled={phone.length < 9 || status !== 'idle'}
        className="w-full px-6 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'idle' && <><Send className="w-4 h-4" /> SEND STK PUSH</>}
        {status === 'sending' && <><Loader2 className="w-4 h-4 animate-spin" /> SENDING...</>}
        {status === 'sent' && <><CheckCircle2 className="w-4 h-4 text-green-400" /> SENT</>}
      </button>
    </div>
  );
}

