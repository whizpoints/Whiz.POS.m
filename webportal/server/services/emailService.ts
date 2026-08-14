import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_SERVER,
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export const sendReceiptEmail = async (toEmail: string, customerName: string, receiptNumber: string, totalAmount: number, receiptUrl: string, businessEmail: string) => {
  const mailOptions = {
    from: `"${process.env.BREVO_FROM_NAME}" <${process.env.BREVO_RECEIPTS_FROM_EMAIL}>`,
    to: toEmail,
    replyTo: businessEmail,
    subject: `Your Receipt #${receiptNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Thank you for your purchase!</h2>
        <p>Hi ${customerName || 'Customer'},</p>
        <p>Your transaction <strong>#${receiptNumber}</strong> was completed successfully.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="font-size: 18px; margin: 0;">Total Amount: <strong>KES ${totalAmount}</strong></p>
        </div>
        <p>You can view and download your full digital receipt here:</p>
        <a href="${receiptUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Receipt</a>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280; text-align: center;">Powered by Whiz POS Cloud</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Receipt email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending receipt email:', error);
    throw error;
  }
};
