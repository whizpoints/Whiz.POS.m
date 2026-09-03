// @ts-nocheck
import React from 'react';
import { cn, numberToWords } from '../../lib/utils';
import { DOCUMENT_TEMPLATES } from './documentData';

export type DocumentType =
  | 'QUOTATION'
  | 'PURCHASE_ORDER'
  | 'WORK_ORDER'
  | 'DELIVERY_NOTE'
  | 'COMPLETION_CERTIFICATE'
  | 'INVOICE'
  | 'PAYMENT_REMINDER'
  | 'DEMAND_LETTER_FULL'
  | 'DEMAND_LETTER_PARTIAL'
  | 'SETTLEMENT_OFFER'
  | 'PAYMENT_RECEIPT'
  | 'FINAL_NOTICE'
  | 'LEGAL_NOTICE';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit?: string;
  price: number;
}

interface DocumentData {
  docNumber: string;
  date: string;
  dueDate?: string;
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  notes: string;
  paymentInfo: string;
  // Specific fields for new docs
  subject?: string;
  bodyText?: string;
  partialAmount?: number;
  settlementDate?: string;
  daysNotice?: number;
  paymentMode?: string;
  projectReference?: string;
}

interface Branding {
  logoImage: string | null;
  headerImage: string | null;
  backgroundImage: string | null;
  useCustomHeader: boolean;
  businessName: string;
  address: string;
  phone: string;
  email: string;
}

interface Signatory {
  name: string;
  role: string;
}

interface DocumentPreviewProps {
  type: DocumentType;
  data: DocumentData;
  branding: Branding;
  signatory?: Signatory | null;
  paperSize: 'a4' | 'a5';
  verificationCode?: string;
}

