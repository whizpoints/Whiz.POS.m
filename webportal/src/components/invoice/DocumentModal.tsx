// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { DocumentPreview } from './DocumentPreview';
import type { DocumentType } from './DocumentPreview';
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
      
      // Auto-fit scale logic
      const updateScale = () => {
        const viewportWidth = window.innerWidth;
        const padding = 32; // 16px on each side
        const availableWidth = viewportWidth - padding;
        const documentWidth = initialPaperSize === 'a5' ? 560 : 794; // approx px width for A4/A5 at 96dpi
        
        if (availableWidth < documentWidth) {
          setScale(availableWidth / documentWidth);
        } else {
          setScale(1);
        }
      };
      
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('resize', updateScale);
      };
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
      if (typeof window !== 'undefined' && (window as any).electron?.generatePdf) {
        // @ts-ignore
        const response = await (window as any).electron.generatePdf({
          htmlContent,
          paperSize,
          defaultFileName: `${type.toLowerCase()}-${data?.docNumber || 'document'}.pdf`,
          author: branding?.businessName || 'Your Business',
          applicationName: branding?.businessName || 'Your Business'
        });

        if (!response.success && !response.canceled) {
           throw new Error(response.error || 'Unknown error');
        }
      } else {
        // Web fallback
        const { toPng } = await import('html-to-image');
        const { jsPDF } = await import('jspdf');
        
        const toastId = toast.loading("Generating PDF...");
        try {
          if (!previewRef.current) throw new Error("Preview not found");
          
          const imgData = await toPng(previewRef.current, { quality: 1.0, pixelRatio: 2 });
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize
          });
          
          const rect = previewRef.current.getBoundingClientRect();
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (rect.height * pdfWidth) / rect.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${type.toLowerCase()}-${data?.docNumber || 'document'}.pdf`);
          toast.success("PDF Downloaded!", { id: toastId });
        } catch (err) {
          toast.error("Failed to generate PDF.", { id: toastId });
          throw err;
        }
      }
    } catch (error) {
      console.error("PDF Gen Error", error);
      toast.error("Error generating PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">

      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 md:gap-2 bg-white rounded-full shadow-lg p-1.5 px-3 md:p-2 md:px-4 z-50 w-max max-w-[95vw]">
         <div className="flex bg-slate-100 rounded-full p-1 shrink-0">
            <button
              onClick={() => setPaperSize('a4')}
              className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all ${paperSize === 'a4' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
            >
              A4
            </button>
            <button
              onClick={() => setPaperSize('a5')}
              className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all ${paperSize === 'a5' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
            >
              A5
            </button>
         </div>

         <div className="hidden md:block w-px h-6 bg-slate-200 mx-1 md:mx-2 shrink-0"></div>

         {/* Zoom controls hidden on mobile to save space */}
         <div className="hidden md:flex items-center">
           <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-1 md:p-2 hover:bg-slate-100 rounded-full text-slate-600">
             <ZoomOut className="w-4 h-4" />
           </button>
           <span className="text-xs font-mono w-10 md:w-12 text-center text-slate-500">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="p-1 md:p-2 hover:bg-slate-100 rounded-full text-slate-600">
             <ZoomIn className="w-4 h-4" />
           </button>
         </div>

         <div className="w-px h-6 bg-slate-200 mx-1 md:mx-2 shrink-0"></div>

         <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0"
         >
           <Download className="w-4 h-4" />
           <span className="hidden md:inline">Download PDF</span>
         </button>

         <button
            onClick={onClose}
            className="ml-1 md:ml-2 p-1.5 md:p-2 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-500 transition-colors shrink-0"
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


