import { promises as fs } from 'fs';
import { join } from 'path';

const USERS_FILE = join(process.cwd(), 'server/data/users.json');

export async function GET() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
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
    const user = await request.json();
    
    // Read existing users
    let users = [];
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      users = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty
    }
    
    // Add new user
    users.push(user);
    
    // Write back to file
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function PUT(request) {
  try {
    const { userId, updates } = await request.json();
    
    // Read existing users
    let users = [];
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      users = JSON.parse(data);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Users file not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update user
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    users[userIndex] = { ...users[userIndex], ...updates };
    
    // Write back to file
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
