
export interface EmailPayload {
  tenant: {
    business_name: string;
    business_email: string;
    phone: string;
    logo_url: string;
    primary_color: string;
    address: string;
    payment_instructions?: string;
  };
  recipient: {
    name: string;
    company: string;
    email: string;
  };
  document: {
    type: string;
    number: string;
    reference_number: string;
    issue_date: string;
    due_date: string;
    currency: string;
    subtotal: number;
    tax: number;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    line_items_summary: string;
    public_view_url: string;
  };
}

export function buildTransactionalEmail(payload: EmailPayload): string {
  const { tenant, recipient, document } = payload;
  const brandColor = tenant.primary_color || '#0284C7';
  
  // 1. Determine Status Pill & Contextual Greeting based on Document Type
  let statusText = 'DOCUMENT';
  let statusColor = '#64748B'; // Gray default
  let contextMessage = `Please find attached your ${document.type.replace(/_/g, ' ')}.`;
  let ctaText = 'View Document';

  switch (document.type) {
    case 'QUOTATION':
      statusText = 'PROPOSAL';
      statusColor = '#8B5CF6'; // Purple
      contextMessage = `We are pleased to provide the attached quotation for your review. Please let us know if you have any questions or if you are ready to proceed.`;
      ctaText = 'Review Quotation';
      break;
    case 'STANDARD_INVOICE':
    case 'INVOICE':
      statusText = 'INVOICE';
      statusColor = '#0284C7'; // Blue
      contextMessage = `Thank you for your business. Your invoice is attached. Please arrange for payment by ${document.due_date || 'the due date'}.`;
      ctaText = 'View Invoice';
      break;
    case 'RECURRING_INVOICE':
      statusText = 'SUBSCRIPTION';
      statusColor = '#0284C7'; // Blue
      contextMessage = `Your recurring monthly subscription invoice is ready. This covers your scheduled services and retainer. Thank you for your continued partnership!`;
      ctaText = 'View Subscription Invoice';
      break;
    case 'PAYMENT_RECEIPT':
      statusText = 'PAID';
      statusColor = '#10B981'; // Green
      contextMessage = `Thank you! We have received your payment. Your official receipt is attached for your records.`;
      ctaText = 'View Receipt';
      break;
    case 'PAYMENT_REMINDER':
      statusText = 'REMINDER';
      statusColor = '#F59E0B'; // Amber
      contextMessage = `This is a friendly reminder that your invoice is due soon. Please review the attached document and arrange for settlement.`;
      ctaText = 'View Invoice';
      break;
    case 'DEMAND_LETTER_FULL':
    case 'DEMAND_LETTER_PARTIAL':
    case 'FINAL_NOTICE':
      statusText = 'OVERDUE';
      statusColor = '#EF4444'; // Red
      contextMessage = `This is an urgent notice regarding your outstanding balance. Immediate action is required to settle the attached account.`;
      ctaText = 'View Statement';
      break;
    case 'DELIVERY_NOTE':
      statusText = 'DISPATCHED';
      statusColor = '#14B8A6'; // Teal
      contextMessage = `Your order has been dispatched! Please find the attached delivery note detailing the items included in this shipment.`;
      ctaText = 'View Delivery Note';
      break;
    case 'PURCHASE_ORDER':
      statusText = 'PURCHASE ORDER';
      statusColor = '#3B82F6'; // Blue
      contextMessage = `Please find our official Purchase Order attached. Kindly confirm receipt and provide an estimated delivery schedule.`;
      ctaText = 'View Purchase Order';
      break;
  }

  // Format money safely
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: document.currency }).format(amount);
  };

  const logoHtml = tenant.logo_url 
    ? `<img src="${tenant.logo_url}" alt="${tenant.business_name}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />`
    : `<h2 style="margin: 0; color: ${brandColor}; font-size: 24px; font-weight: bold;">${tenant.business_name}</h2>`;

  // HTML Structure
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F1F5F9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; }
    .header { padding: 30px; text-align: center; border-bottom: 4px solid ${brandColor}; background: #ffffff; }
    .content { padding: 40px 30px; color: #334155; }
    .pill { display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: white; border-radius: 99px; font-size: 12px; font-weight: bold; letter-spacing: 1px; margin-bottom: 20px; }
    .greeting { font-size: 18px; font-weight: bold; color: #0F172A; margin-bottom: 10px; }
    .summary { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 30px; }
    
    .data-card { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .data-row { display: table; width: 100%; margin-bottom: 12px; }
    .data-label { display: table-cell; width: 40%; color: #64748B; font-size: 13px; font-weight: bold; text-transform: uppercase; }
    .data-value { display: table-cell; width: 60%; color: #0F172A; font-size: 14px; font-weight: 500; text-align: right; }
    .data-total { display: table-cell; width: 60%; color: ${brandColor}; font-size: 24px; font-weight: 900; text-align: right; }
    .divider { border-bottom: 1px dashed #CBD5E1; margin: 15px 0; }
    
    .cta-container { text-align: center; margin: 35px 0; }
    .cta-button { background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; }
    
    .payment-instructions { background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 8px; padding: 15px; font-size: 13px; color: #92400E; margin-bottom: 30px; line-height: 1.5; }
    
    .footer { background-color: #F8FAFC; padding: 30px; text-align: center; color: #94A3B8; font-size: 12px; line-height: 1.5; }
    .footer strong { color: #64748B; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoHtml}
    </div>
    
    <div class="content">
      <span class="pill">${statusText}</span>
      
      <div class="greeting">
        Hello ${recipient.name || recipient.company || 'Customer'},
      </div>
      
      <div class="summary">
        ${contextMessage}
      </div>
      
      <div class="data-card">
        <div class="data-row">
          <span class="data-label">Document No.</span>
          <span class="data-value">${document.number}</span>
        </div>
        ${document.issue_date ? `<div class="data-row">
          <span class="data-label">Issue Date</span>
          <span class="data-value">${document.issue_date}</span>
        </div>` : ''}
        ${document.due_date ? `<div class="data-row">
          <span class="data-label">Due Date</span>
          <span class="data-value">${document.due_date}</span>
        </div>` : ''}
        ${document.reference_number ? `<div class="data-row">
          <span class="data-label">Reference</span>
          <span class="data-value">${document.reference_number}</span>
        </div>` : ''}
        
        <div class="divider"></div>
        
        <div class="data-row">
          <span class="data-label">Description</span>
          <span class="data-value">${document.line_items_summary}</span>
        </div>
        
        <div class="divider"></div>
        
        <div class="data-row">
          <span class="data-label" style="vertical-align: middle;">Total Amount</span>
          <span class="data-total">${formatMoney(document.total_amount)}</span>
        </div>
      </div>
      
      ${tenant.payment_instructions && document.total_amount > 0 && !['QUOTATION', 'PURCHASE_ORDER', 'DELIVERY_NOTE'].includes(document.type) ? `
      <div class="payment-instructions">
        <strong>Payment Instructions:</strong><br/>
        ${tenant.payment_instructions.replace(/\n/g, '<br/>')}
      </div>
      ` : ''}
      
      ${document.public_view_url ? `
      <div class="cta-container">
        <a href="${document.public_view_url}" class="cta-button">${ctaText}</a>
      </div>
      ` : ''}
      
    </div>
    
    <div class="footer">
      <strong>${tenant.business_name}</strong><br/>
      ${tenant.address ? `${tenant.address}<br/>` : ''}
      ${tenant.phone ? `${tenant.phone} | ` : ''}${tenant.business_email}<br/><br/>
      <em>This is an automated transactional message. Please do not reply directly to this email unless necessary.</em>
    </div>
  </div>
</body>
</html>
  `.trim();
}
