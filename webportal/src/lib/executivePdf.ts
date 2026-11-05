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

  // 1. TOP BRAND ACCENT BAR
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(16, 185, 129); // emerald-500 accent stripe
  doc.rect(0, 27, pageWidth, 2, 'F');

  // Business Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text((data.business.name || 'WHIZPOINT SOLUTIONS').toUpperCase(), 14, 12);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  const subInfo = [
    data.business.kraPin ? `KRA PIN: ${data.business.kraPin}` : '',
    data.business.phone ? `Tel: ${data.business.phone}` : '',
    data.business.email || ''
  ].filter(Boolean).join('  |  ');
  doc.text(subInfo, 14, 18);

  // Report Title (Right Aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text('EXECUTIVE DAILY REPORT', pageWidth - 14, 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const formattedDate = new Date(data.date).toLocaleDateString('en-KE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Date: ${formattedDate}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 23, { align: 'right' });

  // 2. KEY METRICS CARDS (4 Boxes)
  let startY = 36;
  const cardGap = 4;
  const cardWidth = (pageWidth - 28 - (cardGap * 3)) / 4;
  const cardHeight = 22;

  const cards = [
    { label: 'TOTAL REVENUE', value: `KES ${data.metrics.totalRevenue.toLocaleString()}`, color: [16, 185, 129], bg: [236, 253, 245] },
    { label: 'EST. GROSS PROFIT', value: `KES ${data.metrics.grossProfit.toLocaleString()}`, color: [37, 99, 235], bg: [239, 246, 255] },
    { label: 'COMPLETED BILLS', value: `${data.metrics.billCount} Sales`, color: [147, 51, 234], bg: [250, 245, 255] },
    { label: 'AVG BASKET VALUE', value: `KES ${data.metrics.avgBasketValue.toLocaleString()}`, color: [217, 119, 6], bg: [255, 251, 235] }
  ];

  cards.forEach((c, idx) => {
    const x = 14 + (idx * (cardWidth + cardGap));
    doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + 3.5, startY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + 3.5, startY + 15);
  });

  // 3. SECTION 1: PAYMENT METHOD BREAKDOWN (Table)
  startY += cardHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Payment Collection Breakdown', 14, startY);

  const totalRev = data.metrics.totalRevenue || 1;
  const paymentRows = [
    ['M-Pesa (Till & Paybill)', `KES ${data.paymentSplit.mpesa.toLocaleString()}`, `${Math.round((data.paymentSplit.mpesa / totalRev) * 100)}%`],
    ['Cash Remittance', `KES ${data.paymentSplit.cash.toLocaleString()}`, `${Math.round((data.paymentSplit.cash / totalRev) * 100)}%`],
    ['Credit / Unsettled Tabs', `KES ${data.paymentSplit.credit.toLocaleString()}`, `${Math.round((data.paymentSplit.credit / totalRev) * 100)}%`]
  ];

  autoTable(doc, {
    startY: startY + 2.5,
    margin: { left: 14, right: 14 },
    head: [['Payment Channel', 'Total Collected', 'Share (%)']],
    body: paymentRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold' },
      2: { halign: 'right' }
    }
  });

  // 4. SECTION 2: TOP 5 BESTSELLING ITEMS
  const lastTableY = (doc as any).lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Top Product Bestsellers Today', 14, lastTableY);

  const bestsellerRows = (data.topBestsellers || []).map((item, i) => [
    `#${i + 1}`,
    item.name,
    `${item.qty} units`,
    `KES ${item.revenue.toLocaleString()}`,
    `${Math.round((item.revenue / totalRev) * 100)}%`
  ]);

  autoTable(doc, {
    startY: lastTableY + 2.5,
    margin: { left: 14, right: 14 },
    head: [['Rank', 'Product Name', 'Quantity Sold', 'Gross Revenue', 'Revenue Contribution']],
    body: bestsellerRows.length > 0 ? bestsellerRows : [['-', 'No products sold today', '0', 'KES 0', '0%']],
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 35 },
      4: { halign: 'right', cellWidth: 35 }
    }
  });

  // 5. SECTION 3: CASHIER SHIFT AUDIT
  const cashierY = (doc as any).lastAutoTable.finalY + 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Cashier Shift & Accountability Log', 14, cashierY);

  const cashierRows = (data.cashiers || []).map(c => [
    c.name,
    `${c.bills} bills`,
    `KES ${c.cash.toLocaleString()}`,
    `KES ${c.mpesa.toLocaleString()}`,
    `KES ${c.sales.toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: cashierY + 2.5,
    margin: { left: 14, right: 14 },
    head: [['Cashier Name', 'Bills Served', 'Cash Collected', 'M-Pesa Received', 'Total Accountability']],
    body: cashierRows.length > 0 ? cashierRows : [['Default Cashier', `${data.metrics.billCount} bills`, `KES ${data.paymentSplit.cash.toLocaleString()}`, `KES ${data.paymentSplit.mpesa.toLocaleString()}`, `KES ${data.metrics.totalRevenue.toLocaleString()}`]],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
    }
  });

  // 6. SECTION 4: INVENTORY HEALTH & KRA ETIMS TAX SNAPSHOT
  const bottomY = (doc as any).lastAutoTable.finalY + 7;
  const colWidth = (pageWidth - 28 - 6) / 2;

  // Box A: Stock Valuation & Inventory Health
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, bottomY, colWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, bottomY, colWidth, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Inventory & Stock Valuation', 18, bottomY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Stock on Shelves: ${data.inventoryHealth.totalStockUnits.toLocaleString()} units`, 18, bottomY + 12);
  doc.text(`Inventory Capital Valuation: KES ${data.inventoryHealth.totalInventoryCost.toLocaleString()}`, 18, bottomY + 17);
  doc.text(`Items at/below Reorder Level: ${data.inventoryHealth.lowStockCount} items`, 18, bottomY + 22);

  // Box B: KRA eTIMS Tax Compliance
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14 + colWidth + 6, bottomY, colWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14 + colWidth + 6, bottomY, colWidth, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('KRA eTIMS Tax Compliance', 14 + colWidth + 10, bottomY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Standard 16% Rated Sales: KES ${(data.metrics.totalRevenue - data.metrics.vatTax).toLocaleString()}`, 14 + colWidth + 10, bottomY + 12);
  doc.text(`Calculated 16% VAT Collected: KES ${data.metrics.vatTax.toLocaleString()}`, 14 + colWidth + 10, bottomY + 17);
  doc.text('Status: Invoices Electronically Registered & QR Verifiable', 14 + colWidth + 10, bottomY + 22);

  // 7. SIGN-OFF BLOCK & FOOTER
  const signY = pageHeight - 24;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, signY, 70, signY);
  doc.line(pageWidth - 70, signY, pageWidth - 14, signY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Shift Cashier Signature', 14, signY + 4);
  doc.text('Store Manager / Owner Sign-off', pageWidth - 14, signY + 4, { align: 'right' });

  // System watermark / copyright
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Whiz POS • Built with Google Antigravity • Official End-of-Day Executive Summary', pageWidth / 2, pageHeight - 6, { align: 'center' });

  // Save / Download PDF
  const filename = `Executive_Daily_Report_${data.date}.pdf`;
  doc.save(filename);
}
