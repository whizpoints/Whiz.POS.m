const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const injection = `
  const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isCer = file.name.endsWith('.cer') || file.name.endsWith('.crt') || file.name.endsWith('.pem');
      if (!isCer) {
        toast.error('Please upload a valid .cer or .pem file');
        return;
      }

      const text = await file.text();
      let certificatePem = text;
      
      if (!text.includes('BEGIN CERTIFICATE')) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        certificatePem = '-----BEGIN CERTIFICATE-----\\n' + (base64.match(/.{1,64}/g)?.join('\\n') || base64) + '\\n-----END CERTIFICATE-----';
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      const res = await fetch(\`\${API_BASE_URL}/api/mpesa/certificate\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, certificatePem })
      });

      if (res.ok) {
        toast.success('Certificate uploaded successfully!');
        setConfig(prev => ({ ...prev, hasCertificate: true }));
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
    e.target.value = '';
  };
`;

code = code.replace(/const handleRegisterC2b = async \(\) => \{/, injection + '\n  const handleRegisterC2b = async () => {');
fs.writeFileSync('src/pages/Settings.tsx', code);
