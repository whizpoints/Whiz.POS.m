import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Zap, Palette, Music, X, ArrowRight } from 'lucide-react';

interface ChangelogModalProps {
  onClose: () => void;
}

export default function ChangelogModal({ onClose }: ChangelogModalProps) {
  const features = [
    {
      icon: <Palette className="w-6 h-6 text-pink-400" />,
      title: "Database Architecture Upgrade",
      description: "Transitioned from file-based storage to an offline-first SQLite database."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Enhanced Data Resilience",
      description: "Implemented Write-Ahead Logging (WAL) to guarantee zero data corruption during sudden power loss."
    },
    {
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      title: "Automated .wpos Backups",
      description: "Introduced a background daemon to silently backup your database locally every 60 minutes."
    },
    {
      icon: <Music className="w-6 h-6 text-cyan-400" />,
      title: "Decluttered Interface",
      description: "Cleaned up legacy 'Recover Business' features and simplified workflows for a modern aesthetic."
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative"
      >
        {/* Decorative Header */}
        <div className="bg-gradient-to-br from-blue-600 to-violet-700 p-10 text-white relative">
          <Sparkles className="absolute top-6 right-6 w-12 h-12 text-white/20 animate-pulse" />
          <h2 className="text-4xl font-black mb-2">Major Yearly Update!</h2>
          <p className="text-blue-100 text-lg font-medium">Welcome to Whiz POS v7.0.0</p>
        </div>

        <div className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, idx) => (
              <div key={idx} className="flex space-x-4">
                <div className="shrink-0 p-3 bg-slate-50 rounded-2xl border border-slate-100 h-fit">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{feature.title}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
            <h4 className="font-bold text-blue-900 flex items-center space-x-2 mb-2">
              <Zap className="w-5 h-5" />
              <span>Seamless Migration</span>
            </h4>
            <p className="text-sm text-blue-700">
              Your existing setup and data files have automatically been converted and migrated to the new SQLite storage safely.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl font-black text-xl transition-all active:scale-[0.98] shadow-xl flex items-center justify-center space-x-3"
          >
            <span>Let's Explore</span>
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
