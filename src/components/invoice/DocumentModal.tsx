import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { DocumentPreview, DocumentType } from './DocumentPreview';
import { usePosStore } from '../../store/posStore';
import toast from 'react-hot-toast';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: DocumentType;
  data: any;
  branding: any;
  signatory?: any;
  initialPaperSize?: 'a4' | 'a5';
}

export function DocumentModal({ isOpen, onClose, type, data, branding, signatory, initialPaperSize = 'a4' }: DocumentModalProps) {
  const [paperSize, setPaperSize] = useState<'a4' | 'a5'>(initialPaperSize);
  const [scale, setScale] = useState(0.8);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { businessSetup } = usePosStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setPaperSize(initialPaperSize);
      // Auto-fit scale logic could go here
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialPaperSize]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!previewRef.current) return;

    try {
      const styles = document.head.innerHTML;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${styles}
            <style>
              @page { margin: 0; }
              * {
                 font-family: Arial, Helvetica, sans-serif !important;
                 letter-spacing: normal !important;
              }
              body { margin: 0; padding: 0; background-color: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; justify-content: center; align-items: flex-start; }
              .preview-container-wrapper { width: 100%; height: 100%; display: flex; justify-content: center; }
            </style>
          </head>
          <body>
            <div class="preview-container-wrapper">
               ${previewRef.current.outerHTML}
            </div>
          </body>
        </html>
      `;

        // @ts-ignore
        const response = await window.electron.generatePdf({
          htmlContent,
          paperSize,
          defaultFileName: `${type.toLowerCase()}-${data?.docNumber || 'document'}.pdf`,
          author: branding?.businessName || 'Your Business',
          applicationName: branding?.businessName || 'Your Business'
        });

      if (!response.success && !response.canceled) {
         throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error("PDF Gen Error", error);
      toast.error("Error generating PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full shadow-lg p-2 px-4 z-50">
         <div className="flex bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setPaperSize('a4')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${paperSize === 'a4' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
            >
              A4
            </button>
            <button
              onClick={() => setPaperSize('a5')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${paperSize === 'a5' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
            >
              A5
            </button>
         </div>

         <div className="w-px h-6 bg-slate-200 mx-2"></div>

         <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
           <ZoomOut className="w-4 h-4" />
         </button>
         <span className="text-xs font-mono w-12 text-center text-slate-500">{Math.round(scale * 100)}%</span>
         <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
           <ZoomIn className="w-4 h-4" />
         </button>

         <div className="w-px h-6 bg-slate-200 mx-2"></div>

         <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
         >
           <Download className="w-4 h-4" />
           Download PDF
         </button>

         <button
            onClick={onClose}
            className="ml-2 p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-500 transition-colors"
         >
           <X className="w-4 h-4" />
         </button>
      </div>

      {/* Preview Container (Scrollable) */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-auto flex items-start justify-center pt-20 pb-20"
        onClick={(e) => e.target === containerRef.current && onClose()}
      >
        <div style={{ transform: `scale(${paperSize === 'a5' ? scale * 0.7047 : scale})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
           <DocumentPreview
             ref={previewRef}
             type={type}
             data={data}
             branding={branding}
             signatory={signatory}
             paperSize={paperSize}
           />
        </div>
      </div>
    </div>
  );
}
