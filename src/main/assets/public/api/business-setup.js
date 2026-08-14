import { promises as fs } from 'fs';
import { join } from 'path';

const BUSINESS_SETUP_FILE = join(process.cwd(), 'server/data/business-setup.json');

export async function GET() {
  try {
    const data = await fs.readFile(BUSINESS_SETUP_FILE, 'utf-8');
    return new Response(data, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response('null', {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const setup = await request.json();
    
    // Write business setup to file
    await fs.writeFile(BUSINESS_SETUP_FILE, JSON.stringify(setup, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save business setup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
