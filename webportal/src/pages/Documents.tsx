// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { usePosStore } from '../store/posStore';
import type { SavedDocument } from '../store/posStore';
import {
  FileText, Download, Plus, Trash2, Upload, Image as ImageIcon,
  Settings, User, Calendar, DollarSign, LayoutTemplate,
  Printer, Eye, FileOutput, FileInput, AlertTriangle, Scale, CheckCircle,
  Save, FolderOpen, X, Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentModal } from '../components/invoice/DocumentModal';
import { DOCUMENT_TEMPLATES } from '../components/invoice/documentData';
import type { DocumentType } from '../components/invoice/DocumentPreview';

// Types
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string; icon: any; category: 'transaction' | 'letter' }[] = [
  // Transactional
  { id: 'QUOTATION', label: 'Quotation', icon: FileInput, category: 'transaction' },
  { id: 'PURCHASE_ORDER', label: 'Purchase Order', icon: FileText, category: 'transaction' },
  { id: 'WORK_ORDER', label: 'Work Order', icon: Settings, category: 'transaction' },
  { id: 'DELIVERY_NOTE', label: 'Delivery Note', icon: FileOutput, category: 'transaction' },
  { id: 'INVOICE', label: 'Invoice', icon: DollarSign, category: 'transaction' },
  // Letters
  { id: 'COMPLETION_CERTIFICATE', label: 'Completion Cert', icon: CheckCircle, category: 'letter' },
  // Letters
  { id: 'PAYMENT_RECEIPT', label: 'Payment Receipt', icon: CheckCircle, category: 'letter' },
  { id: 'PAYMENT_REMINDER', label: 'Payment Reminder', icon: AlertTriangle, category: 'letter' },
  { id: 'DEMAND_LETTER_FULL', label: 'Demand (Full)', icon: AlertTriangle, category: 'letter' },
  { id: 'DEMAND_LETTER_PARTIAL', label: 'Demand (Partial)', icon: AlertTriangle, category: 'letter' },
  { id: 'SETTLEMENT_OFFER', label: 'Settlement Offer', icon: Scale, category: 'letter' },
  { id: 'FINAL_NOTICE', label: 'Final Notice', icon: AlertTriangle, category: 'letter' },
  { id: 'LEGAL_NOTICE', label: 'Legal Notice', icon: Scale, category: 'letter' },
];


import toast from 'react-hot-toast';

