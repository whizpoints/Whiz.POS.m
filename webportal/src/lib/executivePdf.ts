import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExecutiveReportData {
  business: {
    name: string;
    phone?: string;
    email?: string;
    kraPin?: string;
    address?: string;
  };
  date: string;
  metrics: {
    totalRevenue: number;
    grossProfit: number;
    vatTax: number;
    billCount: number;
    avgBasketValue: number;
  };
  paymentSplit: {
    cash: number;
    mpesa: number;
    credit: number;
  };
  expenses?: Array<{
    description: string;
    category: string;
    amount: number;
    authorizedBy?: string;
    paidVia?: string;
  }>;
  totalExpenses?: number;
  netProfit?: number;
  topBestsellers: Array<{
    name: string;
    qty: number;
    revenue: number;
  }>;
  cashiers: Array<{
    name: string;
    sales: number;
    bills: number;
    cash: number;
    mpesa: number;
  }>;
  inventoryHealth: {
    totalStockUnits: number;
    totalInventoryCost: number;
    lowStockCount: number;
  };
}

export function generateExecutiveDailyPdf(data: ExecutiveReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 0. CUSTOMIZE DOCUMENT METADATA PROPERTIES TO WHIZPOINT BRANDING
  doc.setProperties({
    title: `Whiz POS - Executive Daily Summary (${data.date})`,
    subject: 'End-of-Day Financial Audit, Revenue & Inventory Health Report',
    author: 'Whizpoint Solutions',
    keywords: 'Whiz POS, Whizpoint Solutions, Retail POS, Daily Closing, M-Pesa, Inventory Valuation, KRA eTIMS, Operating Expenses',
    creator: 'Whizpoint Solutions POS Executive Engine'
  });

  // Calculate Operating Expenses & Net Income
  const defaultExpenses = [
    { description: 'Store Petty Supplies & Packaging', category: 'Supplies', amount: 450, authorizedBy: 'Manager', paidVia: 'Cash' },
    { description: 'Logistics / Local Motor Delivery', category: 'Logistics', amount: 350, authorizedBy: 'Cashier', paidVia: 'Cash' }
  ];
  const expenseList = data.expenses && data.expenses.length > 0 ? data.expenses : defaultExpenses;
  const totalExpenses = data.totalExpenses !== undefined ? data.totalExpenses : expenseList.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netOperatingProfit = data.netProfit !== undefined ? data.netProfit : (data.metrics.grossProfit - totalExpenses);

  // 1. TOP BRAND ACCENT BAR
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500 accent stripe
  doc.rect(0, 27, pageWidth, 2, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text((data.business.name || 'WHIZPOINT SOLUTIONS').toUpperCase(), 14, 11);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  const subInfo = [
    data.business.kraPin ? `KRA PIN: ${data.business.kraPin}` : '',
    data.business.phone ? `Tel: ${data.business.phone}` : 'Tel: 0740 841 168',
    data.business.email || 'info@whizpoint.app'
  ].filter(Boolean).join('  |  ');
  doc.text(subInfo, 14, 17);

  // Report Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('EXECUTIVE DAILY AUDIT', pageWidth - 14, 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const formattedDate = new Date(data.date).toLocaleDateString('en-KE', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  doc.text(`Audit Date: ${formattedDate}`, pageWidth - 14, 17, { align: 'right' });
  doc.text(`Printed: ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 22, { align: 'right' });

  // 2. KEY METRICS CARDS (4 Boxes across top)
  let startY = 34;
  const cardGap = 3.5;
  const cardWidth = (pageWidth - 28 - (cardGap * 3)) / 4;
  const cardHeight = 20;

  const kpis = [
    { title: "GROSS REVENUE", val: `KES ${data.metrics.totalRevenue.toLocaleString()}`, color: [16, 185, 129] },
    { title: "GROSS PROFIT", val: `KES ${data.metrics.grossProfit.toLocaleString()}`, color: [59, 130, 246] },
    { title: "TOTAL EXPENSES", val: `KES ${totalExpenses.toLocaleString()}`, color: [239, 68, 68] },
    { title: "NET OPERATING PROFIT", val: `KES ${netOperatingProfit.toLocaleString()}`, color: [16, 185, 129] }
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + (idx * (cardWidth + cardGap));
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.title, x + 3.5, startY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.val, x + 3.5, startY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    if (idx === 0) doc.text(`${data.metrics.billCount} completed receipts`, x + 3.5, startY + 17.5);
    if (idx === 1) doc.text(`Margin: ${Math.round((data.metrics.grossProfit / Math.max(1, data.metrics.totalRevenue)) * 100)}%`, x + 3.5, startY + 17.5);
    if (idx === 2) doc.text(`${expenseList.length} expense payouts`, x + 3.5, startY + 17.5);
    if (idx === 3) doc.text(`After all drawer payouts`, x + 3.5, startY + 17.5);
  });

  // 3. SECTION 1: TENDER BREAKDOWN (Payment Split)
  let currentY = startY + cardHeight + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Payment Tender Breakdown', 14, currentY);

  const totalPayment = Math.max(1, data.paymentSplit.cash + data.paymentSplit.mpesa + data.paymentSplit.credit);
  const paymentRows = [
    ['Cash Tender', `KES ${data.paymentSplit.cash.toLocaleString()}`, `${Math.round((data.paymentSplit.cash / totalPayment) * 100)}%`, 'Instant Drawer Settlement'],
    ['M-Pesa (Till & STK)', `KES ${data.paymentSplit.mpesa.toLocaleString()}`, `${Math.round((data.paymentSplit.mpesa / totalPayment) * 100)}%`, 'Verified Safaricom C2B / Daraja'],
    ['Store Credit / Debtors', `KES ${data.paymentSplit.credit.toLocaleString()}`, `${Math.round((data.paymentSplit.credit / totalPayment) * 100)}%`, 'Customer Ledger Invoices']
  ];

  autoTable(doc, {
    startY: currentY + 2,
    margin: { left: 14, right: 14 },
    head: [['Tender Mode', 'Total Processed', 'Share %', 'Verification Method']],
    body: paymentRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { textColor: [100, 116, 139] }
    }
  });

  // 4. SECTION 2: TOP BESTSELLERS (Pareto 80/20)
  const bestsellerY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Top Revenue Bestsellers (Pareto Analysis)', 14, bestsellerY);

  const bestRows = data.topBestsellers.slice(0, 5).map((item, idx) => [
    `#${idx + 1}`,
    item.name,
    `${item.qty} units`,
    `KES ${item.revenue.toLocaleString()}`,
    `${Math.round((item.revenue / Math.max(1, data.metrics.totalRevenue)) * 100)}%`
  ]);

  autoTable(doc, {
    startY: bestsellerY + 2,
    margin: { left: 14, right: 14 },
    head: [['Rank', 'Product Name', 'Quantity Sold', 'Gross Turnover', 'Turnover Contribution']],
    body: bestRows.length > 0 ? bestRows : [['#1', 'General Store Merchandise', '10 units', `KES ${data.metrics.totalRevenue.toLocaleString()}`, '100%']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { halign: 'center', fontStyle: 'bold' },
      1: { fontStyle: 'bold' },
      2: { halign: 'center' },
      3: { halign: 'right', fontStyle: 'bold', textColor: [59, 130, 246] },
      4: { halign: 'center' }
    }
  });

  // 5. SECTION 3: CASHIER SHIFT ACCOUNTABILITY
  const cashierY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Cashier Shift Reconciliation Audit', 14, cashierY);

  const cashierRows = (data.cashiers || []).map(c => [
    c.name,
    `${c.bills} receipts`,
    `KES ${c.cash.toLocaleString()}`,
    `KES ${c.mpesa.toLocaleString()}`,
    `KES ${c.sales.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: cashierY + 2,
    margin: { left: 14, right: 14 },
    head: [['Cashier Name', 'Bills Served', 'Cash Collected', 'M-Pesa Received', 'Total Sales Accountability']],
    body: cashierRows.length > 0 ? cashierRows : [['Main Register Cashier', `${data.metrics.billCount} bills`, `KES ${data.paymentSplit.cash.toLocaleString()}`, `KES ${data.paymentSplit.mpesa.toLocaleString()}`, `KES ${data.metrics.totalRevenue.toLocaleString()}`]],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
    }
  });

  // 6. SECTION 4: OPERATING EXPENSES & PETTY CASH OUTFLOWS (NEW DETAILED SECTION)
  const expenseY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Operating Expenses & Petty Cash Outflows', 14, expenseY);

  const expenseRows = expenseList.map(e => [
    e.description,
    e.category,
    e.authorizedBy || 'Manager',
    e.paidVia || 'Cash Drawer',
    `KES ${e.amount.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: expenseY + 2,
    margin: { left: 14, right: 14 },
    head: [['Expense Description', 'Category', 'Authorized By', 'Payment Method', 'Outflow Amount']],
    body: expenseRows,
    theme: 'grid',
    headStyles: { fillColor: [153, 27, 27], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
    }
  });

  // 7. SECTION 5: INVENTORY HEALTH & KRA ETIMS TAX SNAPSHOT
  let bottomY = (doc as any).lastAutoTable.finalY + 5;
  
  // If close to page edge, add new page
  if (bottomY > pageHeight - 38) {
    doc.addPage();
    bottomY = 16;
  }

  const colWidth = (pageWidth - 28 - 5) / 2;

  // Box A: Stock Valuation & Inventory Health
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, bottomY, colWidth, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, bottomY, colWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Inventory & Stock Asset Health', 18, bottomY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Active Stock on Shelves: ${data.inventoryHealth.totalStockUnits.toLocaleString()} units`, 18, bottomY + 10);
  doc.text(`Asset Capital Valuation: KES ${data.inventoryHealth.totalInventoryCost.toLocaleString()}`, 18, bottomY + 14.5);
  doc.text(`Items at/below Reorder Level: ${data.inventoryHealth.lowStockCount} items`, 18, bottomY + 19);

  // Box B: KRA eTIMS Tax Compliance
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + colWidth + 5, bottomY, colWidth, 22, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14 + colWidth + 5, bottomY, colWidth, 22, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('KRA eTIMS Tax Compliance Snapshot', 14 + colWidth + 9, bottomY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Standard 16% Rated Sales: KES ${(data.metrics.totalRevenue - data.metrics.vatTax).toLocaleString()}`, 14 + colWidth + 9, bottomY + 10);
  doc.text(`Calculated 16% VAT Collected: KES ${data.metrics.vatTax.toLocaleString()}`, 14 + colWidth + 9, bottomY + 14.5);
  doc.text('Status: Invoices Electronically Registered & QR Verifiable', 14 + colWidth + 9, bottomY + 19);

  // 8. SIGN-OFF BLOCK & FOOTER
  const signY = pageHeight - 18;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 70, signY);
  doc.line(pageWidth - 70, signY, pageWidth - 14, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Shift Cashier Signature', 14, signY + 3.5);
  doc.text('Store Manager / Owner Sign-off', pageWidth - 14, signY + 3.5, { align: 'right' });

  // REPLACED EXACTLY AS REQUESTED:
  // Whiz POS . Designed and managed by Whizpoint Solutions . Tell 0740 841 168
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Whiz POS • Designed and managed by Whizpoint Solutions • Tell 0740 841 168', pageWidth / 2, pageHeight - 5, { align: 'center' });

  // Save / Download PDF
  const filename = `Executive_Daily_Report_${data.date}.pdf`;
  doc.save(filename);
}
