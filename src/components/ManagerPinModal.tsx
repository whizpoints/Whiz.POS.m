import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldAlert } from 'lucide-react';
import { usePosStore } from '../store/posStore';
import { soundManager } from '../lib/soundUtils';

interface ManagerPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (managerId: string) => void;
  actionDescription: string;
}

export default function ManagerPinModal({ isOpen, onClose, onSuccess, actionDescription }: ManagerPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const users = usePosStore((state) => state.users);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      soundManager.playError();
      return;
    }

    const user = users.find(u => u.pin === pin);
    if (!user) {
      setError('Invalid PIN');
      soundManager.playError();
      return;
    }

    const authorizedRoles = ['SYSTEM_ADMIN', 'STORE_MANAGER', 'SUPERVISOR', 'admin', 'manager'];
    if (!authorizedRoles.includes(user.role)) {
      setError('Unauthorized: Manager access required');
      soundManager.playError();
      return;
    }

    soundManager.playSuccess();
    setPin('');
    onSuccess(user.id);
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      soundManager.playClick();
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    soundManager.playClick();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="bg-red-500 p-6 text-white text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Manager Authorization</h2>
            <p className="text-red-100 text-sm">{actionDescription}</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="password"
                  value={pin}
                  readOnly
                  className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 text-center text-4xl tracking-[1em] text-slate-800 focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="••••"
                />
                {error && <p className="text-red-500 text-sm text-center mt-2 font-medium">{error}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleKeyPress(num.toString())}
                    className="h-14 rounded-xl bg-slate-50 text-slate-800 text-2xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-14 rounded-xl bg-red-50 text-red-600 text-lg font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
                >
                  DEL
                </button>
                <button
                  type="button"
                  onClick={() => handleKeyPress('0')}
                  className="h-14 rounded-xl bg-slate-50 text-slate-800 text-2xl font-semibold hover:bg-slate-200 active:bg-slate-300 transition-colors"
                >
                  0
                </button>
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="h-14 rounded-xl bg-red-500 text-white text-lg font-bold hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  OK
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
