export interface ClosingReportData {
  businessName: string;
  phone?: string;
  address?: string;
  kraPin?: string;
  date: string;
  time: string;
  summary: {
    totalSales: number;
    cashTotal: number;
    mpesaTotal: number;
    creditTotal: number;
    receiptCount: number;
  };
  cashiers: Array<{
    name: string;
    cashTotal: number;
    mpesaTotal: number;
    creditTotal: number;
    totalSales: number;
    count: number;
  }>;
  unpaidTabs: Array<{
    receiptNumber: string;
    customerName: string;
    tableNumber?: string;
    totalAmount: number;
    cashierName?: string;
    createdAt?: string;
  }>;
  unpaidTotal: number;
}

export function printThermalClosingSlip(data: ClosingReportData, cashierFilter?: string) {
  const isIndividual = Boolean(cashierFilter);
  const targetCashier = isIndividual ? data.cashiers.find(c => c.name === cashierFilter) : null;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${isIndividual ? 'Cashier Shift Slip' : 'Daily Closing Report'}</title>
        <meta charset="utf-8" />
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body {
            width: 72mm;
            margin: 0 auto;
            padding: 8px 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
            line-height: 1.35;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .border-b { border-bottom: 1px dashed #000; margin: 6px 0; }
          .border-double { border-bottom: 2px double #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
          .title { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
          .subtitle { font-size: 11px; text-align: center; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px; }
          th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; font-weight: bold; }
          td { padding: 2px 0; }
          .signature-box { margin-top: 24px; font-size: 11px; }
          .signature-line { border-bottom: 1px solid #000; margin-top: 20px; width: 100%; }
        </style>
      </head>
      <body>
        <div class="title">${data.businessName || 'WHIZ POS STORE'}</div>
        ${data.phone ? `<div class="subtitle">TEL: ${data.phone}</div>` : ''}
        ${data.kraPin ? `<div class="subtitle">PIN: ${data.kraPin}</div>` : ''}
        <div class="border-b"></div>
        <div class="title" style="font-size:12px;">${isIndividual ? 'CASHIER SHIFT SLIP' : 'DAILY CLOSING REPORT / Z-SLIP'}</div>
        ${isIndividual ? `<div class="text-center font-bold" style="margin-top:2px;">CASHIER: ${targetCashier?.name || cashierFilter}</div>` : ''}
        <div class="row" style="font-size:10px; margin-top:4px;">
          <span>DATE: ${data.date}</span>
          <span>TIME: ${data.time}</span>
        </div>
        <div class="border-b"></div>

        <div class="font-bold" style="margin-bottom: 4px;">PAID SALES BREAKDOWN</div>
        ${isIndividual && targetCashier ? `
          <div class="row"><span>Cash Sales:</span><span class="font-bold">KES ${(targetCashier.cashTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>M-Pesa Sales:</span><span class="font-bold">KES ${(targetCashier.mpesaTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>Credit Sales:</span><span class="font-bold">KES ${(targetCashier.creditTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>Completed Bills:</span><span>${targetCashier.count || 0}</span></div>
          <div class="border-b"></div>
          <div class="row font-bold" style="font-size:12px;"><span>TOTAL COLLECTED:</span><span>KES ${(targetCashier.totalSales || 0).toLocaleString()}</span></div>
        ` : `
          <div class="row"><span>Cash Sales:</span><span class="font-bold">KES ${(data.summary.cashTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>M-Pesa Sales:</span><span class="font-bold">KES ${(data.summary.mpesaTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>Credit Sales:</span><span class="font-bold">KES ${(data.summary.creditTotal || 0).toLocaleString()}</span></div>
          <div class="row"><span>Total Completed Bills:</span><span>${data.summary.receiptCount || 0}</span></div>
          <div class="border-b"></div>
          <div class="row font-bold" style="font-size:12px;"><span>TOTAL PAID SALES:</span><span>KES ${(data.summary.totalSales || 0).toLocaleString()}</span></div>

          <div class="border-b"></div>
          <div class="font-bold" style="margin-bottom: 4px;">CASHIER SALES MATRIX</div>
          <table>
            <thead>
              <tr><th>Cashier</th><th class="text-right">Txns</th><th class="text-right">Amount</th></tr>
            </thead>
            <tbody>
              ${(data.cashiers || []).map(c => `
                <tr>
                  <td>${c.name}</td>
                  <td class="text-right">${c.count}</td>
                  <td class="text-right font-bold">${c.totalSales.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}

        <div class="border-double"></div>
        <div class="font-bold" style="margin-bottom: 4px;">ACTIVE OPEN TABS / UNPAID BILLS</div>
        ${(data.unpaidTabs || []).length === 0 ? `
          <div style="font-style: italic; color: #444; font-size: 10px;">No open/unpaid tabs pending.</div>
        ` : `
          <table>
            <thead>
              <tr><th>Tab / Ref</th><th>Customer</th><th class="text-right">Amount</th></tr>
            </thead>
            <tbody>
              ${data.unpaidTabs.map(t => `
                <tr>
                  <td>${t.tableNumber ? 'T-' + t.tableNumber : String(t.receiptNumber).slice(-6)}</td>
                  <td>${t.customerName}</td>
                  <td class="text-right font-bold">${t.totalAmount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="border-b"></div>
          <div class="row font-bold"><span>TOTAL UNPAID:</span><span>KES ${(data.unpaidTotal || 0).toLocaleString()}</span></div>
        `}

        <div class="signature-box">
          <div style="margin-bottom: 18px;">
            <div>Cashier Signature:</div>
            <div class="signature-line"></div>
          </div>
          <div>
            <div>Manager Signature:</div>
            <div class="signature-line"></div>
          </div>
        </div>
        <div class="border-b" style="margin-top: 16px;"></div>
        <div class="text-center" style="font-size: 9px; margin-top: 6px;">*** END OF REPORT ***</div>
      </body>
    </html>
  `;

  // Use a hidden iframe to print safely without triggering about:blank window interceptions
  const existingFrame = document.getElementById('thermal-closing-print-frame');
  if (existingFrame) {
    existingFrame.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'thermal-closing-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc || !iframe.contentWindow) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    }
    setTimeout(() => {
      iframe.remove();
    }, 2000);
  }, 250);
}
