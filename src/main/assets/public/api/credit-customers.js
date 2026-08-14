import { promises as fs } from 'fs';
import { join } from 'path';

const CREDIT_CUSTOMERS_FILE = join(process.cwd(), 'server/data/credit_customers.json');

export async function GET() {
  try {
    const data = await fs.readFile(CREDIT_CUSTOMERS_FILE, 'utf-8');
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
    const customer = await request.json();
    
    // Read existing customers
    let customers = [];
    try {
      const data = await fs.readFile(CREDIT_CUSTOMERS_FILE, 'utf-8');
      customers = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty
    }
    
    // Add new customer
    customers.push(customer);
    
    // Write back to file
    await fs.writeFile(CREDIT_CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save credit customer' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const { customerId, updates } = await request.json();
    
    // Read existing customers
    let customers = [];
    try {
      const data = await fs.readFile(CREDIT_CUSTOMERS_FILE, 'utf-8');
      customers = JSON.parse(data);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Customers file not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update customer
    const customerIndex = customers.findIndex(c => c.id === customerId);
    if (customerIndex === -1) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    customers[customerIndex] = { ...customers[customerIndex], ...updates };
    
    // Write back to file
    await fs.writeFile(CREDIT_CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update credit customer' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
