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
 * @returns {Promise<string>} The populated HTML string.
 */
async function generateReceipt(transaction, businessSetup, isReprint = false) {
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
    template = template.replace('{{receiptId}}', transaction.id + (isReprint ? ' (REPRINT)' : ''));
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
                ${transaction.mpesaName ? `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Name:</span><span style="font-weight: bold; text-align: right;">${transaction.mpesaName}</span></div>` : ''}
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
    let kraDetailsHtml = '';
    if (transaction.kraDetails) {
        let qrCodeHtml = '';
        try {
            const qrData = transaction.kraDetails.qrCode || transaction.kraDetails.url || transaction.kraDetails.controlCode || '';
            if (qrData) {
                const qrDataUrl = await qrcode.toDataURL(qrData);
                qrCodeHtml = `<img src="${qrDataUrl}" style="width: 100px; height: 100px; margin: 5px auto; display: block;" />`;
            }
        } catch(e) {
            console.error('QR Generate Error', e);
        }
        
        kraDetailsHtml = `
            <div style="text-align: center; margin-top: 10px; font-size: 11px;">
                <div style="border-top: 1px dashed #000; margin: 5px 0;"></div>
                <div style="font-weight: bold; margin-bottom: 2px;">KRA RECEIPT</div>
                ${qrCodeHtml}
                ${transaction.kraDetails.invoiceNumber ? `<div>Invoice: ${transaction.kraDetails.invoiceNumber}</div>` : ''}
                ${transaction.kraDetails.receiptNumber ? `<div>Receipt: ${transaction.kraDetails.receiptNumber}</div>` : ''}
                ${transaction.kraDetails.date ? `<div>Date: ${transaction.kraDetails.date}</div>` : ''}
                ${transaction.kraDetails.controlCode ? `<div>Ctrl Code: ${transaction.kraDetails.controlCode}</div>` : ''}
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

module.exports = {
  generateReceipt,
  generateClosingReport,
  generateBusinessSetup,
};
