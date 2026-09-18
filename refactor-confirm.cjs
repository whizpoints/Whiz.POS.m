const fs = require('fs');
const path = require('path');

function getRelativePath(fromFile, toContextFile) {
    const fromDir = path.dirname(fromFile);
    let rel = path.relative(fromDir, toContextFile).replace(/\\/g, '/');
    if (!rel.startsWith('.')) rel = './' + rel;
    // remove .tsx
    return rel.replace(/\.tsx$/, '');
}

function processFiles(dir, contextPath) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
            processFiles(file, contextPath);
        } else if (file.endsWith('.tsx') && !file.includes('ConfirmContext') && !file.includes('ConfirmModal') && !file.includes('App.tsx')) {
            let content = fs.readFileSync(file, 'utf8');
            if (content.includes('window.confirm(') || content.includes('confirm(')) {
                console.log('Refactoring', file);
                
                // Add import if missing
                if (!content.includes('useConfirm')) {
                    const importPath = getRelativePath(file, contextPath);
                    const importStmt = `import { useConfirm } from '${importPath}';\n`;
                    
                    // Insert after last import
                    const lastImportIndex = content.lastIndexOf('import ');
                    if (lastImportIndex !== -1) {
                        const endOfLastImport = content.indexOf('\n', lastImportIndex);
                        content = content.slice(0, endOfLastImport + 1) + importStmt + content.slice(endOfLastImport + 1);
                    } else {
                        content = importStmt + content;
                    }
                }
                
                // Add const { confirm } = useConfirm(); inside component
                // Find export default function XYZ() { or function XYZ() {
                const funcRegex = /(?:export\s+default\s+)?(?:export\s+)?function\s+[A-Z][a-zA-Z0-9_]*\s*\([^)]*\)\s*\{/g;
                let match;
                while ((match = funcRegex.exec(content)) !== null) {
                    if (!content.includes('const { confirm } = useConfirm()')) {
                        const insertPos = match.index + match[0].length;
                        content = content.slice(0, insertPos) + '\n  const { confirm } = useConfirm();' + content.slice(insertPos);
                    }
                }
                
                // Replace if (!window.confirm('MSG')) return;
                // or if (!confirm('MSG')) return;
                const confirmRegex = /if\s*\(\s*!\s*(?:window\.)?confirm\(\s*(['`"])(.*?)\1\s*\)\s*\)\s*return;/g;
                content = content.replace(confirmRegex, (match, quote, msg) => {
                    const isBacktick = quote === '`';
                    const formattedMsg = isBacktick ? `\`${msg}\`` : `'${msg}'`;
                    return `const confirmed = await confirm({\n      title: 'Confirm Action',\n      message: ${formattedMsg}\n    });\n    if (!confirmed) return;`;
                });
                
                // Replace if (window.confirm('MSG')) {
                const confirmBlockRegex = /if\s*\(\s*(?:window\.)?confirm\(\s*(['`"])(.*?)\1\s*\)\s*\)\s*\{/g;
                content = content.replace(confirmBlockRegex, (match, quote, msg) => {
                    const isBacktick = quote === '`';
                    const formattedMsg = isBacktick ? `\`${msg}\`` : `'${msg}'`;
                    return `const confirmed = await confirm({\n      title: 'Confirm Action',\n      message: ${formattedMsg}\n    });\n    if (confirmed) {`;
                });

                fs.writeFileSync(file, content);
            }
        }
    });
}

processFiles('webportal/src', 'webportal/src/context/ConfirmContext.tsx');
processFiles('local-server/src', 'local-server/src/context/ConfirmContext.tsx');
