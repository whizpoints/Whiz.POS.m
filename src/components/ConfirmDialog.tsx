import React from 'react';
import { Modal } from './ui/modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 mb-4 ${
          variant === 'danger' ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          <AlertTriangle className={`h-6 w-6 ${
            variant === 'danger' ? 'text-red-600' : 'text-blue-600'
          }`} />
        </div>

        <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-2">
          {title}
        </h3>

        <div className="mt-2">
          <p className="text-sm text-gray-500">
            {description}
          </p>
        </div>

        <div className="mt-6 w-full flex flex-col sm:flex-row-reverse gap-3">
          <button
            type="button"
            className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:w-auto ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-500 focus-visible:outline-red-600'
                : 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600'
            }`}
            onClick={() => {
              onConfirm();
              onCancel(); // Close after confirm
            }}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
