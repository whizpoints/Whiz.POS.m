import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

router.post('/mpesa', upload.single('file'), async (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ error: 'Business ID is required' });
    if (!req.file) return res.status(400).json({ error: 'Excel file is required' });

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Extract rows. Safaricom statements usually have headers somewhere in the first 10 rows.
    // xlsx.utils.sheet_to_json gets objects keyed by headers. 
    // We pass range to auto-detect headers, or we can just get an array of arrays and find the header row manually.
    const rawRows = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });
    
    let headerRowIdx = -1;
    let headers: string[] = [];
    
    for (let i = 0; i < Math.min(20, rawRows.length); i++) {
      const row = rawRows[i];
      if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('receipt no'))) {
        headerRowIdx = i;
        headers = row.map(h => String(h || '').trim());
        break;
      }
    }

    if (headerRowIdx === -1) {
      return res.status(400).json({ error: 'Could not detect standard Safaricom header row (missing "Receipt No.")' });
    }

    // Map rows to objects
    const excelData = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i] as any[];
      if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows
      
      const obj: any = {};
      headers.forEach((header, index) => {
        if (header) obj[header] = row[index];
      });
      excelData.push(obj);
    }

    // Normalize Excel Data
    const excelTransactions = excelData.map(row => {
      const receiptNo = row['Receipt No.'] || row['Receipt No'] || '';
      const amountStr = String(row['Paid In'] || row['Amount'] || '0').replace(/,/g, '');
      const amount = parseFloat(amountStr);
      const details = String(row['Details'] || row['Transaction Details'] || '');
      
      // Extract phone from details (usually ends with 12 digits or is just present)
      const phoneMatch = details.match(/\d{9,12}/);
      const fullPhone = phoneMatch ? phoneMatch[0] : '';
      
      return {
        receiptNo: String(receiptNo).trim(),
        amount: isNaN(amount) ? 0 : amount,
        details,
        fullPhone,
        date: row['Completion Time'] || row['Date'] || ''
      };
    }).filter(t => t.receiptNo && t.amount > 0);

    // Fetch Offline POS Transactions for this business
    // Offline transactions are identified by mpesaCode starting with '***'
    const posTransactions = await prisma.receipt.findMany({
      where: {
        businessId,
        paymentMethod: 'mpesa',
        mpesaCode: { startsWith: '***' },
        status: { not: 'REFUNDED' } // We only reconcile pending/completed
      },
      orderBy: { createdAt: 'desc' }
    });

    const matched = [];
    const unmatchedPos = [...posTransactions];
    const unmatchedExcel = [...excelTransactions];

    // Reconciliation Engine
    for (let i = unmatchedExcel.length - 1; i >= 0; i--) {
      const excelTxn = unmatchedExcel[i];
      const excelReceiptEnd = excelTxn.receiptNo.slice(-3).toUpperCase();
      const excelPhoneEnd = excelTxn.fullPhone.slice(-3);

      // Find matching POS transaction
      const posMatchIdx = unmatchedPos.findIndex(posTxn => {
        const posCodeEnd = (posTxn.mpesaCode || '').replace('***', '').toUpperCase().slice(-3);
        const posPhoneEnd = (posTxn.customerPhone || '').replace('***', '').slice(-3);
        
        const isCodeMatch = posCodeEnd === excelReceiptEnd;
        const isPhoneMatch = posPhoneEnd === excelPhoneEnd;
        const isAmountMatch = Number(posTxn.totalAmount) === excelTxn.amount;
        
        return isCodeMatch && isPhoneMatch && isAmountMatch;
      });

      if (posMatchIdx !== -1) {
        // We have a match!
        const matchedPosTxn = unmatchedPos.splice(posMatchIdx, 1)[0];
        unmatchedExcel.splice(i, 1);
        
        matched.push({
          pos: matchedPosTxn,
          excel: excelTxn
        });
      }
    }

    res.json({
      matched,
      unmatchedPos,
      unmatchedExcel,
      summary: {
        totalExcelFound: excelTransactions.length,
        totalPosOfflineFound: posTransactions.length,
        totalMatched: matched.length
      }
    });

  } catch (error: any) {
    console.error('Reconciliation Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
