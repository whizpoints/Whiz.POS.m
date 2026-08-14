import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Activity } from 'lucide-react';

interface AutoLogoutModalProps {
  onLogout: () => void;
  userName?: string;
}

export default function AutoLogoutModal({ onLogout, userName }: AutoLogoutModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onLogout]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 relative overflow-hidden"
        >
          {/* Background Decorative Gradient */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-red-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="mb-4 relative">
              <div className="w-20 h-20 rounded-full border-4 border-gray-200 flex items-center justify-center">
                <span className="text-3xl font-bold text-blue-600">{secondsRemaining}</span>
              </div>
              <svg className="absolute top-0 left-0 w-20 h-20 -rotate-90 pointer-events-none">
                 <circle
                   cx="40" cy="40" r="38"
                   stroke="currentColor" strokeWidth="4" fill="transparent"
                   className="text-blue-500 transition-all duration-1000 ease-linear"
                   strokeDasharray="239"
                   strokeDashoffset={239 - (239 * secondsRemaining) / 30}
                 />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {userName ? `Hi ${userName}, are you still here?` : 'Are you still there?'}
            </h2>
            <p className="text-gray-500 mb-8">
              Logging out due to inactivity...
            </p>

            <div className="w-full space-y-3">
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group"
                onClick={() => {
                  // User clicked "Stay". This counts as activity.
                  // Since useIdle hook is event-based, clicking this button triggers document events
                  // that reset the idle state automatically.
                  // We just need a dummy handler here.
                }}
              >
                <Activity className="w-5 h-5 group-hover:animate-pulse" />
                Stay Logged In
              </button>

              <button
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                onClick={onLogout}
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
