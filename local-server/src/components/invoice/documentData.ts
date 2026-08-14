// Document text templates
export const DOCUMENT_TEMPLATES = {
  DELIVERY_CONFIRMATION: {
    subject: "Work Completion Confirmation",
    body: `Dear WHIZ,

This is to confirm that the services/work assigned under [Project / Invoice Reference] have been completed satisfactorily on [Date].

We acknowledge receipt of the deliverables as agreed.

Kindly proceed with invoicing.`
  },

  INVOICE_COVER_LETTER: {
    subject: "Invoice Submission – Invoice No. [XXX]",
    body: `Dear [Client Name],

Please find attached our invoice [Invoice No.] dated [Date] for the services/goods delivered as per our agreement.

The total payable amount is [Amount], due on or before [Due Date].

Payment details are mentioned on the invoice for your convenience.

We appreciate your prompt cooperation.`
  },

  PAYMENT_REMINDER_SOFT: {
    subject: "Gentle Reminder – Pending Invoice [Invoice No.]",
    body: `Dear [Client Name],

We hope you are doing well.

This is a gentle reminder regarding payment of invoice [Invoice No.] dated [Date] for [Amount], which was due on [Due Date].

If payment has already been made, please ignore this message. Otherwise, we request you to arrange payment at the earliest.

Thank you for your cooperation.`
  },

  DEMAND_LETTER_FULL: {
    subject: "Demand for Immediate Payment – Outstanding Dues",
    body: `Dear [Client Name],

Despite our earlier reminders, we note that payment of [Amount] against invoice(s) [Invoice Nos.] remains outstanding beyond the due date.

We hereby formally demand full payment of the outstanding amount within 7 days from the date of this letter.

Failure to comply may compel us to initiate further recovery action without additional notice.

We hope for an amicable resolution.`
  },

  DEMAND_LETTER_PARTIAL: {
    subject: "Request for Partial Payment – Outstanding Balance",
    body: `Dear [Client Name],

With reference to the outstanding amount of [Total Amount], we request an immediate partial payment of [Partial Amount] on or before [Date], with the remaining balance to be cleared by [Final Date].

This arrangement is proposed to avoid escalation and ensure continuity of our professional relationship.

Kindly confirm acceptance of this payment plan in writing.`
  },

  FINAL_NOTICE: {
    subject: "Final Notice – Payment Default",
    body: `Dear [Client Name],

This is our final notice regarding the unpaid amount of [Amount] pending against your account despite repeated reminders.

If payment is not received within [X days], we shall proceed with legal recovery actions at your risk as to cost and consequences.

We strongly advise immediate settlement.`
  },

  PAYMENT_RECEIPT_LETTER: {
    subject: "Payment Receipt Acknowledgment",
    body: `Dear [Client Name],

We acknowledge receipt of [Amount] on [Date] via [Payment Mode] against invoice [Invoice No.].

Thank you for the payment. We appreciate your business.`
  }
};