export default function InvoiceGenerator() {
  const { businessSetup, transactions, currentCashier, documentSettings, saveDocumentSettings, creditCustomers, saveCreditCustomer, documents, saveDocument, deleteDocument } = usePosStore();

  // Document State
  const [docType, setDocType] = useState<DocumentType>('INVOICE');
  const [docNumber, setDocNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransactionSearch, setShowTransactionSearch] = useState(false);
  
  // Settings & Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showSavedDocs, setShowSavedDocs] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  // Letter State
  const [subject, setSubject] = useState('');
  // const [bodyText, setBodyText] = useState(''); // REPLACED BY TEMPLATE LOGIC
  const [templateString, setTemplateString] = useState('');

  // Specific Form Fields
  const [partialAmount, setPartialAmount] = useState(0);
  const [settlementDate, setSettlementDate] = useState('');
  const [daysNotice, setDaysNotice] = useState(7);
  const [paymentMode, setPaymentMode] = useState('');
  const [projectReference, setProjectReference] = useState('');

  // Branding State
  const [useCustomHeader, setUseCustomHeader] = useState(false);
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  // Client State
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Service / Product Description', quantity: 1, price: 0 }
  ]);

  // Footer State
  const [notes, setNotes] = useState('Thank you for your business!');
  const [paymentInfo, setPaymentInfo] = useState('');

  // Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPaperSize, setPreviewPaperSize] = useState<'a4' | 'a5'>('a4');
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>({});
  const [showWatermark, setShowWatermark] = useState(true);

  // Refs
  const fileInputHeaderRef = useRef<HTMLInputElement>(null);
  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputBgRef = useRef<HTMLInputElement>(null);

  // Initialize defaults from store
  useEffect(() => {
    if (businessSetup) {
      if (!paymentInfo && !documentSettings) {
         setPaymentInfo(`Bank: Example Bank\nAcc: 123456789\nM-Pesa Till: ${businessSetup.phone}`);
      }
    }
  }, [businessSetup, paymentInfo, documentSettings]);

  useEffect(() => {
    if (documentSettings && !currentDocId) {
      setLogoImage(businessSetup?.documentLogoUrl || documentSettings.logoImage || null);
      setHeaderImage(documentSettings.headerImage || null);
      setUseCustomHeader(documentSettings.useCustomHeader || false);
      setShowWatermark(documentSettings.showWatermark ?? true);
      setBackgroundImage(businessSetup?.watermarkUrl || documentSettings.backgroundImage || null);
      
      setNotes(documentSettings.defaultNotes || "This is a computer generated document and doesn't need a stamp or signature for receiving.");
      setPaymentInfo(documentSettings.defaultPaymentInfo || '');
    } else if (!documentSettings && !currentDocId) {
      setNotes("This is a computer generated document and doesn't need a stamp or signature for receiving.");
    }
  }, [documentSettings, currentDocId, docType, businessSetup]);

  // Fetch saved clients and documents on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('whiz-token');
        if (!token) return;
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const [clientsRes, docsRes, profileRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/clients`, { headers }),
          fetch(`${API_BASE_URL}/api/saved-documents`, { headers }),
          fetch(`${API_BASE_URL}/api/business/profile`, { headers })
        ]);
        if (clientsRes.ok) {
           const clients = await clientsRes.json();
           usePosStore.setState({ creditCustomers: clients });
        }
        if (docsRes.ok) {
           const docs = await docsRes.json();
           usePosStore.setState({ documents: docs.map((d: any) => ({
             id: d.id,
             type: d.type,
             name: d.customerName || `Untitled ${d.type}`,
             date: d.date,
             data: {
               ...d.metadata,
               items: d.items,
               subtotal: d.subtotal,
               taxAmount: d.tax,
               total: d.total,
               notes: d.notes,
               clientName: d.customerName,
               clientCompany: d.customerName,
               clientEmail: d.customerEmail,
               clientAddress: d.customerAddress,
             }
           })) });
        }
        if (profileRes.ok) {
           const profile = await profileRes.json();
           try {
             if (typeof profile.settings === 'string') profile.settings = JSON.parse(profile.settings);
           } catch(e) {}
           usePosStore.setState({ businessSetup: profile });
           if (profile.settings?.documentDefaults) {
             usePosStore.setState({ documentSettings: profile.settings.documentDefaults });
           }
        }
      } catch (err) {}
    };
    fetchData();
  }, []);

  const handleSaveDocument = async () => {
    setIsSavingDoc(true);
    const docData = { docNumber, date, dueDate, clientName, clientCompany, clientAddress, clientEmail, items, subtotal, taxAmount, total, taxRate, notes, paymentInfo, subject, bodyText: templateString, partialAmount, settlementDate, daysNotice, paymentMode, projectReference, branding: { logoImage, headerImage, backgroundImage: showWatermark ? backgroundImage : null, useCustomHeader } };
    const newDocId = currentDocId || `DOC${Date.now()}`;
    const apiDoc = { id: newDocId, type: docType, date: new Date().toISOString(), customerName: clientCompany || clientName || 'Unknown', customerEmail: clientEmail, customerPhone: clientAddress, customerAddress: clientAddress, items: items, subtotal: subtotal, tax: taxAmount, total: total, notes: notes, status: 'DRAFT', metadata: docData };
    
    try {
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const res = await fetch(`${API_BASE_URL}/api/saved-documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(apiDoc)
        });
        if (res.ok) {
            const savedDoc = await res.json();
            const localFormat: SavedDocument = { id: savedDoc.id, type: savedDoc.type, name: savedDoc.customerName || `Untitled ${savedDoc.type}`, date: savedDoc.date, data: docData };
            saveDocument(localFormat);
            setCurrentDocId(savedDoc.id);
            toast.success('Document saved permanently to Neon Database!');
        } else { toast.error('Failed to save document to cloud.'); }
    } catch (e) { toast.error('Network error saving document.'); } finally { setIsSavingDoc(false); }
  };

  const handleSaveClient = async () => {
    setIsSavingClient(true);
    if (!clientName && !clientCompany) {
      toast.error('Please enter a Client Name or Company Name first.');
      setIsSavingClient(false);
      return;
    }
    const newCustomer = { id: Date.now().toString(), name: clientCompany || clientName, phone: clientAddress, email: clientEmail, address: clientAddress };
    try {
        const token = localStorage.getItem('whiz-token');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
        const res = await fetch(`${API_BASE_URL}/api/clients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(newCustomer)
        });
        if (res.ok) {
            const savedClient = await res.json();
            usePosStore.setState((s: any) => ({ creditCustomers: [...s.creditCustomers, savedClient] }));
            toast.success('Client permanently saved to Neon Database!');
        } else { toast.error('Failed to save client to cloud.'); }
    } catch (e) { toast.error('Network error saving client.'); } finally { setIsSavingClient(false); }
  };

  const handleLoadDocument = (doc: SavedDocument) => {
    const d = doc.data;
    setDocType(doc.type as DocumentType);
    setDocNumber(d.docNumber);
    setDate(d.date);
    setDueDate(d.dueDate);
    setClientName(d.clientName);
    setClientCompany(d.clientCompany);
    setClientAddress(d.clientAddress);
    setClientEmail(d.clientEmail);
    setItems(d.items || []);
    setNotes(d.notes);
    setPaymentInfo(d.paymentInfo);
    setSubject(d.subject);
    setTemplateString(d.bodyText);
    setPartialAmount(d.partialAmount);
    setSettlementDate(d.settlementDate);
    setDaysNotice(d.daysNotice);
    setPaymentMode(d.paymentMode);
    setProjectReference(d.projectReference);

    if (d.branding) {
      setLogoImage(d.branding.logoImage);
      setHeaderImage(d.branding.headerImage);
      setBackgroundImage(d.branding.backgroundImage);
      setShowWatermark(!!d.branding.backgroundImage);
      setUseCustomHeader(d.branding.useCustomHeader);
    }

    setCurrentDocId(doc.id);
    setShowSavedDocs(false);
  };

  const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this saved document?')) {
      deleteDocument(id);
      if (currentDocId === id) setCurrentDocId(null);
    }
  };

  // Handle Document Type Change
  const handleTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    setCurrentDocId(null); // Reset ID when changing type manually (treated as new doc)

    // Auto-generate number prefix
    const prefixMap: Record<string, string> = {
      QUOTATION: 'QTN', PURCHASE_ORDER: 'PO', WORK_ORDER: 'WO', DELIVERY_NOTE: 'DN',
      COMPLETION_CERTIFICATE: 'CC', INVOICE: 'INV', PAYMENT_RECEIPT: 'RCT',
      PAYMENT_REMINDER: 'REM', DEMAND_LETTER_FULL: 'DMD', DEMAND_LETTER_PARTIAL: 'DMD',
      SETTLEMENT_OFFER: 'SET', FINAL_NOTICE: 'FNL', LEGAL_NOTICE: 'LGL'
    };

    setDocNumber(`${prefixMap[newType] || 'DOC'}-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);

    // Auto-fill template content
    // Map types to template keys
    let templateKey = '';
    if (newType === 'PAYMENT_REMINDER') templateKey = 'PAYMENT_REMINDER_SOFT';
    else if (newType === 'COMPLETION_CERTIFICATE') templateKey = 'DELIVERY_CONFIRMATION';
    else if (newType === 'DEMAND_LETTER_FULL') templateKey = 'DEMAND_LETTER_FULL';
    else if (newType === 'DEMAND_LETTER_PARTIAL') templateKey = 'DEMAND_LETTER_PARTIAL';
    else if (newType === 'FINAL_NOTICE') templateKey = 'FINAL_NOTICE';
    else if (newType === 'PAYMENT_RECEIPT') templateKey = 'PAYMENT_RECEIPT_LETTER'; // If used as letter
    // Invoice cover letter is usually separate, but if selected...

    const template = (DOCUMENT_TEMPLATES as any)[templateKey];
    if (template) {
      setSubject(template.subject);
      setTemplateString(template.body);
    } else {
       // Reset if switching back to transaction or unknown
       setTemplateString('');
       if (['INVOICE', 'QUOTATION', 'PURCHASE_ORDER'].includes(newType)) {
          setSubject('');
       }
    }
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxRate = businessSetup?.taxRate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  // Handlers
  const handleImportTransaction = (txn: any) => {
    setDocNumber(txn.id);
    setDate(txn.timestamp.split('T')[0]);

    // Map items
    if (txn.items && txn.items.length > 0) {
      setItems(txn.items.map((item: any) => ({
        id: Math.random().toString(),
        description: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })));
    }

    if (txn.creditCustomer) {
      setClientName(txn.creditCustomer);
    } else {
      setClientName('Cash Customer');
    }

    setShowTransactionSearch(false);
    setSearchTerm('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(i => {
      if (i.id === id) {
        return { ...i, [field]: value };
      }
      return i;
    }));
  };

  const openPreview = (size: 'a4' | 'a5') => {
    setPreviewPaperSize(size);
    setIsPreviewOpen(true);
  };

  const isLetter = DOCUMENT_TYPES.find(t => t.id === docType)?.category === 'letter';

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24">

      {/* Header Area */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
             <LayoutTemplate className="w-6 h-6 text-sky-600" />
             Document Generator
          </h1>
          <p className="text-slate-500 text-sm mt-1">Create Quotes, Invoices, Orders & Legal Notices</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
           <button
             onClick={() => setShowSavedDocs(true)}
             className="flex items-center gap-2 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
           >
             <FolderOpen className="w-4 h-4" /> Open Saved
           </button>
           <button
             onClick={handleSaveDocument}
             disabled={isSavingDoc}
             className="flex items-center gap-2 bg-sky-600 text-white hover:bg-sky-700 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm z-10 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             <Save className="w-4 h-4" /> {isSavingDoc ? 'Saving...' : currentDocId ? 'Update' : 'Save'}
           </button>
           <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1"></div>
           <button
             onClick={() => openPreview('a4')}
             className="flex items-center gap-2 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
           >
             <Eye className="w-4 h-4" /> Preview A4
           </button>
           <button
             onClick={() => openPreview('a5')}
             className="flex items-center gap-2 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
           >
             <Eye className="w-4 h-4" /> Preview A5
           </button>
        </div>
      </div>

      {/* Client Search Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Select Client</h2>
              <button onClick={() => setShowClientModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {creditCustomers.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
                <button
                  key={client.id}
                  onClick={() => {
                    setClientCompany(client.name);
                    setClientEmail(client.email || '');
                    setClientAddress(client.phone || '');
                    setShowClientModal(false);
                  }}
                  className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-50 last:border-0"
                >
                  <div className="font-medium text-slate-800 text-sm">{client.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{client.email} {client.phone && `• ${client.phone}`}</div>
                </button>
              ))}
              {creditCustomers.length === 0 && (
                <div className="text-center p-4 text-sm text-slate-500">No saved clients found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Saved Documents Modal */}
      {showSavedDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <FolderOpen className="w-5 h-5 text-sky-600" /> Saved Documents
                 </h2>
                 <button onClick={() => setShowSavedDocs(false)} className="text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {documents && documents.length > 0 ? (
                    documents.map(doc => (
                       <div key={doc.id} onClick={() => handleLoadDocument(doc)} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center text-sky-600 font-bold text-xs uppercase">
                               {doc.type.substring(0, 3)}
                             </div>
                             <div>
                                <div className="font-medium text-slate-800">{doc.name}</div>
                                <div className="text-xs text-slate-500">{new Date(doc.date).toLocaleDateString()} • {doc.id}</div>
                             </div>
                          </div>
                          <button onClick={(e) => handleDeleteDocument(doc.id, e)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    ))
                 ) : (
                    <div className="text-center py-10 text-slate-400">
                       <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
                       <p>No saved documents found</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <Settings className="w-5 h-5 text-sky-600" /> Default Document Settings
                 </h2>
                 <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 
                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Branding (Set Once & Done)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => fileInputLogoRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors h-32"
                      >
                         {tempSettings.logoImage ? <img src={tempSettings.logoImage} className="w-full h-20 object-contain mb-2" /> : <Upload className="w-6 h-6 text-slate-400 mb-2" />}
                         <div className="text-xs font-medium text-slate-700">Logo Image</div>
                         <input ref={fileInputLogoRef} type="file" className="hidden" onChange={(e) => handleImageUpload(e, (img) => setTempSettings({...tempSettings, logoImage: img}), 'logo')} />
                      </div>
                      
                      <div
                        onClick={() => fileInputBgRef.current?.click()}
                        className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors h-32"
                      >
                         {tempSettings.backgroundImage ? <img src={tempSettings.backgroundImage} className="w-full h-20 object-cover mb-2" /> : <ImageIcon className="w-6 h-6 text-slate-400 mb-2" />}
                         <div className="text-xs font-medium text-slate-700">Watermark / Background</div>
                         <input ref={fileInputBgRef} type="file" className="hidden" onChange={(e) => handleImageUpload(e, (img) => setTempSettings({...tempSettings, backgroundImage: img}))} />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                       <input type="checkbox" checked={tempSettings.showWatermark ?? true} onChange={(e) => setTempSettings({...tempSettings, showWatermark: e.target.checked})} className="rounded text-sky-500 focus:ring-sky-500" />
                       <span className="text-sm text-slate-700">Default to showing Watermark</span>
                    </label>
                 </div>

                 <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Default Texts</h3>
                    
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Default Footer Note</label>
                      <textarea 
                         value={tempSettings.defaultNotes || "This is a computer generated document and doesn't need a stamp or signature for receiving."} 
                         onChange={(e) => setTempSettings({...tempSettings, defaultNotes: e.target.value})} 
                         className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                         rows={2}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Default Payment Info (Bank details, Till number, etc)</label>
                      <textarea 
                         value={tempSettings.defaultPaymentInfo || ''} 
                         onChange={(e) => setTempSettings({...tempSettings, defaultPaymentInfo: e.target.value})} 
                         className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                         rows={3}
                         placeholder={`Bank: Example Bank\nAcc: 123456789`}
                      />
                    </div>
                 </div>
                 
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                 <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                    Cancel
                 </button>
                 <button onClick={async () => {
                      saveDocumentSettings(tempSettings);
                      
                      try {
                        const token = localStorage.getItem('whiz-token');
                        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                        await fetch(`${API_BASE_URL}/api/business/profile`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                           body: JSON.stringify({ settings: JSON.stringify({ documentDefaults: tempSettings }) })
                        });
                        toast.success('Defaults saved permanently to Cloud!');
                      } catch(e) {}

                      setLogoImage(tempSettings.logoImage || null);
                      setBackgroundImage(tempSettings.backgroundImage || null);
                      setShowWatermark(tempSettings.showWatermark ?? true);
                      setNotes(tempSettings.defaultNotes || "This is a computer generated document and doesn't need a stamp or signature for receiving.");
                      setPaymentInfo(tempSettings.defaultPaymentInfo || '');
                      setShowSettingsModal(false);
                   }} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save Defaults
                 </button>
              </div>
           </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: Settings & Branding */}
        <div className="space-y-6">

           {/* Document Type Selector */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Document Type</h3>
              <div className="grid grid-cols-2 gap-2">
                 {DOCUMENT_TYPES.map((type) => {
                    const Icon = type.icon;
                    return (
                    <button
                      key={type.id}
                      onClick={() => handleTypeChange(type.id)}
                      className={cn(
                        "text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2",
                        docType === type.id
                          ? "bg-sky-50 border-sky-500 text-sky-700 shadow-sm ring-1 ring-sky-500/20"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                       <Icon className={cn("w-3.5 h-3.5", docType === type.id ? "text-sky-500" : "text-slate-400")} />
                       {type.label}
                    </button>
                 )})}
              </div>
           </div>

           {/* Settings & Branding */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
               <div className="flex items-center justify-between">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <Settings className="w-4 h-4" /> Branding & Settings
                 </h3>
                 <button
                   onClick={() => {
                     setTempSettings({
                         ...(documentSettings || {}),
                         logoImage: businessSetup?.documentLogoUrl || documentSettings?.logoImage || null,
                         backgroundImage: businessSetup?.watermarkUrl || documentSettings?.backgroundImage || null
                     });
                     setShowSettingsModal(true);
                   }}
                   className="text-xs text-sky-600 hover:text-sky-700 font-medium"
                 >
                   Edit Defaults
                 </button>
               </div>
               
               <div className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50">
                 <div className="text-xs font-medium text-slate-700">Include Watermark</div>
                 <label className="relative inline-flex items-center cursor-pointer">
                   <input type="checkbox" checked={showWatermark} onChange={(e) => {
                     setShowWatermark(e.target.checked);
                     if (e.target.checked && !backgroundImage && documentSettings?.backgroundImage) {
                       setBackgroundImage(documentSettings.backgroundImage);
                     }
                   }} className="sr-only peer" />
                   <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                 </label>
               </div>
           </div>

           {/* Details */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4 relative">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                 <Settings className="w-4 h-4" /> Document Details
               </h3>

               {/* Transaction Lookup */}
               <div className="relative">
                  <label className="text-xs text-slate-500 mb-1 block">Import Transaction</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search ID or Customer..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setShowTransactionSearch(true); }}
                      onFocus={() => setShowTransactionSearch(true)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {showTransactionSearch && searchTerm && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                        {transactions
                          .filter(t => t.id.toLowerCase().includes(searchTerm.toLowerCase()) || (t.creditCustomer || '').toLowerCase().includes(searchTerm.toLowerCase()))
                          .slice(0, 10)
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => handleImportTransaction(t)}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                            >
                               <div className="font-medium text-slate-800 text-xs">{t.creditCustomer || 'Cash Sale'}</div>
                               <div className="flex justify-between text-[10px] text-slate-500">
                                  <span>{t.id}</span>
                                  <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                                  <span className="font-bold text-sky-600">{t.total.toLocaleString()}</span>
                               </div>
                            </button>
                          ))
                        }
                        {transactions.filter(t => t.id.toLowerCase().includes(searchTerm.toLowerCase()) || (t.creditCustomer || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                           <div className="p-3 text-xs text-slate-400 text-center">No transactions found</div>
                        )}
                    </div>
                  )}

                  {showTransactionSearch && (
                    <div className="fixed inset-0 z-10" onClick={() => setShowTransactionSearch(false)}></div>
                  )}
               </div>

               <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Ref Number</label>
                    <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Issue Date</label>
                      <input type="text" placeholder="e.g., 20 Nov 2024" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Due Date</label>
                      <input type="text" placeholder="e.g., Upon Receipt" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                    </div>
                  </div>
               </div>
           </div>

        </div>

        {/* CENTER & RIGHT: Main Content */}
        <div className="lg:col-span-2 space-y-6">

            {/* Client Info */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <User className="w-4 h-4" /> Recipient Details
                 </h3>
                                   <div className="flex items-center gap-2">
                    <button onClick={handleSaveClient} disabled={isSavingClient} title="Save to Address Book" className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save className="w-3 h-3" /> {isSavingClient ? 'Saving...' : 'Save Client'}
                    </button>
                    <button
                      onClick={() => setShowClientModal(true)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 transition-colors"
                    >
                      Select Saved Client...
                    </button>
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="text" placeholder="Company Name" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                  <input type="text" placeholder="Contact Person" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                  <input type="email" placeholder="Email Address" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                  <input type="text" placeholder="Physical Address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
               </div>
            </div>

            {/* CONDITIONAL EDITOR: ITEMS OR TEXT */}
            {!isLetter ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4" /> Line Items
                </h3>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-start p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                       <span className="text-xs text-slate-400 py-2 w-6 text-center">{index + 1}</span>
                       <div className="flex-1 grid grid-cols-12 gap-2">
                          <div className="col-span-6">
                            <input
                              type="text"
                              placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div className="col-span-2">
                             <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:border-sky-500 text-center"
                            />
                          </div>
                          <div className="col-span-3">
                             <input
                                type="number"
                                placeholder="Price"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value))}
                                className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:border-sky-500 text-right"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                             <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <button onClick={addItem} className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 px-3 py-2 rounded-lg hover:bg-sky-50 transition-colors">
                      <Plus className="w-4 h-4" /> Add Line Item
                    </button>
                    <div className="text-right">
                       <div className="text-xs text-slate-500">Total Amount</div>
                       <div className="text-xl font-bold text-slate-800">{total.toLocaleString()}</div>
                    </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                   <FileText className="w-4 h-4" /> Letter Details
                 </h3>

                 <div className="space-y-4">
                    {/* Common Subject Line */}
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Subject Line</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 font-medium"
                      />
                    </div>

                    {/* Specific Fields based on Document Type */}

                    {docType === 'DEMAND_LETTER_PARTIAL' && (
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Total Outstanding</label>
                            <div className="text-sm font-bold text-slate-700 px-3 py-2 bg-slate-100 rounded-lg border border-transparent">
                                {total.toLocaleString()}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Calculated from Line Items (hidden)</p>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Partial Amount Requested</label>
                            <input
                              type="number"
                              value={partialAmount}
                              onChange={(e) => setPartialAmount(parseFloat(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                             <label className="text-xs text-slate-500 mb-1 block">Final Settlement Date</label>
                             <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500" />
                          </div>
                       </div>
                    )}

                    {docType === 'FINAL_NOTICE' && (
                       <div>
                          <label className="text-xs text-slate-500 mb-1 block">Days Notice (Legal Action)</label>
                          <input
                              type="number"
                              value={daysNotice}
                              onChange={(e) => setDaysNotice(parseFloat(e.target.value))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                            />
                       </div>
                    )}

                    {docType === 'PAYMENT_RECEIPT' && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Payment Mode</label>
                           <select
                             value={paymentMode}
                             onChange={(e) => setPaymentMode(e.target.value)}
                             className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                           >
                              <option value="">Select Mode...</option>
                              <option value="Cash">Cash</option>
                              <option value="M-Pesa">M-Pesa</option>
                              <option value="Bank Transfer">Bank Transfer</option>
                              <option value="Cheque">Cheque</option>
                           </select>
                        </div>
                    )}

                    {docType === 'COMPLETION_CERTIFICATE' && (
                        <div>
                           <label className="text-xs text-slate-500 mb-1 block">Project Reference</label>
                           <input
                              type="text"
                              value={projectReference}
                              onChange={(e) => setProjectReference(e.target.value)}
                              placeholder="e.g. Website Development Project"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
                            />
                        </div>
                    )}
                 </div>
              </div>
            )}

            {/* Footer Notes */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Terms / Notes</h3>
                     <textarea
                       value={notes}
                       onChange={(e) => setNotes(e.target.value)}
                       className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 placeholder:text-slate-400 resize-none"
                     />
                  </div>
                  <div>
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Details</h3>
                     <textarea
                       value={paymentInfo}
                       onChange={(e) => setPaymentInfo(e.target.value)}
                       className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-sky-500 placeholder:text-slate-400 resize-none font-mono"
                     />
                  </div>
               </div>
            </div>

        </div>
      </div>

      <DocumentModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type={docType}
        initialPaperSize={previewPaperSize}
        branding={{
          logoImage,
          headerImage,
          backgroundImage,
          useCustomHeader,
                    businessName: businessSetup?.settings?.legalName || businessSetup?.name || 'Your Business',
          address: businessSetup?.settings?.address || businessSetup?.address || '',
          phone: businessSetup?.settings?.phone || businessSetup?.phone || '',
          email: businessSetup?.settings?.email || businessSetup?.email || ''
        }}
        signatory={currentCashier}
        data={{
          docNumber,
          date,
          dueDate,
          clientName,
          clientCompany,
          clientAddress,
          clientEmail,
          items,
          subtotal,
          taxAmount,
          total,
          taxRate,
          notes,
          paymentInfo,
          subject,
          bodyText: templateString,
          partialAmount,
          settlementDate,
          daysNotice,
          paymentMode,
          projectReference
        }}
      />
    </div>
  );
}












