import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  uploadEndpoint: string;
  onSuccess: (count: number) => void;
}

export default function ExcelUploadModal({ isOpen, onClose, title, description, uploadEndpoint, onSuccess }: ExcelUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.xlsx') && !selected.name.endsWith('.xls')) {
        toast.error('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selected);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    
    // Attempt to get locationId from business logic or pass as prop if necessary. For now, empty means default.
    // formData.append('locationId', '');

    try {
      const API_BASE_URL = window.location.protocol === 'file:' ? 'http://localhost:5050' : (import.meta.env.VITE_API_BASE_URL || '');
      const token = localStorage.getItem('whiz-token');
      
      const res = await fetch(`${API_BASE_URL}${uploadEndpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message, count: data.count });
        toast.success(data.message);
        setTimeout(() => {
          onSuccess(data.count);
          resetAndClose();
        }, 1500);
      } else {
        setResult({ success: false, message: data.error || 'Upload failed' });
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error occurred during upload' });
      toast.error('Network error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={!isUploading ? resetAndClose : undefined}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                {title}
              </h3>
              {!isUploading && (
                <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-6">
                {description}
              </p>
              
              {!result?.success && (
                <div 
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
                            setFile(droppedFile);
                        } else {
                            toast.error('Only Excel files are allowed');
                        }
                    }
                  }}
                >
                  <div className="space-y-1 text-center">
                    {!file ? (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload a file</span>
                            <input ref={fileInputRef} type="file" className="sr-only" accept=".xlsx, .xls" onChange={handleFileChange} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          XLSX up to 10MB
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <FileSpreadsheet className="h-12 w-12 text-green-500 mb-2" />
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button onClick={() => setFile(null)} className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium">Remove file</button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result && (
                <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  {result.success ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />}
                  <div>
                    <h4 className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.success ? 'Success' : 'Error'}
                    </h4>
                    <p className={`text-sm mt-1 ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse gap-3">
            {!result?.success && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed items-center gap-2"
              >
                {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isUploading ? 'Uploading...' : 'Process File'}
              </button>
            )}
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isUploading}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
            >
              {result?.success ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
