const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const qrcode = require('qrcode');

/**
 * Helper function to format a timestamp into a readable date string.
 * Format: YYYY-MM-DD HH:MM AM/PM
 *
 * @param {string|number} timestamp - The date to format.
 * @returns {string} The formatted date string.
 */
const formatDate = (timestamp) => {
    if (!timestamp) return new Date().toLocaleString();
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${year}-${month}-${day} ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Generates the HTML content for a transaction receipt.
 *
 * @param {Transaction} transaction - The transaction details.
 * @param {BusinessSetup} businessSetup - The business configuration.
 * @param {boolean} isReprint - Whether this is a reprint (adds a label).
 * @param {boolean} isCashierCopy - Whether this is a compact cashier duplicate copy.
 * @returns {Promise<string>} The populated HTML string.
 */
async function generateReceipt(transaction, businessSetup, isReprint = false, isCashierCopy = false) {
    const templatePath = app.isPackaged
        ? path.join(app.getAppPath(), 'receipt-template.html')
        : path.join(__dirname, 'receipt-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    const total = transaction.total || 0;
    const subtotal = transaction.subtotal || total;
    const tax = transaction.tax || 0;
    const paymentMethod = transaction.paymentMethod ? transaction.paymentMethod.toUpperCase() : 'CASH';

    // Note: Paper width is now hardcoded to 80mm in receipt-template.html as per user request.
    // Dynamic replacement removed.

    template = template.replace('{{businessName}}', businessSetup?.businessName || 'WHIZ POS');
    template = template.replace('{{location}}', 'Kagwe Town | ' + (businessSetup?.phone || ''));
    template = template.replace('{{address}}', businessSetup?.address || '');
    template = template.replace('{{phone}}', '');
    const receiptLabel = transaction.id + (isReprint ? ' (REPRINT)' : '') + (isCashierCopy ? ' (CASHIER COPY)' : '');
    template = template.replace('{{receiptId}}', receiptLabel);
    template = template.replace('{{date}}', formatDate(transaction.timestamp));

    // Served By - First Name Only
    const cashierName = transaction.cashier || 'Cashier';
    const servedByFirstName = cashierName.split(' ')[0];
    template = template.replace('{{servedBy}}', servedByFirstName);

    let customerName = 'Walk Through Customer';
    if (paymentMethod === 'CREDIT' && transaction.creditCustomer) {
        customerName = transaction.creditCustomer;
    } else if (paymentMethod === 'MPESA' && transaction.mpesaName) {
        customerName = transaction.mpesaName;
    }
    template = template.replace('{{customer}}', customerName);

    template = template.replace('{{paymentMethod}}', paymentMethod);

    let paymentDetailsHtml = '';
    if (paymentMethod === 'CASH' && transaction.amountTendered !== undefined) {
        paymentDetailsHtml = `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
                <span>Amount Tendered:</span>
                <span>Ksh ${parseFloat(transaction.amountTendered).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 2px;">
                <span>Change:</span>
                <span>Ksh ${parseFloat(transaction.change || 0).toFixed(2)}</span>
            </div>
        `;
    } else if (paymentMethod === 'MPESA' && (transaction.mpesaCode || transaction.phoneNumber)) {
        paymentDetailsHtml = `
            <div style="font-size: 11px; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 4px;">
                <div style="font-weight: bold; margin-bottom: 2px; text-align: center;">M-PESA PAYMENT</div>
                ${(transaction.mpesaName || transaction.customerName) ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Customer:</span><span style="font-weight: bold; text-align: right;">${transaction.mpesaName || transaction.customerName}</span></div>` : ''}
                ${transaction.phoneNumber ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Phone:</span><span>${transaction.phoneNumber.replace(/^(\d{4})\d{3}(\d{3})$/, '$1***$2')}</span></div>` : ''}
                ${transaction.mpesaCode ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Ref Code:</span><span style="font-weight: bold;">${transaction.mpesaCode}</span></div>` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Amount:</span><span style="font-weight: bold;">Ksh ${total.toFixed(2)}</span></div>
            </div>
        `;
    }
    template = template.replace('{{paymentDetailsHtml}}', paymentDetailsHtml);

    template = template.replace('{{subtotal}}', `Ksh ${subtotal.toFixed(2)}`);
    // Tax line is removed from template, but keeping replacement just in case user re-adds placeholder or to be safe
    template = template.replace('{{tax}}', `Ksh ${tax.toFixed(2)}`);
    template = template.replace('{{total}}', `Ksh ${total.toFixed(2)}`);

    template = template.replace('{{receiptHeader}}', businessSetup?.receiptHeader || '');

    // Conditionally include footer paragraph only if content exists
    const footerText = businessSetup?.receiptFooter;
    const footerHtml = footerText ? `<p>${footerText}</p>` : '';
    template = template.replace('{{receiptFooter}}', footerHtml);

    // Generate Items HTML (4 Columns: Item, Qty, Price, Total)
    const items = transaction.items || [];
    const itemsHtml = items.map(item => {
        const product = item.product || {};
        // Ensure numeric values with safe parsing, falling back to item.price if product.price is missing
        const price = parseFloat(product.price || item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const lineTotal = price * quantity;

        return `
        <tr>
            <td>${product.name || 'Unknown Item'}</td>
            <td class="qty">${quantity}</td>
            <td class="price">${price.toFixed(2)}</td>
            <td class="total">${lineTotal.toFixed(2)}</td>
        </tr>
    `}).join('');
    template = template.replace('{{itemsHtml}}', itemsHtml);

    // Generate M-Pesa Details HTML if applicable
    let mpesaDetailsHtml = '';
    let details = [];

    if (businessSetup?.mpesaPaybill) {
        details.push(`<p>Paybill No: <b>${businessSetup.mpesaPaybill}</b> | A/C No: <b>${businessSetup.mpesaAccountNumber || 'Business No'}</b></p>`);
    }

    if (businessSetup?.mpesaTill) {
        details.push(`<p style="text-align: center;">Pay By Till : <b>${businessSetup.mpesaTill}</b></p>`);
    }

    if (details.length > 0) {
        mpesaDetailsHtml = `
            <div class="separator"></div>
            <div class="info">
                ${details.join('')}
            </div>
        `;
    }
    template = template.replace('{{mpesaDetails}}', mpesaDetailsHtml);

    // KRA Details Logic
    const kra = transaction.kraDetails || (transaction.kraInvoiceNo ? {
        invoiceNumber: transaction.kraInvoiceNo,
        receiptNumber: transaction.kraInvoiceNo,
        qrCode: transaction.kraQrCode,
        controlCode: transaction.kraSignature,
        date: transaction.date ? new Date(transaction.date).toLocaleString() : new Date().toLocaleString()
    } : null);

    let kraDetailsHtml = '';
    if (kra) {
        let qrCodeHtml = '';
        try {
            const rawQr = kra.qrCode || kra.url || kra.controlCode || kra.receiptNumber || '';
            const qrData = String(rawQr).trim();
            if (qrData.length > 0) {
                const qrDataUrl = await qrcode.toDataURL(qrData, { margin: 1, width: 120 });
                qrCodeHtml = `<img src="${qrDataUrl}" style="width: 100px; height: 100px; margin: 5px auto; display: block;" />`;
            }
        } catch(e) {
            console.error('QR Generate Error (Recovered):', e);
        }
        
        kraDetailsHtml = `
            <div style="text-align: center; margin-top: 10px; font-size: 11px;">
                <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                <div style="font-weight: bold; margin-bottom: 2px;">KRA eTIMS RECEIPT</div>
                ${qrCodeHtml}
                ${kra.invoiceNumber ? `<div>Invoice: ${kra.invoiceNumber}</div>` : ''}
                ${kra.receiptNumber ? `<div>Receipt: ${kra.receiptNumber}</div>` : ''}
                ${kra.date ? `<div>Date: ${kra.date}</div>` : ''}
                ${kra.controlCode ? `<div>Ctrl Code: ${kra.controlCode}</div>` : ''}
                <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
            </div>
        `;
    }
    template = template.replace('{{kraDetails}}', kraDetailsHtml);

    // Developer Footer Logic
    // Default to true if undefined
    const showDevFooter = businessSetup?.showDeveloperFooter !== false;
    let devFooterHtml = '';

    if (showDevFooter) {
        devFooterHtml = `
            <div class="footer-dev">
                <p>System Designed and serviced by Whizpoint Solutions</p>
                <p>Tell: 0740 841 168</p>
            </div>
        `;
    }
    template = template.replace('{{developerFooter}}', devFooterHtml);

    // Apply compact cashier styling when isCashierCopy is true
    if (isCashierCopy) {
        const compactStyles = `
            <style>
                body {
                    font-size: 8.5px !important;
                    line-height: 1.18 !important;
                }
                .container {
                    padding: 2px 0 !important;
                }
                .header h1 {
                    font-size: 13.5px !important;
                    margin-bottom: 1px !important;
                }
                .header p, .info p, .footer p {
                    margin: 1px 0 !important;
                    font-size: 8px !important;
                }
                .separator {
                    margin: 2px 0 !important;
                }
                table {
                    font-size: 8.5px !important;
                }
                th, td {
                    padding: 1px 0 !important;
                }
                .totals .row {
                    margin: 1px 0 !important;
                }
                .totals .total-row {
                    font-size: 11.5px !important;
                    margin-top: 2px !important;
                    padding-top: 2px !important;
                }
                .payment-line {
                    font-size: 8.5px !important;
                }
                .footer {
                    margin-top: 4px !important;
                    font-size: 8px !important;
                }
                .footer-dev {
                    margin-top: 3px !important;
                    font-size: 7.5px !important;
                }
            </style>
        `;
        template = template.replace('</head>', `${compactStyles}</head>`);
        const cashierBanner = `<div style="text-align: center; font-weight: 900; font-size: 11px; letter-spacing: 1px; margin-bottom: 3px; border-bottom: 1px dashed #000; padding-bottom: 2px;">*** CASHIER COPY ***</div>`;
        template = template.replace('<div class="container">', `<div class="container">${cashierBanner}`);

        const cashierSignHtml = `
            <div style="margin-top: 6px; font-size: 8px; border-top: 1px dashed #000; padding-top: 3px; display: flex; justify-content: space-between;">
                <span>Served: ${servedByFirstName}</span>
                <span>Sign: ___________________</span>
            </div>
        `;
        template = template.replace('</body>', `${cashierSignHtml}</body>`);
    }

    return template;
}

/**
 * Generates the HTML content for the daily closing report.
 *
 * @param {ClosingReportData} reportData - The aggregated report data.
 * @param {BusinessSetup} businessSetup - The business configuration.
 * @param {boolean} detailed - Whether to include detailed transactions/expenses.
 * @returns {Promise<string>} The populated HTML string.
 */
async function generateClosingReport(reportData, businessSetup, detailed = true) {
    const templatePath = app.isPackaged
      ? path.join(app.getAppPath(), 'closing-report-template.html')
      : path.join(__dirname, 'closing-report-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // Set dynamic paper width
    const paperWidth = businessSetup?.printerPaperWidth || 80;
    template = template.replace('{{paperWidth}}', paperWidth);

    // Header
    template = template.replace('{{businessName}}', businessSetup?.businessName || '');
    template = template.replace('{{businessAddress}}', businessSetup?.address || '');
    template = template.replace('{{businessPhone}}', businessSetup?.phone || '');
    template = template.replace('{{date}}', new Date(reportData.date).toDateString());

    // Calculate global totals
    let globalCash = 0;
    let globalMpesa = 0;
    let globalCredit = 0;

    // 1. GLOBAL ALL ITEMS SOLD SECTION
    let globalItemsHtml = '';
    if (detailed && reportData.itemSales && reportData.itemSales.length > 0) {
         const globalRows = reportData.itemSales.map(item => `
            <tr>
                <td style="text-align: left; padding: 2px; width: 50%; word-wrap: break-word;">${item.name}</td>
                <td style="text-align: center; padding: 2px; width: 20%;">${item.quantity}</td>
                <td style="text-align: right; padding: 2px; width: 30%;">${item.total.toFixed(2)}</td>
            </tr>
        `).join('');

        globalItemsHtml = `
            <div style="margin-bottom: 5px; border-bottom: 1px dashed #000; padding-bottom: 5px;">
                <h3 style="margin: 0 0 5px 0; font-size: 12px; text-transform: uppercase; text-align: center;">ALL ITEMS SOLD</h3>
                <table style="width: 100%; font-size: 10.5px; margin-bottom: 5px; border-collapse: collapse;">
                    <thead style="border-bottom: 1px dashed #000;">
                        <tr>
                            <th style="text-align: left; width: 50%;">Item</th>
                            <th style="text-align: center; width: 20%;">Qty</th>
                            <th style="text-align: right; width: 30%;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${globalRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 2. CASHIER DETAILED SECTIONS
    const cashierSections = reportData.cashiers ? reportData.cashiers.map(cashier => {
        globalCash += cashier.cashTotal || 0;
        globalMpesa += cashier.mpesaTotal || 0;
        globalCredit += cashier.creditTotal || 0;

        // Items Table for Cashier
        let itemsTableHtml = '';
        if (detailed) {
            const itemsRows = cashier.items.map(item => `
                <tr>
                    <td style="text-align: left; padding: 2px;">${item.name}</td>
                    <td style="text-align: center; padding: 2px;">${item.quantity}</td>
                    <td style="text-align: right; padding: 2px;">${item.total.toFixed(2)}</td>
                </tr>
            `).join('');

            if (cashier.items && cashier.items.length > 0) {
                itemsTableHtml = `
                    <div style="margin-bottom: 5px;">
                        <h4 style="margin: 0 0 2px 0; font-size: 12px; font-weight: bold;">Items Sold:</h4>
                        <table style="width: 100%; font-size: 12px; margin-bottom: 5px; border-collapse: collapse;">
                            <thead style="border-bottom: 1px dashed #000;">
                                <tr>
                                    <th style="text-align: left;">Item</th>
                                    <th style="text-align: center;">Qty</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsRows}
                            </tbody>
                        </table>
                    </div>
                `;
            } else {
                itemsTableHtml = `<p style="font-size: 12px; font-style: italic;">No items sold.</p>`;
            }
        }

        return `
            <div class="cashier-section" style="margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px;">
                <h3 style="margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase;">User: ${cashier.cashierName}</h3>

                ${itemsTableHtml}

                <div class="summary" style="font-size: 12px; background-color: #f0f0f0; padding: 5px; border-radius: 4px;">
                    <h4 style="margin: 0 0 2px 0; font-size: 12px; font-weight: bold; text-decoration: underline;">Payments Summary</h4>
                    <div style="display: flex; justify-content: space-between;"><span>Cash:</span><span>${cashier.cashTotal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>M-Pesa:</span><span>${cashier.mpesaTotal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between;"><span>Credit:</span><span>${cashier.creditTotal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; margin-top: 2px; padding-top: 2px;">
                        <span>Total:</span><span>${cashier.totalSales.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '';

    template = template.replace('{{cashierSections}}', globalItemsHtml + cashierSections);

    // Grand Total Footer
    template = template.replace('{{totalCash}}', `Ksh. ${globalCash.toFixed(2)}`);
    template = template.replace('{{totalMpesa}}', `Ksh. ${globalMpesa.toFixed(2)}`);
    template = template.replace('{{totalCredit}}', `Ksh. ${globalCredit.toFixed(2)}`);
    template = template.replace('{{grandTotal}}', `Ksh. ${(reportData.grandTotal || 0).toFixed(2)}`);

    return template;
}

/**
 * Generates the HTML content for the initial business setup invoice.
 *
 * @param {BusinessSetup} businessSetup - The business configuration.
 * @param {User} adminUser - The admin user details.
 * @returns {Promise<string>} The populated HTML string.
 */
async function generateBusinessSetup(businessSetup, adminUser) {
    const templatePath = app.isPackaged
      ? path.join(app.getAppPath(), 'startup-invoice-template.html')
      : path.join(__dirname, 'startup-invoice-template.html');
    let template = await fs.readFile(templatePath, 'utf-8');

    // Set dynamic paper width
    const paperWidth = businessSetup?.printerPaperWidth || 80;
    template = template.replace('{{paperWidth}}', paperWidth);

    template = template.replace('{{businessName}}', businessSetup?.businessName || '');
    template = template.replace('{{businessAddress}}', businessSetup?.address || '');
    template = template.replace('{{businessPhone}}', businessSetup?.phone || '');
    template = template.replace('{{adminName}}', adminUser?.name || '');
    template = template.replace('{{adminPin}}', adminUser?.pin || '');

    return template;
}

/**
 * Generates the HTML content for a Customer Bill / Proforma (Hospitality/Bar Pay-After-Use).
 * Formatted almost identical to the standard single receipt layout.
 */
async function generateCustomerBill(bill, businessSetup) {
    const items = bill.items || [];
    const itemsRows = items.map(item => {
        const product = item.product || {};
        const price = parseFloat(product.price || item.price) || 0;
        const qty = parseFloat(item.quantity) || 1;
        const total = price * qty;
        return `
            <tr>
                <td style="word-break: break-all; padding: 2px 0;">${product.name || item.name || 'Item'}</td>
                <td style="text-align: center; padding: 2px 0;">${qty}</td>
                <td style="text-align: right; padding: 2px 0;">${price.toFixed(2)}</td>
                <td style="text-align: right; padding: 2px 0;">${total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const cashierName = bill.cashier || 'Cashier';
    const servedByFirstName = cashierName.split(' ')[0];

    // Build Payment Methods for customer payment directly from bill
    let paymentMethodsHtml = '';
    const paymentDetails = [];
    if (businessSetup?.mpesaTill) {
        paymentDetails.push(`<p style="margin: 2px 0; font-size: 11.5px;">BUY GOODS TILL: <b style="font-size: 13.5px; letter-spacing: 0.5px;">${businessSetup.mpesaTill}</b></p>`);
    }
    if (businessSetup?.mpesaPaybill) {
        paymentDetails.push(`<p style="margin: 2px 0; font-size: 10.5px;">PAYBILL: <b style="font-size: 12px;">${businessSetup.mpesaPaybill}</b> | ACC: <b>${businessSetup.mpesaAccountNumber || bill.tableNumber || bill.id}</b></p>`);
    }
    if (paymentDetails.length > 0) {
        paymentMethodsHtml = `
            <div class="separator"></div>
            <div style="text-align: center; font-weight: 900; font-size: 10.5px; margin-bottom: 2px; text-transform: uppercase;">
                --- PAYMENT METHODS ---
            </div>
            <div class="info" style="text-align: center;">
                ${paymentDetails.join('')}
            </div>
        `;
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Customer Bill</title>
        <style>
            @page {
                margin: 0;
                size: 80mm auto;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 10.5px;
                font-weight: bold;
                color: #000;
                margin: 0;
                padding: 0;
                width: 70mm;
                margin-left: 5mm;
            }
            .container {
                padding: 5px 0;
                box-sizing: border-box;
                width: 100%;
            }
            .header {
                text-align: center;
                margin-bottom: 5px;
            }
            .header h1 {
                font-size: 18px;
                margin: 0 0 2px 0;
                text-transform: uppercase;
            }
            .header p {
                margin: 2px 0;
            }
            .separator {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .info {
                margin-bottom: 5px;
            }
            .info p {
                margin: 2px 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }
            th {
                text-align: left;
                border-bottom: 1px dashed #000;
                padding-bottom: 2px;
            }
            td {
                padding: 2px 0;
                vertical-align: top;
                word-wrap: break-word;
            }
            th:nth-child(1), td:nth-child(1) { width: 40%; }
            th:nth-child(2), td:nth-child(2) { width: 15%; text-align: center; }
            th:nth-child(3), td:nth-child(3) { width: 20%; text-align: right; }
            th:nth-child(4), td:nth-child(4) { width: 25%; text-align: right; }
            .totals {
                margin-top: 5px;
            }
            .totals .row {
                display: flex;
                justify-content: space-between;
                margin: 2px 0;
            }
            .totals .total-row {
                font-weight: 900;
                font-size: 14px;
                margin-top: 4px;
                border-top: 1px dashed #000;
                padding-top: 4px;
            }
            .footer {
                text-align: center;
                margin-top: 10px;
                font-size: 11px;
            }
            .footer p {
                margin: 2px 0;
            }
            .footer-dev {
                text-align: center;
                margin-top: 5px;
                font-size: 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${businessSetup?.businessName || 'WHIZ POS'}</h1>
                <p>Kagwe Town | ${businessSetup?.phone || ''}</p>
                ${businessSetup?.address ? `<p>${businessSetup.address}</p>` : ''}
            </div>

            <div class="separator"></div>

            <div style="text-align: center; font-weight: 900; font-size: 13px; letter-spacing: 1px; margin: 3px 0;">
                CUSTOMER BILL
            </div>

            <div class="separator"></div>

            <div class="info">
                <p>Bill #: <b>${bill.id}</b></p>
                <p>Table / Ref: <b>${bill.tableNumber || 'Walk-in'}</b></p>
                ${bill.customerName ? `<p>Customer: <b>${bill.customerName}</b></p>` : '<p>Customer: Walk Through Customer</p>'}
                <p>Date: ${formatDate(bill.createdAt)}</p>
                <p>Served By: ${servedByFirstName}</p>
            </div>

            <div class="separator"></div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">@</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="separator"></div>

            <div class="totals">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>Ksh ${Number(bill.subtotal || 0).toFixed(2)}</span>
                </div>
                ${Number(bill.tax || 0) > 0 ? `
                <div class="row">
                    <span>Tax:</span>
                    <span>Ksh ${Number(bill.tax || 0).toFixed(2)}</span>
                </div>` : ''}
                <div class="row total-row">
                    <span>TOTAL:</span>
                    <span>Ksh ${Number(bill.total || 0).toFixed(2)}</span>
                </div>
            </div>

            ${paymentMethodsHtml}

            <div class="separator"></div>

            <div class="footer">
                <p>Please present this bill when making payment.</p>
                <p>Thank you for your visit!</p>
            </div>

            ${(businessSetup?.showDeveloperFooter !== false) ? `
            <div class="separator"></div>
            <div class="footer-dev">
                <p>System Designed and serviced by Whizpoint Solutions</p>
                <p>Tell: 0740 841 168</p>
            </div>` : ''}
        </div>
    </body>
    </html>
    `;
}

/**
 * Generates the compact Cashier Duplicate Slip (Hospitality/Bar Open Tab record).
 * Almost identical in layout to the customer bill and single receipt, but smaller in font and spacing.
 */
async function generateCashierSlip(bill, businessSetup) {
    const items = bill.items || [];
    const itemsRows = items.map(item => {
        const product = item.product || {};
        const price = parseFloat(product.price || item.price) || 0;
        const qty = parseFloat(item.quantity) || 1;
        const total = price * qty;
        return `
            <tr>
                <td style="word-break: break-all; padding: 1px 0;">${product.name || item.name || 'Item'}</td>
                <td style="text-align: center; padding: 1px 0;">${qty}</td>
                <td style="text-align: right; padding: 1px 0;">${price.toFixed(2)}</td>
                <td style="text-align: right; padding: 1px 0;">${total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const cashierName = bill.cashier || 'Cashier';
    const servedByFirstName = cashierName.split(' ')[0];

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Cashier Copy</title>
        <style>
            @page {
                margin: 0;
                size: 80mm auto;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 8.5px;
                font-weight: bold;
                line-height: 1.18;
                color: #000;
                margin: 0;
                padding: 0;
                width: 70mm;
                margin-left: 5mm;
            }
            .container {
                padding: 2px 0;
                box-sizing: border-box;
                width: 100%;
            }
            .header {
                text-align: center;
                margin-bottom: 3px;
            }
            .header h1 {
                font-size: 13.5px;
                margin: 0 0 1px 0;
                text-transform: uppercase;
            }
            .header p {
                margin: 1px 0;
                font-size: 8px;
            }
            .separator {
                border-top: 1px dashed #000;
                margin: 2px 0;
            }
            .info {
                margin-bottom: 3px;
            }
            .info p {
                margin: 1px 0;
                font-size: 8px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                font-size: 8.5px;
            }
            th {
                text-align: left;
                border-bottom: 1px dashed #000;
                padding-bottom: 1px;
                font-size: 8.5px;
            }
            td {
                padding: 1px 0;
                vertical-align: top;
                word-wrap: break-word;
            }
            th:nth-child(1), td:nth-child(1) { width: 40%; }
            th:nth-child(2), td:nth-child(2) { width: 15%; text-align: center; }
            th:nth-child(3), td:nth-child(3) { width: 20%; text-align: right; }
            th:nth-child(4), td:nth-child(4) { width: 25%; text-align: right; }
            .totals {
                margin-top: 3px;
            }
            .totals .row {
                display: flex;
                justify-content: space-between;
                margin: 1px 0;
                font-size: 8.5px;
            }
            .totals .total-row {
                font-weight: 900;
                font-size: 11.5px;
                margin-top: 2px;
                border-top: 1px dashed #000;
                padding-top: 2px;
            }
            .footer-dev {
                text-align: center;
                margin-top: 3px;
                font-size: 7.5px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div style="text-align: center; font-weight: 900; font-size: 11px; letter-spacing: 1px; margin-bottom: 2px; border-bottom: 1px dashed #000; padding-bottom: 2px;">
                *** CASHIER COPY (OPEN TAB) ***
            </div>

            <div class="header">
                <h1>${businessSetup?.businessName || 'WHIZ POS'}</h1>
                <p>Kagwe Town | ${businessSetup?.phone || ''}</p>
                ${businessSetup?.address ? `<p>${businessSetup.address}</p>` : ''}
            </div>

            <div class="separator"></div>

            <div class="info">
                <p>Bill #: <b>${bill.id}</b></p>
                <p>Table / Ref: <b>${bill.tableNumber || 'Walk-in'}</b></p>
                ${bill.customerName ? `<p>Customer: <b>${bill.customerName}</b></p>` : '<p>Customer: Walk Through Customer</p>'}
                <p>Date: ${formatDate(bill.createdAt)}</p>
                <p>Served By: ${servedByFirstName}</p>
            </div>

            <div class="separator"></div>

            <table>
                <thead>
                    <tr>
                        <th>Item</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">@</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                </tbody>
            </table>

            <div class="separator"></div>

            <div class="totals">
                <div class="row">
                    <span>Subtotal:</span>
                    <span>Ksh ${Number(bill.subtotal || 0).toFixed(2)}</span>
                </div>
                ${Number(bill.tax || 0) > 0 ? `
                <div class="row">
                    <span>Tax:</span>
                    <span>Ksh ${Number(bill.tax || 0).toFixed(2)}</span>
                </div>` : ''}
                <div class="row total-row">
                    <span>TOTAL:</span>
                    <span>Ksh ${Number(bill.total || 0).toFixed(2)}</span>
                </div>
            </div>

            <div class="separator"></div>

            <div style="margin-top: 6px; font-size: 8px; border-top: 1px dashed #000; padding-top: 3px; display: flex; justify-content: space-between;">
                <span>Served: ${servedByFirstName}</span>
                <span>Guest Sign: __________________</span>
            </div>

            ${(businessSetup?.showDeveloperFooter !== false) ? `
            <div class="footer-dev" style="margin-top: 4px;">
                <p>System Designed and serviced by Whizpoint Solutions</p>
            </div>` : ''}
        </div>
    </body>
    </html>
    `;
}

/**
 * Generates the Consolidated End-of-Shift / Continuous Audit Strip.
 */
async function generateShiftAuditStrip(reportData, sales, openBills = [], businessSetup) {
    const paperWidth = businessSetup?.printerPaperWidth || 80;
    
    // Group sales and open bills
    const allSales = Array.isArray(sales) ? sales : [];
    const allBills = Array.isArray(openBills) ? openBills : [];

    // Chronological transaction audit log
    const salesRows = allSales.map(s => {
        const timeStr = new Date(s.timestamp || s.date || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const method = (s.paymentMethod || 'CASH').toUpperCase();
        return `
            <tr>
                <td style="padding: 2px 0;">${timeStr}</td>
                <td style="padding: 2px 0;">${s.id || s.transactionId || ''}</td>
                <td style="padding: 2px 0;">${s.cashier || 'Cashier'}</td>
                <td style="padding: 2px 0;">[PAID-${method}]</td>
                <td style="text-align: right; padding: 2px 0; font-weight: bold;">${Number(s.total || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const openBillRows = allBills.map(b => {
        const timeStr = new Date(b.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
            <tr style="color: #b91c1c;">
                <td style="padding: 2px 0;">${timeStr}</td>
                <td style="padding: 2px 0;">${b.id} (${b.tableNumber})</td>
                <td style="padding: 2px 0;">${b.cashier || 'Cashier'}</td>
                <td style="padding: 2px 0;">[UNPAID-TAB]</td>
                <td style="text-align: right; padding: 2px 0; font-weight: bold;">${Number(b.total || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    const paidTotal = allSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const unpaidTotal = allBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    const cashTotal = allSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'cash').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const mpesaTotal = allSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'mpesa').reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const creditTotal = allSales.filter(s => (s.paymentMethod || '').toLowerCase() === 'credit').reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 0; size: ${paperWidth}mm auto; }
            body {
                font-family: Arial, sans-serif;
                font-size: 10px;
                color: #000;
                margin: 0;
                padding: 4px;
                width: ${paperWidth - 6}mm;
            }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .solid { border-top: 1px solid #000; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="center">
            <h2 style="margin: 0; font-size: 14px; text-transform: uppercase;">${businessSetup?.businessName || 'WHIZ POS'}</h2>
            ${businessSetup?.address ? `<p style="margin: 1px 0; font-size: 9px;">${businessSetup.address}</p>` : ''}
            <div class="dashed"></div>
            <div class="bold" style="font-size: 12px; letter-spacing: 0.5px;">CONSOLIDATED SHIFT AUDIT STRIP</div>
            <div style="font-size: 9px;">End of Shift Audit Log</div>
            <div style="font-size: 9px; margin-top: 2px;">Generated: ${new Date().toLocaleString()}</div>
            <div class="dashed"></div>
        </div>

        <div class="bold" style="font-size: 10px; text-transform: uppercase; margin: 4px 0 2px 0;">Itemized Transaction Audit</div>
        <table>
            <thead>
                <tr style="border-bottom: 1px solid #000; font-weight: bold;">
                    <th style="text-align: left; width: 15%;">Time</th>
                    <th style="text-align: left; width: 25%;">Ref / Tab</th>
                    <th style="text-align: left; width: 20%;">Staff</th>
                    <th style="text-align: left; width: 20%;">Status</th>
                    <th style="text-align: right; width: 20%;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${salesRows || '<tr><td colspan="5" style="text-align:center; padding: 4px;">No paid transactions</td></tr>'}
                ${openBillRows}
            </tbody>
        </table>

        <div class="solid"></div>
        <div class="bold" style="font-size: 11px; text-transform: uppercase; margin: 4px 0 2px 0;">Shift Financial Consolidation</div>
        <div style="font-size: 10px; line-height: 1.5;">
            <div style="display: flex; justify-content: space-between;"><span>Total Sales Count:</span><b>${allSales.length} paid</b></div>
            <div style="display: flex; justify-content: space-between;"><span>Total Paid Volume:</span><b>KSh ${paidTotal.toFixed(2)}</b></div>
            <div style="display: flex; justify-content: space-between; padding-left: 8px;"><span>- Cash Collected:</span><span>KSh ${cashTotal.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; padding-left: 8px;"><span>- M-Pesa Collected:</span><span>KSh ${mpesaTotal.toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between; padding-left: 8px;"><span>- Credit Given:</span><span>KSh ${creditTotal.toFixed(2)}</span></div>
            
            <div class="dashed"></div>
            <div style="display: flex; justify-content: space-between; color: ${allBills.length > 0 ? '#b91c1c' : '#000'};">
                <span>Open / Unpaid Bills (${allBills.length}):</span>
                <b>KSh ${unpaidTotal.toFixed(2)}</b>
            </div>
            
            ${reportData?.openingCash !== undefined ? `
            <div class="dashed"></div>
            <div style="display: flex; justify-content: space-between;"><span>Opening Cash:</span><span>KSh ${Number(reportData.openingCash || 0).toFixed(2)}</span></div>
            <div style="display: flex; justify-content: space-between;"><span>Expected Cash Drawer:</span><b>KSh ${(Number(reportData.openingCash || 0) + cashTotal).toFixed(2)}</b></div>
            ${reportData.actualCash !== undefined ? `<div style="display: flex; justify-content: space-between;"><span>Actual Cash Counted:</span><b>KSh ${Number(reportData.actualCash || 0).toFixed(2)}</b></div>` : ''}
            ` : ''}
        </div>

        <div class="solid"></div>
        <div style="margin-top: 18px; font-size: 9.5px; line-height: 2;">
            <div>Cashier Signature: _______________________</div>
            <div>Manager Signature: _______________________</div>
        </div>
        <div class="center" style="font-size: 8.5px; margin-top: 10px; color: #555;">
            Whiz POS System Shift Reconciliation
        </div>
    </body>
    </html>
    `;
}

/**
 * Generates an individual Cashier End-of-Day / Shift Closing Slip in thermal receipt format.
 * Includes sales breakdown by payment method, total collected, unpaid/open tabs, and sign-off lines.
 */
async function generateCashierSummarySlip(cashierName, cashierStats, unpaidBills = [], businessSetup = {}, selectedDate = '') {
    const dateStr = selectedDate ? new Date(selectedDate).toDateString() : new Date().toDateString();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const cashTotal = Number(cashierStats?.cashTotal || 0);
    const mpesaTotal = Number(cashierStats?.mpesaTotal || 0);
    const creditTotal = Number(cashierStats?.creditTotal || 0);
    const totalSales = Number(cashierStats?.totalSales || (cashTotal + mpesaTotal + creditTotal));
    const txCount = Array.isArray(cashierStats?.transactions) ? cashierStats.transactions.length : (cashierStats?.count || 0);

    // Filter unpaid open tabs for this cashier or shift
    const relevantUnpaid = Array.isArray(unpaidBills) ? unpaidBills.filter(b => {
        if (!cashierName || cashierName.toLowerCase() === 'all') return true;
        const bCashier = (b.cashier || b.createdBy || '').toLowerCase();
        return bCashier.includes(cashierName.toLowerCase());
    }) : [];
    const totalUnpaid = relevantUnpaid.reduce((sum, b) => sum + Number(b.total || 0), 0);

    const unpaidRows = relevantUnpaid.map(b => `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin: 2px 0;">
            <span style="word-break: break-all;">${b.tableNumber || b.id || 'Tab'} (${b.customerName || 'Walk-in'}):</span>
            <b style="white-space: nowrap; margin-left: 4px;">Ksh ${Number(b.total || 0).toFixed(2)}</b>
        </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Cashier End of Day Summary</title>
        <style>
            @page {
                margin: 0;
                size: 80mm auto;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 10.5px;
                font-weight: bold;
                color: #000;
                margin: 0;
                padding: 0;
                width: 70mm;
                margin-left: 5mm;
                box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .left { text-align: left; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .solid { border-top: 2px solid #000; margin: 5px 0; }
            .title { font-size: 12.5px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; margin: 3px 0; text-align: center; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .big-row { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 900; margin-top: 3px; padding-top: 3px; border-top: 1px dashed #000; }
        </style>
    </head>
    <body>
        <div class="center" style="margin-bottom: 3px;">
            <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${businessSetup?.businessName || 'WHIZ POS'}</div>
            <div style="font-size: 10px;">Kagwe Town | ${businessSetup?.phone || ''}</div>
            ${businessSetup?.address ? `<div style="font-size: 9.5px;">${businessSetup.address}</div>` : ''}
        </div>

        <div class="dashed"></div>
        <div class="title">CASHIER END OF DAY SUMMARY</div>
        <div class="dashed"></div>

        <div style="font-size: 10.5px; margin-bottom: 4px;">
            <div class="row"><span>Cashier:</span><b style="font-size: 12px;">${cashierName || 'Staff'}</b></div>
            <div class="row"><span>Date:</span><span>${dateStr}</span></div>
            <div class="row"><span>Printed At:</span><span>${timeStr}</span></div>
            <div class="row"><span>Transactions:</span><span>${txCount} paid</span></div>
        </div>

        <div class="solid"></div>
        <div style="text-align: center; font-size: 10.5px; font-weight: 900; margin: 2px 0;">COLLECTED REVENUE SUMMARY</div>
        <div class="dashed"></div>

        <div class="row"><span>Cash Collected:</span><span>Ksh ${cashTotal.toFixed(2)}</span></div>
        <div class="row"><span>M-Pesa Collected:</span><span>Ksh ${mpesaTotal.toFixed(2)}</span></div>
        <div class="row"><span>Credit Issued:</span><span>Ksh ${creditTotal.toFixed(2)}</span></div>
        
        <div class="big-row">
            <span>TOTAL COLLECTED:</span>
            <span>Ksh ${totalSales.toFixed(2)}</span>
        </div>

        <div class="solid"></div>
        <div style="text-align: center; font-size: 10.5px; font-weight: 900; margin: 2px 0;">UNPAID / OPEN TABS (${relevantUnpaid.length})</div>
        <div class="dashed"></div>

        ${relevantUnpaid.length > 0 ? `
            ${unpaidRows}
            <div class="dashed"></div>
            <div class="row" style="color: #b91c1c; font-weight: 900;">
                <span>Total Unpaid / Outstanding:</span>
                <span>Ksh ${totalUnpaid.toFixed(2)}</span>
            </div>
        ` : `
            <div class="center" style="font-size: 10px; color: #333; padding: 2px 0;">
                No Unpaid Tabs (All Settled)
            </div>
        `}

        <div class="solid"></div>
        <div style="margin-top: 15px; font-size: 9.5px; line-height: 2;">
            <div>Cashier Sign: _________________________</div>
            <div>Manager Sign: _________________________</div>
        </div>

        ${(businessSetup?.showDeveloperFooter !== false) ? `
        <div class="dashed"></div>
        <div class="center" style="font-size: 8.5px; margin-top: 5px;">
            <div>System Designed and serviced by Whizpoint Solutions</div>
            <div>Tell: 0740 841 168</div>
        </div>` : ''}
    </body>
    </html>
    `;
}

module.exports = {
  generateReceipt,
  generateClosingReport,
  generateBusinessSetup,
  generateCustomerBill,
  generateCashierSlip,
  generateShiftAuditStrip,
  generateCashierSummarySlip,
};
