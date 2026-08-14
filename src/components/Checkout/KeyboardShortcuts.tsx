import { useEffect } from 'react';
import { PaymentMethodType } from './CheckoutModal';

interface Props {
  onMethodSelect: (method: PaymentMethodType) => void;
  onClose: () => void;
}

export default function KeyboardShortcuts({ onMethodSelect, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault();
          onMethodSelect('cash');
          break;
        case 'F2':
          e.preventDefault();
          onMethodSelect('mpesa');
          break;
        case 'F3':
          e.preventDefault();
          onMethodSelect('bank');
          break;
        case 'F4':
          e.preventDefault();
          onMethodSelect('card');
          break;
        case 'F5':
          e.preventDefault();
          onMethodSelect('credit');
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMethodSelect, onClose]);

  return null;
}
