import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const token = jwt.sign({ businessId: 'fake-id' }, 'fallback_secret');
fetch('http://localhost:3000/api/auth/generate-pairing-code', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
  body: JSON.stringify({ locationId: 'fake-loc' })
}).then(r => r.text()).then(t => console.log('RESPONSE:', t)).catch(e => console.error(e));
