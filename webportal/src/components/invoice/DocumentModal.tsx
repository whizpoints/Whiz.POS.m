// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { X, Download, Printer, ZoomIn, ZoomOut, Mail, RefreshCw } from 'lucide-react';
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
  const [exportCode, setExportCode] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);
const [scale, setScale] = useState(0.8);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState(data?.clientEmail || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Securing & Exporting Document...');
    try {
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const res = await fetch(`${API_BASE_URL}/api/saved-documents/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...data, type })
        });
        const json = await res.json();
        if (json.success) {
            setExportCode(json.verificationCode);
            // Wait for React to re-render the DocumentPreview with the new QR code
            setTimeout(() => {
                captureAndDownloadPDF();
                setIsExporting(false);
                toast.dismiss(toastId);
            }, 600);
        } else {
            throw new Error('Export failed');
        }
    } catch(e) {
       console.error(e);
       toast.error('Failed to secure document snapshot');
       setIsExporting(false);
       toast.dismiss(toastId);
       // Fallback to offline download if cloud export fails
       captureAndDownloadPDF();
    }
  };

  const captureAndDownloadPDF = async () => {
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
        const { toJpeg } = await import('html-to-image');
        const { jsPDF } = await import('jspdf');
        
        const toastId = toast.loading("Generating PDF...");
        try {
          if (!previewRef.current) throw new Error("Preview not found");
          
          const imgData = await toJpeg(previewRef.current, { quality: 0.85, pixelRatio: 1.5, useCORS: true, backgroundColor: '#ffffff' });
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize
          });
          
          const rect = previewRef.current.getBoundingClientRect();
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (rect.height * pdfWidth) / rect.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
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

  
  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) return toast.error('Email is required');
    if (isExporting) return;
    
    setIsExporting(true);
    const toastId = toast.loading('Securing & Exporting Document...');
    try {
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const res = await fetch(`${API_BASE_URL}/api/saved-documents/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ...data, type })
        });
        const json = await res.json();
        if (json.success) {
            setExportCode(json.verificationCode);
            setTimeout(() => {
                captureAndSendEmail();
                setIsExporting(false);
                toast.dismiss(toastId);
            }, 600);
        } else {
            throw new Error('Export failed');
        }
    } catch(e) {
       console.error(e);
       toast.error('Failed to secure document snapshot');
       setIsExporting(false);
       toast.dismiss(toastId);
       captureAndSendEmail();
    }
  };

  const captureAndSendEmail = async () => {
    if (!emailTo) return toast.error('Email is required');
    setIsSendingEmail(true);
    const toastId = toast.loading("Generating PDF for email...");

    try {
      if (!previewRef.current) throw new Error("Preview not found");
      
      const { toJpeg } = await import('html-to-image');
      const { jsPDF } = await import('jspdf');
      const { getApiBaseUrl } = await import('../../lib/utils');
      
      const imgData = await toJpeg(previewRef.current, { quality: 0.85, pixelRatio: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: paperSize });
      const rect = previewRef.current.getBoundingClientRect();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (rect.height * pdfWidth) / rect.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const pdfDataUri = pdf.output('datauristring');
      const filename = `${type.toLowerCase()}-${data?.docNumber || 'document'}.pdf`;
      
      toast.dismiss(toastId);
        setIsEmailModalOpen(false);
        setIsSendingEmail(false);
      
      const API_BASE_URL = getApiBaseUrl();
      const token = localStorage.getItem('whiz-token');
      const emailPromise = fetch(`${API_BASE_URL}/api/email/send-custom`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            to: emailTo,
            subject: `${type.replace(/_/g, ' ')} #${data?.docNumber} from ${branding?.businessName || 'Us'}`,
            isRichTemplate: true,
            richPayload: {
              tenant: {
                business_name: branding?.businessName || 'Business',
                business_email: branding?.email || '',
                phone: branding?.phone || '',
                logo_url: branding?.logoImage || '',
                primary_color: '#0284C7',
                address: branding?.address || '',
                payment_instructions: data?.paymentInfo || ''
              },
              recipient: {
                name: data?.clientName || data?.clientCompany || 'Customer',
                company: data?.clientCompany || '',
                email: emailTo
              },
              document: {
                type: type,
                number: data?.docNumber || '',
                reference_number: data?.projectReference || '',
                issue_date: data?.date || '',
                due_date: data?.dueDate || '',
                currency: 'KES',
                subtotal: data?.subtotal || 0,
                tax: data?.taxAmount || 0,
                total_amount: data?.total || 0,
                amount_paid: 0,
                balance_due: data?.total || 0,
                line_items_summary: data?.items?.[0]?.description ? `${data.items[0].description} ${data.items.length > 1 ? `(+ ${data.items.length - 1} more items)` : ''}` : 'Attached Document',
                public_view_url: exportCode ? `${window.location.origin}/V/${exportCode}` : ''
              }
            },
            attachments: [
              { filename, path: pdfDataUri }
            ]
          })
        })
          .then(async (res) => {
             const result = await res.json();
             if (!res.ok) throw new Error(result.error || 'Failed to send');
             return result;
          });
          
        toast.promise(emailPromise, {
          loading: 'Sending email in background...',
          success: 'Email sent successfully!',
          error: 'Failed to send email'
        });
      } catch (err) {
        console.error(err);
        toast.error("Error generating PDF", { id: toastId });
        setIsSendingEmail(false);
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
            onClick={() => { setEmailTo(data?.clientEmail || data?.customerEmail || ''); setIsEmailModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0"
         >
           <Mail className="w-4 h-4" />
           <span className="hidden md:inline">Email PDF</span>
         </button>

         <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-3 md:px-4 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0"
         >
           <Download className="w-4 h-4" />
           <span className="hidden md:inline">{isExporting ? 'Exporting...' : 'Download PDF'}</span>
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
               verificationCode={exportCode}
             branding={branding}
             signatory={signatory}
             paperSize={paperSize}
           />
        </div>
      </div>
    
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Email {type}</h3>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={handleEmail} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Recipient Email</label>
                <input 
                  type="email" 
                  value={emailTo} 
                  onChange={e => setEmailTo(e.target.value)} 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="client@example.com"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsEmailModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSendingEmail} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
                  {isSendingEmail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