export const DocumentPreview = React.forwardRef<HTMLDivElement, DocumentPreviewProps>(
  ({ type, data, branding, paperSize, signatory, verificationCode }, ref) => {

    // Helper to replace placeholders in text templates
    const processText = (template: string) => {
      let text = template;
      text = text.replace(/\[Client Name\]/g, data.clientName || data.clientCompany || 'Client');
      text = text.replace(/\[Invoice No.\]/g, data.docNumber);
      text = text.replace(/\[Invoice Nos.\]/g, data.docNumber);
      text = text.replace(/\[Date\]/g, data.date);
      text = text.replace(/\[Due Date\]/g, data.dueDate || 'Upon Receipt');
      text = text.replace(/\[Amount\]/g, data.total.toLocaleString());
      text = text.replace(/\[Total Amount\]/g, data.total.toLocaleString());

      // New placeholders
      text = text.replace(/\[Project \/ Invoice Reference\]/g, data.projectReference || data.docNumber);
      text = text.replace(/\[Partial Amount\]/g, data.partialAmount?.toLocaleString() || '0');
      text = text.replace(/\[Final Date\]/g, data.settlementDate || 'TBD');
      text = text.replace(/\[X days\]/g, String(data.daysNotice || 7) + ' days');
      text = text.replace(/\[Payment Mode\]/g, data.paymentMode || 'Cash/Bank');

      // Fallback for custom body text if user edited it
      return text;
    };

    const isTransactional = [
      'QUOTATION', 'PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_NOTE',
      'INVOICE'
    ].includes(type);

    // Letter types use the text templates
    const isLetter = !isTransactional;

    // Check if body already contains signature block to prevent duplication
    const hasSignatureBlock = data.bodyText && (
      data.bodyText.includes('Sincerely') ||
      data.bodyText.includes('Authorized Signatory') ||
      data.bodyText.includes('Regards')
    );

    // Determine Title Display
    
  const getProxyUrl = (url: string | undefined | null) => {
    if (!url) return undefined;
    if (url.startsWith('http')) {
      const isWebportal = typeof window !== 'undefined' && window.location.href.includes('/dashboard');
      const baseUrl = isWebportal ? 'https://api.whizpoint.app' : 'http://localhost:5050';
      return `${baseUrl}/api/documents/proxy-image?url=${encodeURIComponent(url)}`;
    }
    return url;
  };
  
  

  const getTitle = () => {
      switch(type) {
        case 'PURCHASE_ORDER': return 'PURCHASE ORDER';
        case 'WORK_ORDER': return 'WORK ORDER';
        case 'DELIVERY_NOTE': return 'DELIVERY NOTE';
        case 'COMPLETION_CERTIFICATE': return 'COMPLETION CERTIFICATE';
        case 'PAYMENT_REMINDER': return 'PAYMENT REMINDER';
        case 'DEMAND_LETTER_FULL': return 'DEMAND NOTICE';
        case 'DEMAND_LETTER_PARTIAL': return 'PARTIAL DEMAND';
        case 'SETTLEMENT_OFFER': return 'SETTLEMENT OFFER';
        case 'FINAL_NOTICE': return 'FINAL NOTICE';
        case 'LEGAL_NOTICE': return 'LEGAL NOTICE';
        default: return type;
      }
    };

    return (
      <div
        ref={ref}
        className="bg-white relative text-slate-800 leading-normal origin-top mx-auto shadow-2xl font-sans tracking-wide"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '0',
          boxSizing: 'border-box',
          // Ensure print emulation
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          letterSpacing: '0.01em'
        }}
      >
        {branding.backgroundImage && (
          <div className="absolute inset-0 pointer-events-none opacity-10 flex items-center justify-center overflow-hidden z-0">
            <img src={getProxyUrl(branding.backgroundImage)} className="w-full h-full object-cover" alt="bg" />
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full min-h-[inherit]">

          {/* --- HEADER --- */}
          <div className="bg-white text-slate-900 p-8 border-b-2 border-slate-100">
            <div className="flex justify-between items-start">
              {/* Top Left: Business Name & Contact Info */}
              <div className="w-1/2 pr-4">
                {branding.logoImage ? (
                  <img src={getProxyUrl(branding.logoImage)} className="w-auto h-20 object-contain mb-3" alt="Logo" crossOrigin="anonymous" />
                ) : null}
                <h1 className="text-2xl font-bold text-sky-900 leading-tight">{branding.businessName}</h1>
                <p className="text-slate-600 text-xs whitespace-pre-line mt-1.5 leading-relaxed">
                  {branding.address}{'\n'}
                  {branding.phone}{'\n'}
                  {branding.email}
                </p>
              </div>

              {/* Top Right: Document Type, Date, Ref */}
              <div className="w-1/2 flex flex-col items-end text-right">
                <h2 className="text-3xl font-black text-sky-900 tracking-widest uppercase mb-4">{getTitle()}</h2>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 min-w-[200px]">
                  <div className="flex justify-between gap-4 text-xs mb-1.5">
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Ref #:</span>
                    <span className="font-bold text-slate-900">{data.docNumber}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-xs mb-1.5">
                    <span className="text-slate-500 uppercase tracking-wider font-semibold">Date:</span>
                    <span className="font-bold text-slate-900">{data.date}</span>
                  </div>
                  {data.dueDate && (
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-slate-500 uppercase tracking-wider font-semibold">Due Date:</span>
                      <span className="font-bold text-slate-900">{data.dueDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- CLIENT --- */}
          <div className="px-8 py-6">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {isLetter ? 'To:' : 'Bill To:'}
             </h3>
             <div className="text-base font-bold text-slate-800">{data.clientCompany}</div>
             <div className="text-slate-600 text-sm whitespace-pre-line">
                {data.clientName && <div>Attn: {data.clientName}</div>}
                {data.clientAddress}
                {data.clientEmail && <div>{data.clientEmail}</div>}
             </div>
          </div>

          {/* --- CONTENT: TRANSACTIONAL --- */}
          {isTransactional && (
            <div className="px-8 flex-1">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="border-b-2 border-sky-900 text-sm">
                       <th className="py-2 font-bold text-sky-900 w-12">#</th>
                       <th className="py-2 font-bold text-sky-900">Description</th>
                       <th className="py-2 font-bold text-sky-900 text-center w-24">Qty</th>
                       {type !== 'DELIVERY_NOTE' && (
                         <>
                           <th className="py-2 font-bold text-sky-900 text-right w-24">Rate</th>
                           <th className="py-2 font-bold text-sky-900 text-right w-24">Total</th>
                         </>
                       )}
                    </tr>
                 </thead>
                 <tbody>
                    {data.items.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-100 text-sm">
                         <td className="py-3 text-slate-500 align-top">{index + 1}</td>
                         <td className="py-3 font-medium align-top whitespace-pre-wrap">{item.description}</td>
                         <td className="py-3 text-center align-top">{item.quantity} {item.unit ? <span className="text-slate-900 font-medium ml-0.5">{item.unit}</span> : ''}</td>
                         {type !== 'DELIVERY_NOTE' && (
                           <>
                             <td className="py-3 text-right align-top">{item.price.toLocaleString()}</td>
                             <td className="py-3 text-right font-bold text-slate-700 align-top">
                               {(item.quantity * item.price).toLocaleString()}
                             </td>
                           </>
                         )}
                      </tr>
                    ))}
                 </tbody>
              </table>

              {/* Totals Section */}
              {type !== 'DELIVERY_NOTE' && (
                <div className="mt-6 flex justify-end break-inside-avoid">
                   <div className="w-1/2 md:w-5/12 space-y-1 text-sm bg-slate-50 p-4 rounded-lg">
                      <div className="flex justify-between text-slate-600">
                         <span>Subtotal:</span>
                         <span>{data.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                         <span>Tax ({data.taxRate}%):</span>
                         <span>{data.taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-sky-900 pt-2 border-t-2 border-sky-900 mt-2">
                         <span>Total:</span>
                         <span>{data.total.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-slate-500 max-w-sm mt-4">
                        Amount in words: {numberToWords(data.total)} Only
                     </div>
                   </div>
                </div>
              )}

              {/* Approval Section for Quotes/POs */}
              {(type === 'QUOTATION' || type === 'PURCHASE_ORDER') && (
                  <div className="mt-12 border-2 border-slate-200 border-dashed rounded-xl p-6 break-inside-avoid">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Acceptance & Authorization</h4>
                      <p className="text-xs text-slate-600 mb-8 italic">
                        {type === 'QUOTATION'
                          ? "We accept this quotation and authorize the work/order as described above."
                          : "This purchase order is authorized by the undersigned."}
                      </p>

                      <div className="grid grid-cols-2 gap-8">
                          <div>
                              <div className="border-b border-slate-300 h-8"></div>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">Authorized Signature</p>
                          </div>
                          <div>
                              <div className="border-b border-slate-300 h-8"></div>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase">Date & Stamp</p>
                          </div>
                      </div>
                  </div>
              )}
            </div>
          )}

          {/* --- CONTENT: LETTERS --- */}
          {isLetter && (
             <div className="px-8 flex-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-serif">
                <div className="mb-6 font-bold text-slate-900 underline">
                   {data.subject || "Subject: Important Notice"}
                </div>

                <div className="min-h-[200px]">
                  {data.bodyText ? processText(data.bodyText) : "No content provided."}
                </div>

                {!hasSignatureBlock && (
                  <div className="mt-12">
                     <div className="space-y-1">
                        <p className="font-bold text-slate-900">{signatory?.name || '{{signed in user}}'}</p>
                        <p className="text-slate-500 text-xs uppercase tracking-wider">{signatory?.role || '{{role}}'}</p>
                        <p className="font-bold text-slate-900">{branding.businessName}</p>
                     </div>

                     <div className="mt-8 flex items-end gap-2">
                        <span className="text-slate-500 font-medium">Sign</span>
                        <div className="border-b border-slate-400 border-dashed w-64"></div>
                     </div>
                  </div>
                )}
             </div>
          )}

          {/* --- FOOTER --- */}
          <div className="px-8 py-8 mt-auto">
             <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                <div>
                   <h4 className="font-bold text-sky-900 mb-1 text-sm">Terms & Notes</h4>
                   <p className="text-[10px] text-slate-500 whitespace-pre-wrap">{data.notes}</p>
                </div>
                {isTransactional && (
                  <div>
                    <h4 className="font-bold text-sky-900 mb-1 text-sm">Payment Info</h4>
                    <p className="text-[10px] text-slate-500 whitespace-pre-wrap">{data.paymentInfo}</p>
                  </div>
                )}
             </div>
          </div>

          {/* Branding Footer */}
          <div className="bg-slate-100 p-3 text-center text-[10px] text-slate-400">
             {branding.businessName} • {branding.phone}
          </div>

        </div>
      </div>
    );
  }
);

DocumentPreview.displayName = 'DocumentPreview';

