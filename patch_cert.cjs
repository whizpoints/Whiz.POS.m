const fs = require('fs');
['webportal', 'local-server'].forEach(folder => {
    let pathStr = folder + '/server/utils/crypto.ts';
    let content = fs.readFileSync(pathStr, 'utf8');

    const replacement = `    if (!cachedCertificate) {
        try {
            const certPath = path.join(process.cwd(), 'server', 'utils', 'ProductionCertificate.cer');
            let certString = fs.readFileSync(certPath, 'utf8');
            if (!certString.includes('BEGIN CERTIFICATE')) {
                const buffer = fs.readFileSync(certPath);
                certString = '\\n-----BEGIN CERTIFICATE-----\\n' + buffer.toString('base64').match(/.{1,64}/g)?.join('\\n') + '\\n-----END CERTIFICATE-----\\n';
            }
            cachedCertificate = certString;
        } catch (err) {
            console.error('Error reading Safaricom certificate from disk:', err);
        }
    }`;

    content = content.replace(/if \(\!cachedCertificate\) \{[\s\S]*?catch \(err\) \{[\s\S]*?console\.error\('Error fetching Safaricom certificate:', err\);\s*\}\s*\}/, replacement);

    if (!content.includes('import fs')) content = 'import fs from "fs";\n' + content;
    if (!content.includes('import path')) content = 'import path from "path";\n' + content;

    fs.writeFileSync(pathStr, content, 'utf8');
});
