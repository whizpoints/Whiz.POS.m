import { useEffect, useRef } from 'react';

/**
 * Plays a short, synthetic "beep" sound to simulate a successful hardware scan.
 */
const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn('AudioContext not supported or blocked', e);
  }
};

/**
 * Hook to detect barcode scanner input.
 * Scanners typically act as keyboards, sending characters rapidly followed by Enter.
 *
 * @param onScan Callback function when a barcode is successfully scanned.
 */
export const useBarcodeScanner = (onScan: (code: string) => void) => {
  // Use a ref to store the latest onScan to prevent unnecessary re-binds
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement;

      // Ignore input if user is typing in a text field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Reset buffer if keystrokes are too slow (manual typing vs scanner)
      // 50ms is standard for scanners, but 100ms is safer for some devices/browsers
      if (now - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length > 2) { // Minimal length check to avoid noise
          e.preventDefault(); // Prevent default Enter behavior (like submitting a form)
          playBeep();
          onScanRef.current(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) { // Printable chars
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
