// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut } from 'lucide-react';
import { DocumentPreview } from './DocumentPreview';
import type { DocumentType } from './DocumentPreview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
      // Check if Electron API is available (desktop app)
      // @ts-ignore
      const hasElectronPdf = typeof window !== 'undefined' && window.electron && typeof window.electron.generatePdf === 'function';

      if (hasElectronPdf) {
        const styles = document.head.innerHTML;
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              ${styles}
              <style>
                @page { margin: 0; }
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
          author: businessSetup?.businessName || 'Whizpoint Solutions',
          applicationName: 'Whizpoint Solutions'
        });

        if (!response.success && !response.canceled) {
           throw new Error(response.error || 'Unknown error');
        }
        toast.success('PDF downloaded successfully!');
        return;
      }

      // -------------------------------
      // Web fallback: jsPDF + html2canvas
      // -------------------------------
      toast.loading('Generating PDF...', { id: 'pdf-gen' });

      const element = previewRef.current;

      // Determine PDF dimensions in jsPDF units (mm)
      // A4: 210 x 297 mm  |  A5: 148 x 210 mm
      const isA5 = paperSize === 'a5';
      const pdfWidthMm = isA5 ? 148 : 210;
      const pdfHeightMm = isA5 ? 210 : 297;
      const orientation = isA5 ? 'portrait' : 'portrait';

      // Use high scale/resolution for crisp output
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: orientation as any,
        unit: 'mm',
        format: isA5 ? 'a5' : 'a4',
        compress: true,
      });

      // Calculate image size to fit the page while keeping aspect ratio
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgAspect = imgProps.width / imgProps.height;
      const pageAspect = pageWidth / pageHeight;

      let finalWidth = pageWidth;
      let finalHeight = pageHeight;

      if (imgAspect > pageAspect) {
        // Image is wider than page: fit by width
        finalWidth = pageWidth;
        finalHeight = pageWidth / imgAspect;
      } else {
        // Image is taller than page: fit by height
        finalHeight = pageHeight;
        finalWidth = pageHeight * imgAspect;
      }

      // Center on page
      const xOff = (pageWidth - finalWidth) / 2;
      const yOff = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOff, yOff, finalWidth, finalHeight, undefined, 'FAST');

      const fileName = `${type.toLowerCase()}-${data?.docNumber || 'document'}.pdf`;
      pdf.save(fileName);

      toast.success('PDF downloaded successfully!', { id: 'pdf-gen' });
    } catch (error: any) {
      console.error("PDF Gen Error", error);
      toast.dismiss('pdf-gen');
      toast.error(error?.message || 'Error generating PDF');
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


