import { useEffect } from 'react';
import { usePosStore } from '../store/posStore';

export const useKeyboardShortcuts = () => {
  const { clearCart, openCheckout, cart } = usePosStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is interacting with an input field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Quick Clear Cart: F8 or Delete
      if (e.key === 'F8' || e.key === 'Delete') {
        e.preventDefault();
        if (cart.length > 0) {
          if (window.confirm("Clear current order?")) {
            clearCart();
          }
        }
      }

      // Quick Checkout: F12 or Space
      if (e.key === 'F12' || e.key === ' ') {
        e.preventDefault();
        if (cart.length > 0) {
          openCheckout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clearCart, openCheckout, cart.length]);
};
