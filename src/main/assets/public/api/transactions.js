import { promises as fs } from 'fs';
import { join } from 'path';

const TRANSACTIONS_FILE = join(process.cwd(), 'server/data/transactions.json');

export async function GET() {
  try {
    const data = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
    return new Response(data, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('[]', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const transaction = await request.json();
    
    // Read existing transactions
    let transactions = [];
    try {
      const data = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
      transactions = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty
    }
    
    // Add new transaction
    transactions.push(transaction);
    
    // Write back to file
    await fs.writeFile(TRANSACTIONS_FILE, JSON.stringify(transactions, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save transaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
