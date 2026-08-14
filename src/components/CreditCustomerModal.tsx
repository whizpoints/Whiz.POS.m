import React, { useState } from 'react';
import { usePosStore } from '../store/posStore';
import { CreditCustomer } from '../store/posStore';
import toast from 'react-hot-toast';

interface CreditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customerName: string) => void;
}

const CreditCustomerModal: React.FC<CreditCustomerModalProps> = ({ isOpen, onClose, onSelectCustomer }) => {
  const { creditCustomers, saveCreditCustomer } = usePosStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  if (!isOpen) return null;

  const filteredCustomers = creditCustomers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNewCustomer = () => {
    if (newCustomerName.trim() === '' || newCustomerPhone.trim() === '') {
      // Basic validation
      toast.error('Please enter a name and phone number.');
      return;
    }

    const newCustomer: CreditCustomer = {
      id: `CUST${Date.now()}`,
      name: newCustomerName,
      phone: newCustomerPhone,
      creditSales: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    saveCreditCustomer(newCustomer);
    onSelectCustomer(newCustomer.name);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setIsAddingCustomer(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-1/2 rounded-lg bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">Select Credit Customer</h2>

        {isAddingCustomer ? (
          <div>
            <input
              type="text"
              placeholder="New Customer Name"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="mb-2 w-full rounded border p-2"
            />
            <input
              type="text"
              placeholder="New Customer Phone"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="mb-4 w-full rounded border p-2"
            />
            <div className="flex justify-end">
              <button onClick={() => setIsAddingCustomer(false)} className="mr-2 rounded bg-gray-300 px-4 py-2">
                Cancel
              </button>
              <button onClick={handleAddNewCustomer} className="rounded bg-blue-500 px-4 py-2 text-white">
                Save Customer
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex">
              <input
                type="text"
                placeholder="Search Customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow rounded-l border p-2"
              />
              <button onClick={() => setIsAddingCustomer(true)} className="rounded-r bg-green-500 px-4 py-2 text-white">
                Add New
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.name)}
                  className="cursor-pointer rounded p-2 hover:bg-gray-200"
                >
                  {customer.name} - {customer.phone}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={onClose} className="rounded bg-red-500 px-4 py-2 text-white">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditCustomerModal;
