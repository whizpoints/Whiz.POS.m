import React, { useState, useRef, useEffect } from 'react';
import { usePosStore, SavedDocument } from '../store/posStore';
import { DatePicker } from '../components/ui/DatePicker';
import {
  FileText, Download, Plus, Trash2, Upload, Image as ImageIcon,
  Settings, User, Calendar, DollarSign, LayoutTemplate,
  Printer, Eye, FileOutput, FileInput, AlertTriangle, Scale, CheckCircle,
  Save, FolderOpen, X, Copy, Search, ChevronRight, Check, Sparkles,
  Layers, ArrowLeft, RefreshCw, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentModal } from '../components/invoice/DocumentModal';
import { DOCUMENT_TEMPLATES } from '../components/invoice/documentData';
import { DocumentType } from '../components/invoice/DocumentPreview';
import { NetworkClient } from '../lib/networkClient';
import toast from 'react-hot-toast';

// Types
interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  unit?: string;
}

const DOCUMENT_TYPES: { id: DocumentType; label: string; icon: any; category: 'transaction' | 'letter'; code: string; color: string }[] = [
  // Transactional
  { id: 'INVOICE', label: 'Invoice', icon: DollarSign, category: 'transaction', code: 'INV', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'QUOTATION', label: 'Quotation', icon: FileInput, category: 'transaction', code: 'QTN', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'PURCHASE_ORDER', label: 'Purchase Order', icon: FileText, category: 'transaction', code: 'PO', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'WORK_ORDER', label: 'Work Order', icon: Settings, category: 'transaction', code: 'WO', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'DELIVERY_NOTE', label: 'Delivery Note', icon: FileOutput, category: 'transaction', code: 'DN', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  // Letters
  { id: 'COMPLETION_CERTIFICATE', label: 'Completion Cert', icon: CheckCircle, category: 'letter', code: 'CC', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'PAYMENT_RECEIPT', label: 'Payment Receipt', icon: CheckCircle, category: 'letter', code: 'RCT', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'PAYMENT_REMINDER', label: 'Payment Reminder', icon: AlertTriangle, category: 'letter', code: 'REM', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'DEMAND_LETTER_FULL', label: 'Demand (Full)', icon: AlertTriangle, category: 'letter', code: 'DMD', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'DEMAND_LETTER_PARTIAL', label: 'Demand (Partial)', icon: AlertTriangle, category: 'letter', code: 'DMD', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'SETTLEMENT_OFFER', label: 'Settlement Offer', icon: Scale, category: 'letter', code: 'SET', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'FINAL_NOTICE', label: 'Final Notice', icon: AlertTriangle, category: 'letter', code: 'FNL', color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'LEGAL_NOTICE', label: 'Legal Notice', icon: Scale, category: 'letter', code: 'LGL', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export default function InvoiceGenerator() {
  const { documentSettings, saveDocumentSettings } = (usePosStore() as any);
  const { businessSetup, transactions, currentCashier, creditCustomers, saveCreditCustomer, documents, saveDocument, deleteDocument } = usePosStore();

  // Document State
  const [docType, setDocType] = useState<DocumentType>('INVOICE');
  const [docTitle, setDocTitle] = useState('Untitled Invoice');
  const [docNumber, setDocNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  // Sidebar & Search State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'invoices' | 'quotes' | 'orders' | 'letters'>('all');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  // Save As Modal
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const [saveAsTitle, setSaveAsTitle] = useState('');

  // Transaction Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showTransactionSearch, setShowTransactionSearch] = useState(false);

  // Letter State
  const [subject, setSubject] = useState('');
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
  const [showWatermark, setShowWatermark] = useState(true);

  // Client State
  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Consulting & Services', quantity: 1, price: 0 }
  ]);

  // Footer State
  const [notes, setNotes] = useState('Thank you for your business! Please remit payment within terms.');
  const [paymentInfo, setPaymentInfo] = useState('');

  // Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPaperSize, setPreviewPaperSize] = useState<'a4' | 'a5'>('a4');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState<any>({});

  // Refs
  const fileInputHeaderRef = useRef<HTMLInputElement>(null);
  const fileInputLogoRef = useRef<HTMLInputElement>(null);
  const fileInputBgRef = useRef<HTMLInputElement>(null);

  // Initialize defaults from store
  useEffect(() => {
    if (businessSetup) {
      if (!paymentInfo && !documentSettings) {
        setPaymentInfo(`Bank: Standard Bank\nAccount: 1234567890\nM-Pesa Till: ${businessSetup.phone || '0700000000'}`);
      }
    }
  }, [businessSetup, paymentInfo, documentSettings]);

  useEffect(() => {
    if (documentSettings && !currentDocId) {
      setLogoImage(documentSettings.logoImage || null);
      setHeaderImage(documentSettings.headerImage || null);
      setUseCustomHeader(documentSettings.useCustomHeader || false);
      setShowWatermark(documentSettings.showWatermark ?? true);
      setBackgroundImage(documentSettings.backgroundImage || null);
      setNotes(documentSettings.defaultNotes || "This is a computer generated document and doesn't need a stamp or signature for receiving.");
      setPaymentInfo(documentSettings.defaultPaymentInfo || '');
    }
  }, [documentSettings, currentDocId]);

  // Fetch remote documents & clients from local server / cloud
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteDocsAndClients = async () => {
      try {
        const docRes = await NetworkClient.fetchApi('/api/saved-documents', { method: 'GET' });
        if (docRes.ok && isMounted) {
          const remoteDocs = await docRes.json();
          if (Array.isArray(remoteDocs)) {
            remoteDocs.forEach((d: any) => {
              let items: any[] = [];
              try { items = typeof d.items === 'string' ? JSON.parse(d.items) : (d.items || []); } catch(e) {}
              let meta: any = {};
              try { meta = typeof d.metadata === 'string' ? JSON.parse(d.metadata) : (d.metadata || {}); } catch(e) {}

              const formattedDoc: SavedDocument = {
                id: String(d.id),
                type: d.type || 'INVOICE',
                name: meta.docNumber || d.customerName || `${d.type} - ${d.id}`,
                date: d.date ? d.date.split('T')[0] : new Date().toISOString().split('T')[0],
                data: {
                  docNumber: meta.docNumber || d.id,
                  docTitle: meta.docNumber || d.customerName || `${d.type} - ${d.id}`,
                  date: d.date ? d.date.split('T')[0] : new Date().toISOString().split('T')[0],
                  dueDate: d.dueDate ? d.dueDate.split('T')[0] : '',
                  clientName: d.customerName,
                  clientEmail: d.customerEmail,
                  clientPhone: d.customerPhone,
                  clientAddress: d.customerAddress,
                  items,
                  subtotal: Number(d.subtotal) || 0,
                  taxRate: businessSetup?.taxRate || 0,
                  taxAmount: Number(d.tax) || 0,
                  total: Number(d.total) || 0,
                  notes: d.notes,
                  status: d.status,
                  ...meta
                }
              };
              saveDocument(formattedDoc);
            });
          }
        }
      } catch (e) {}

      try {
        const clientRes = await NetworkClient.fetchApi('/api/clients', { method: 'GET' });
        if (clientRes.ok && isMounted) {
          const remoteClients = await clientRes.json();
          if (Array.isArray(remoteClients)) {
            remoteClients.forEach((cl: any) => {
              if (cl.name) {
                saveCreditCustomer({
                  id: String(cl.id),
                  name: cl.name,
                  company: cl.name,
                  phone: cl.phone || '',
                  email: cl.email || '',
                  address: cl.address || '',
                  taxId: cl.taxPin || '',
                  totalCredit: 0,
                  paidAmount: 0,
                  balance: 0,
                  transactions: [],
                  createdAt: cl.createdAt || new Date().toISOString(),
                  lastUpdated: cl.updatedAt || new Date().toISOString()
                });
              }
            });
          }
        }
      } catch (e) {}
    };

    fetchRemoteDocsAndClients();
    return () => { isMounted = false; };
  }, [businessSetup?.taxRate]);

  // Reset to brand new blank document
  const handleNewDocument = () => {
    const prefixMap: Record<string, string> = {
      INVOICE: 'INV', QUOTATION: 'QTN', PURCHASE_ORDER: 'PO', WORK_ORDER: 'WO',
      DELIVERY_NOTE: 'DN', COMPLETION_CERTIFICATE: 'CC', PAYMENT_RECEIPT: 'RCT',
      PAYMENT_REMINDER: 'REM', DEMAND_LETTER_FULL: 'DMD', DEMAND_LETTER_PARTIAL: 'DMD',
      SETTLEMENT_OFFER: 'SET', FINAL_NOTICE: 'FNL', LEGAL_NOTICE: 'LGL'
    };
    setCurrentDocId(null);
    setDocTitle('Untitled Document');
    setDocNumber(`${prefixMap[docType] || 'DOC'}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setClientName('');
    setClientCompany('');
    setClientAddress('');
    setClientEmail('');
    setSubject('');
    setTemplateString('');
    setItems([{ id: '1', description: 'Item / Service description', quantity: 1, price: 0 }]);
    toast.success('Started a new document');
  };

  // Save current document
  const handleSaveDocument = () => {
    const titleToUse = docTitle.trim() || clientCompany || clientName || `${docType} - ${docNumber}`;
    const docId = currentDocId || `DOC${Date.now()}`;

    const docData = {
      docNumber,
      docTitle: titleToUse,
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
      projectReference,
      branding: {
        logoImage,
        headerImage,
        backgroundImage: showWatermark ? backgroundImage : null,
        useCustomHeader
      }
    };

    const newDoc: SavedDocument = {
      id: docId,
      type: docType,
      name: titleToUse,
      date: new Date().toISOString(),
      data: docData
    };

    saveDocument(newDoc);
    setCurrentDocId(docId);
    setDocTitle(titleToUse);
    toast.success(`Saved "${titleToUse}"`);

    // Asynchronously push to local-server and cloud
    NetworkClient.fetchApi('/api/saved-documents', {
      method: 'POST',
      body: JSON.stringify({
        id: docId,
        type: docType,
        date,
        dueDate,
        customerName: clientCompany || clientName || 'Walk-in',
        customerEmail: clientEmail,
        customerPhone: '',
        customerAddress: clientAddress,
        items,
        subtotal,
        taxAmount,
        total,
        notes,
        status: 'SAVED',
        docNumber,
        subject,
        bodyText: templateString,
        partialAmount,
        settlementDate,
        daysNotice,
        paymentMode
      })
    }).catch(() => {});
  };

  // Save As a new duplicate document
  const handleSaveAsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newName = saveAsTitle.trim();
    if (!newName) {
      toast.error('Please enter a title for the new document.');
      return;
    }

    const prefixMap: Record<string, string> = {
      INVOICE: 'INV', QUOTATION: 'QTN', PURCHASE_ORDER: 'PO', WORK_ORDER: 'WO',
      DELIVERY_NOTE: 'DN', COMPLETION_CERTIFICATE: 'CC', PAYMENT_RECEIPT: 'RCT',
      PAYMENT_REMINDER: 'REM', DEMAND_LETTER_FULL: 'DMD', DEMAND_LETTER_PARTIAL: 'DMD',
      SETTLEMENT_OFFER: 'SET', FINAL_NOTICE: 'FNL', LEGAL_NOTICE: 'LGL'
    };

    const newDocId = `DOC${Date.now()}`;
    const newDocNumber = `${prefixMap[docType] || 'DOC'}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const docData = {
      docNumber: newDocNumber,
      docTitle: newName,
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
      projectReference,
      branding: {
        logoImage,
        headerImage,
        backgroundImage: showWatermark ? backgroundImage : null,
        useCustomHeader
      }
    };

    const newDoc: SavedDocument = {
      id: newDocId,
      type: docType,
      name: newName,
      date: new Date().toISOString(),
      data: docData
    };

    saveDocument(newDoc);
    setCurrentDocId(newDocId);
    setDocTitle(newName);
    setDocNumber(newDocNumber);
    setIsSaveAsOpen(false);
    setSaveAsTitle('');
    toast.success(`Saved as new copy: "${newName}"`);

    // Asynchronously push to local-server and cloud
    NetworkClient.fetchApi('/api/saved-documents', {
      method: 'POST',
      body: JSON.stringify({
        id: newDocId,
        type: docType,
        date,
        dueDate,
        customerName: clientCompany || clientName || 'Walk-in',
        customerEmail: clientEmail,
        customerPhone: '',
        customerAddress: clientAddress,
        items,
        subtotal,
        taxAmount,
        total,
        notes,
        status: 'SAVED',
        docNumber: newDocNumber,
        subject,
        bodyText: templateString,
        partialAmount,
        settlementDate,
        daysNotice,
        paymentMode
      })
    }).catch(() => {});
  };

  const handleLoadDocument = (doc: SavedDocument) => {
    const d = doc.data;
    setDocType((doc.type as DocumentType) || 'INVOICE');
    setDocTitle(doc.name || d.docTitle || 'Untitled Document');
    setDocNumber(d.docNumber || `DOC-${Date.now().toString().slice(-4)}`);
    setDate(d.date || new Date().toISOString().split('T')[0]);
    setDueDate(d.dueDate || '');
    setClientName(d.clientName || '');
    setClientCompany(d.clientCompany || '');
    setClientAddress(d.clientAddress || '');
    setClientEmail(d.clientEmail || '');
    setItems(d.items || []);
    setNotes(d.notes || '');
    setPaymentInfo(d.paymentInfo || '');
    setSubject(d.subject || '');
    setTemplateString(d.bodyText || '');
    setPartialAmount(d.partialAmount || 0);
    setSettlementDate(d.settlementDate || '');
    setDaysNotice(d.daysNotice || 7);
    setPaymentMode(d.paymentMode || '');
    setProjectReference(d.projectReference || '');

    if (d.branding) {
      setLogoImage(d.branding.logoImage || null);
      setHeaderImage(d.branding.headerImage || null);
      setBackgroundImage(d.branding.backgroundImage || null);
      setShowWatermark(!!d.branding.backgroundImage);
      setUseCustomHeader(d.branding.useCustomHeader || false);
    }

    setCurrentDocId(doc.id);
    toast.success(`Loaded "${doc.name}"`);
  };

  const handleDeleteDocument = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteDocument(id);
      if (currentDocId === id) {
        handleNewDocument();
      }
      NetworkClient.fetchApi(`/api/saved-documents/${id}`, { method: 'DELETE' }).catch(() => {});
      toast.success('Document deleted');
    }
  };

  const handleTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    const prefixMap: Record<string, string> = {
      INVOICE: 'INV', QUOTATION: 'QTN', PURCHASE_ORDER: 'PO', WORK_ORDER: 'WO',
      DELIVERY_NOTE: 'DN', COMPLETION_CERTIFICATE: 'CC', PAYMENT_RECEIPT: 'RCT',
      PAYMENT_REMINDER: 'REM', DEMAND_LETTER_FULL: 'DMD', DEMAND_LETTER_PARTIAL: 'DMD',
      SETTLEMENT_OFFER: 'SET', FINAL_NOTICE: 'FNL', LEGAL_NOTICE: 'LGL'
    };
    setDocNumber(`${prefixMap[newType] || 'DOC'}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);

    let templateKey = '';
    if (newType === 'PAYMENT_REMINDER') templateKey = 'PAYMENT_REMINDER_SOFT';
    else if (newType === 'COMPLETION_CERTIFICATE') templateKey = 'DELIVERY_CONFIRMATION';
    else if (newType === 'DEMAND_LETTER_FULL') templateKey = 'DEMAND_LETTER_FULL';
    else if (newType === 'DEMAND_LETTER_PARTIAL') templateKey = 'DEMAND_LETTER_PARTIAL';
    else if (newType === 'FINAL_NOTICE') templateKey = 'FINAL_NOTICE';
    else if (newType === 'PAYMENT_RECEIPT') templateKey = 'PAYMENT_RECEIPT_LETTER';

    const template = (DOCUMENT_TEMPLATES as any)[templateKey];
    if (template) {
      setSubject(template.subject);
      setTemplateString(template.body);
    }
  };

  const handleSaveClient = () => {
    if (!clientName && !clientCompany) {
      toast.error('Please enter a Client Name or Company Name first.');
      return;
    }
    const newCustomer = {
      id: Date.now().toString(),
      name: clientCompany || clientName,
      company: clientCompany,
      phone: '', 
      email: clientEmail,
      address: clientAddress,
      taxId: '', 
      totalCredit: 0,
      paidAmount: 0,
      balance: 0,
      transactions: [],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    saveCreditCustomer(newCustomer);
    NetworkClient.fetchApi('/api/clients', {
      method: 'POST',
      body: JSON.stringify({
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        address: newCustomer.address
      })
    }).catch(() => {});
    toast.success('Client saved permanently to Address Book!');
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxRate = businessSetup?.taxRate || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const openPreview = (size: 'a4' | 'a5') => {
    setPreviewPaperSize(size);
    setIsPreviewOpen(true);
  };

  const isLetter = DOCUMENT_TYPES.find(t => t.id === docType)?.category === 'letter';

  // Filtered documents for the left sidebar
  const filteredDocuments = (documents || []).filter(doc => {
    const q = sidebarSearch.toLowerCase();
    const matchesSearch = (doc.name || '').toLowerCase().includes(q) ||
                          (doc.type || '').toLowerCase().includes(q) ||
                          (doc.data?.docNumber || '').toLowerCase().includes(q) ||
                          (doc.data?.clientName || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;

    if (libraryFilter === 'invoices') return doc.type === 'INVOICE';
    if (libraryFilter === 'quotes') return doc.type === 'QUOTATION';
    if (libraryFilter === 'orders') return ['PURCHASE_ORDER', 'WORK_ORDER', 'DELIVERY_NOTE'].includes(doc.type);
    if (libraryFilter === 'letters') return ['PAYMENT_REMINDER', 'DEMAND_LETTER_FULL', 'DEMAND_LETTER_PARTIAL', 'SETTLEMENT_OFFER', 'FINAL_NOTICE', 'LEGAL_NOTICE', 'COMPLETION_CERTIFICATE'].includes(doc.type);
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-theme(spacing.24))] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR PANEL: Documents Library                                     */}
      {/* ========================================================================= */}
      <div className={cn(
        "bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-10",
        sidebarOpen ? "w-80 min-w-[320px]" : "w-0 min-w-0 overflow-hidden border-none"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-sky-600" />
            <span className="font-black text-slate-800 text-sm tracking-tight">Documents Library</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Document Button */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={handleNewDocument}
            className="w-full py-2.5 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Blank Document</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Filter library..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
            {(['all', 'invoices', 'quotes', 'orders', 'letters'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLibraryFilter(tab)}
                className={cn(
                  "px-2.5 py-1 rounded-md capitalize font-semibold whitespace-nowrap transition-colors",
                  libraryFilter === tab 
                    ? "bg-slate-800 text-white" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Scrollable List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-25" />
              <p className="text-xs font-bold text-slate-600">No documents found</p>
              <p className="text-[11px] text-slate-400 mt-1">Click "+ New Blank Document" or adjust your filter.</p>
            </div>
          ) : (
            filteredDocuments.map(doc => {
              const isSelected = doc.id === currentDocId;
              const typeMeta = DOCUMENT_TYPES.find(t => t.id === doc.type);
              return (
                <div
                  key={doc.id}
                  onClick={() => handleLoadDocument(doc)}
                  className={cn(
                    "p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between group",
                    isSelected 
                      ? "bg-sky-50 border-sky-400 shadow-sm ring-1 ring-sky-400/30" 
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                  )}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded border mt-0.5",
                      typeMeta?.color || "bg-slate-100 text-slate-700 border-slate-200"
                    )}>
                      {typeMeta?.code || 'DOC'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-800 truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{doc.data?.docNumber || doc.id}</span>
                        <span>•</span>
                        <span>{new Date(doc.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      </div>
                      {doc.data?.total !== undefined && doc.data?.total > 0 && (
                        <div className="text-[11px] font-black text-sky-700 font-mono mt-1">
                          KES {Number(doc.data.total).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteDocument(doc.id, doc.name, e)}
                    className="p-1 text-slate-300 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex justify-between items-center">
          <span>{documents?.length || 0} total saved</span>
          {currentDocId && (
            <span className="text-sky-600 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Active
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN DOCUMENT EDITOR WORKSPACE                                            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Application Toolbar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-600 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Open Document Library"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}

            {/* Document Title (Editable in-place) */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                placeholder="Document Title..."
                className="text-base font-black text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-slate-200 focus:border-sky-500 focus:outline-none transition-all w-64 md:w-80"
              />
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                {docNumber}
              </span>
            </div>
          </div>

          {/* Action Buttons: Save, Save As, Preview, Settings */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDocument}
              className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Save changes to this document"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>

            <button
              onClick={() => {
                setSaveAsTitle(`${docTitle} (Copy)`);
                setIsSaveAsOpen(true);
              }}
              className="flex items-center gap-1.5 bg-white border border-slate-300 hover:border-sky-500 hover:text-sky-600 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
              title="Save a new copy with another name"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Save As...</span>
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1" />

            <button
              onClick={() => openPreview('a4')}
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Preview and Print A4 document"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview A4</span>
            </button>

            <button
              onClick={() => openPreview('a5')}
              className="hidden lg:flex items-center gap-1.5 bg-white border border-slate-200 hover:border-sky-500 hover:text-sky-600 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              title="Preview and Print A5 document"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>A5</span>
            </button>

            <button
              onClick={() => {
                setTempSettings(documentSettings || {});
                setShowSettingsModal(true);
              }}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Branding & Defaults Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Canvas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* Centered Document Sheet (Styled as A4 Paper) */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 md:p-12 space-y-8">
            
            {/* Document Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Document Type
                </label>
                <div className="relative">
                  <select
                    value={docType}
                    onChange={e => handleTypeChange(e.target.value as DocumentType)}
                    className="appearance-none bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-xl px-4 py-2 pr-9 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-sm"
                  >
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>

              {/* Watermark toggle */}
              <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-600">Background Watermark</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={e => setShowWatermark(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>
            </div>

            {/* Business Header Letterhead */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {businessSetup?.businessName || 'WHIZ SOLUTIONS'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{businessSetup?.address || 'Kagwe Town, Kenya'}</p>
                <p className="text-xs text-slate-500">Tel: {businessSetup?.phone || '0740 841 168'}</p>
                {businessSetup?.email && <p className="text-xs text-slate-500">Email: {businessSetup.email}</p>}
              </div>

              {logoImage && (
                <div className="w-24 h-24 p-1 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={logoImage} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>

            {/* Document Meta & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-slate-50/70 rounded-2xl border border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reference #</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={e => setDocNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Issue Date</label>
                <DatePicker value={date} onChange={setDate} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Due Date (Optional)</label>
                <DatePicker value={dueDate} onChange={setDueDate} />
              </div>
            </div>

            {/* Recipient / Client Details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Bill To / Client Details</span>
                </h3>

                <div className="flex items-center gap-2">
                  <select
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:border-sky-500 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        const client = creditCustomers.find(c => c.id === e.target.value);
                        if (client) {
                          setClientName(client.name);
                          setClientCompany(client.company || client.name);
                          setClientEmail(client.email || '');
                          setClientAddress(client.address || '');
                        }
                      }
                    }}
                  >
                    <option value="">Select Saved Client...</option>
                    {creditCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  <button
                    onClick={handleSaveClient}
                    title="Save client to permanent address book"
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save Client</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Company / Organization Name"
                  value={clientCompany}
                  onChange={e => setClientCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                />
                <input
                  type="text"
                  placeholder="Attention / Contact Person"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                />
                <input
                  type="email"
                  placeholder="Client Email Address"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500"
                />
                <input
                  type="text"
                  placeholder="Physical Address / Location"
                  value={clientAddress}
                  onChange={e => setClientAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Document Body: Line Items or Letter Form */}
            {!isLetter ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subject / Project Reference (Optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="e.g. Supply of POS Terminals and Thermal Paper"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  {/* Table Header */}
                  <div className="bg-slate-50 p-3 grid grid-cols-12 gap-2 text-xs font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-1">Unit</div>
                    <div className="col-span-2 text-right">Price (KES)</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <div key={item.id} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/70 transition-colors">
                        <div className="col-span-1 text-center text-xs font-bold text-slate-400">
                          {index + 1}
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            placeholder="Item description..."
                            value={item.description}
                            onChange={e => updateItem(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="text"
                            placeholder="Pcs"
                            value={item.unit || ''}
                            onChange={e => updateItem(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.price}
                            onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-right font-mono font-bold focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Row Button & Totals */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <button
                      onClick={addItem}
                      className="flex items-center gap-2 text-xs font-bold text-sky-600 hover:text-sky-700 px-3 py-2 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Line Item</span>
                    </button>

                    <div className="space-y-1.5 text-right w-full md:w-64">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Subtotal:</span>
                        <span className="font-mono font-semibold">KES {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Tax ({taxRate}%):</span>
                          <span className="font-mono font-semibold">KES {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total:</span>
                        <span className="text-sky-600 font-mono">KES {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Letter / Notice Editor */
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject of the notice or letter..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {docType === 'DEMAND_LETTER_PARTIAL' && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Partial Amount Requested</label>
                      <input
                        type="number"
                        value={partialAmount}
                        onChange={e => setPartialAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Final Settlement Date</label>
                      <input
                        type="date"
                        value={settlementDate}
                        onChange={e => setSettlementDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}

                {docType === 'FINAL_NOTICE' && (
                  <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200">
                    <label className="text-xs font-bold text-rose-800 mb-1 block">Days Notice Before Legal Action</label>
                    <input
                      type="number"
                      value={daysNotice}
                      onChange={e => setDaysNotice(parseFloat(e.target.value) || 7)}
                      className="w-32 px-3 py-2 bg-white border border-rose-300 rounded-lg text-sm font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Letter Body Text
                  </label>
                  <textarea
                    rows={8}
                    value={templateString}
                    onChange={e => setTemplateString(e.target.value)}
                    placeholder="Enter letter contents or notice details..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-sky-500 font-sans leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Notes & Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Terms & Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Details (Bank / Till / Account)</label>
                <textarea
                  value={paymentInfo}
                  onChange={e => setPaymentInfo(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            {/* Signatory Footer Preview */}
            <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
              <div>
                Authorized Signature: <span className="font-bold text-slate-700">{currentCashier?.name || 'Administrator'}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                WHIZ POS Document Generator
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* "SAVE AS" MODAL DIALOG                                                    */}
      {/* ========================================================================= */}
      {isSaveAsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-sm">
                <Copy className="w-4 h-4 text-sky-400" />
                <span>SAVE DOCUMENT AS COPY</span>
              </div>
              <button onClick={() => setIsSaveAsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAsSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  New Document Name / Title
                </label>
                <input
                  autoFocus
                  type="text"
                  required
                  value={saveAsTitle}
                  onChange={e => setSaveAsTitle(e.target.value)}
                  placeholder="e.g. Quotation for Client B"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This will generate a fresh reference number and create a new copy in your library.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveAsOpen(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                >
                  Save Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BRANDING & DEFAULT SETTINGS MODAL                                         */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-600" /> Default Document Settings & Branding
              </h2>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logo & Watermark</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => fileInputLogoRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-32"
                  >
                    {tempSettings.logoImage ? (
                      <img src={tempSettings.logoImage} className="w-full h-20 object-contain mb-1" />
                    ) : (
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    )}
                    <div className="text-xs font-medium text-slate-600">Upload Business Logo</div>
                    <input
                      ref={fileInputLogoRef}
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setTempSettings({ ...tempSettings, logoImage: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  <div
                    onClick={() => fileInputBgRef.current?.click()}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors h-32"
                  >
                    {tempSettings.backgroundImage ? (
                      <img src={tempSettings.backgroundImage} className="w-full h-20 object-cover mb-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                    )}
                    <div className="text-xs font-medium text-slate-600">Upload Watermark</div>
                    <input
                      ref={fileInputBgRef}
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setTempSettings({ ...tempSettings, backgroundImage: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default Footer Text</h3>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Default Footer Note</label>
                  <textarea 
                    value={tempSettings.defaultNotes || "This is a computer generated document and doesn't need a stamp or signature for receiving."} 
                    onChange={e => setTempSettings({ ...tempSettings, defaultNotes: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Default Payment Info (Bank / Till / Paybill)</label>
                  <textarea 
                    value={tempSettings.defaultPaymentInfo || ''} 
                    onChange={e => setTempSettings({ ...tempSettings, defaultPaymentInfo: e.target.value })} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl">
                Cancel
              </button>
              <button
                onClick={() => {
                  saveDocumentSettings(tempSettings);
                  setLogoImage(tempSettings.logoImage || null);
                  setBackgroundImage(tempSettings.backgroundImage || null);
                  setNotes(tempSettings.defaultNotes || notes);
                  setPaymentInfo(tempSettings.defaultPaymentInfo || paymentInfo);
                  setShowSettingsModal(false);
                  toast.success('Default document settings saved');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl"
              >
                Save Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW & PRINT MODAL                                            */}
      {/* ========================================================================= */}
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
          businessName: (businessSetup as any)?.name || businessSetup?.businessName || 'WHIZ POS',
          address: businessSetup?.address || '',
          phone: businessSetup?.phone || '',
          email: businessSetup?.email || ''
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
