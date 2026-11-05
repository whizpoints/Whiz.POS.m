import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, description, children, className }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className={cn(
        "relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto",
        className
      )}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {title && (
          <div className="mb-4 pr-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};
