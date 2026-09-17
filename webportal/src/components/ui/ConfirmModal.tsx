import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white border border-slate-200 shadow-2xl rounded-3xl w-full max-w-sm p-6 overflow-hidden">
        
        {/* Top colored border */}
        <div className={`absolute top-0 left-0 w-full h-1 ${isDestructive ? 'bg-red-500' : 'bg-sky-500'}`} />
        
        <div className="flex flex-col items-center text-center mt-4 mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-sky-50 text-sky-500'}`}>
            {isDestructive ? <Trash2 className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">
            {title}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition-colors shadow-lg hover:-translate-y-0.5 active:translate-y-0 ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
