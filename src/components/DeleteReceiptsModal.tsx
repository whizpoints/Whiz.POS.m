import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { Trash2, AlertTriangle, Calendar, X } from 'lucide-react';

interface DeleteReceiptsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DeleteReceiptsModal: React.FC<DeleteReceiptsModalProps> = ({ isOpen, onClose }) => {
  const { transactions, deleteTransactions, currentCashier } = usePosStore();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [deleteCount, setDeleteCount] = useState(0);

  if (!isOpen) return null;

  // Get current date string in YYYY-MM-DD format (local time)
  const today = new Date().toLocaleDateString('en-CA');

  const handlePreviewDelete = () => {
    if (!startDate || !endDate) return;

    // Filter transactions in range
    // BUT exclude current day (00:00 to 23:59)
    // Actually, "receipts from 00.00 to 23.59 of the day cant be deleted"
    // "the day" usually means "today" in this context of "Delete OLD receipts".
    // So we strictly exclude any transaction where date string matches today.

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end day

    const toDelete = transactions.filter(t => {
      const tDate = new Date(t.timestamp);
      const tDateString = tDate.toLocaleDateString('en-CA');

      // Safety check: Cannot delete today's receipts
      if (tDateString === today) return false;

      return tDate >= start && tDate <= end;
    });

    setDeleteCount(toDelete.length);
    setIsConfirming(true);
  };

  const handleConfirmDelete = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const idsToDelete = transactions
      .filter(t => {
        const tDate = new Date(t.timestamp);
        const tDateString = tDate.toLocaleDateString('en-CA');
        if (tDateString === today) return false;
        return tDate >= start && tDate <= end;
      })
      .map(t => t.id);

    if (idsToDelete.length > 0) {
        deleteTransactions(idsToDelete);
    }

    onClose();
    // Reset state
    setStartDate('');
    setEndDate('');
    setIsConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
          <div className="flex items-center space-x-2 text-red-700">
            <Trash2 className="w-5 h-5" />
            <h3 className="font-bold">Delete Old Receipts</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!isConfirming ? (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm flex items-start">
                 <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                 <p>
                   You can delete old receipts to clean up data.
                   <span className="font-bold block mt-1">
                     Receipts from today ({today}) cannot be deleted.
                   </span>
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    max={today} // Can't go into future
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 border p-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    max={today}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 border p-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handlePreviewDelete}
                  disabled={!startDate || !endDate}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Find Receipts to Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-600" />
               </div>

               <h4 className="text-xl font-bold text-gray-800">Are you sure?</h4>

               <p className="text-gray-600">
                 You are about to permanently delete <span className="font-bold text-red-600">{deleteCount}</span> receipts
                 from <span className="font-medium">{startDate}</span> to <span className="font-medium">{endDate}</span>.
               </p>

               <p className="text-sm text-gray-500">
                 This action cannot be undone.
                 {deleteCount === 0 && " (No receipts found in this range, or only today's receipts were found)"}
               </p>

               <div className="flex space-x-3 pt-4 justify-center">
                 <button
                    onClick={() => setIsConfirming(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                 >
                    Cancel
                 </button>
                 <button
                    onClick={handleConfirmDelete}
                    disabled={deleteCount === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                 >
                    Confirm Delete
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteReceiptsModal;
