import { promises as fs } from 'fs';
import { join } from 'path';

const EXPENSES_FILE = join(process.cwd(), 'server/data/expenses.json');

export async function GET() {
  try {
    const data = await fs.readFile(EXPENSES_FILE, 'utf-8');
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
    const expense = await request.json();
    
    // Read existing expenses
    let expenses = [];
    try {
      const data = await fs.readFile(EXPENSES_FILE, 'utf-8');
      expenses = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty
    }
    
    // Add new expense
    expenses.push(expense);
    
    // Write back to file
    await fs.writeFile(EXPENSES_FILE, JSON.stringify(expenses, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save expense' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
