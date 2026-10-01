import os

target = "https://api.whizpoint.app"
vite_replacement = "(import.meta.env.PROD ? 'https://pos.whizpoint.app' : 'https://api.whizpoint.app')"
node_replacement = "(process.env.NODE_ENV === 'production' ? 'https://pos.whizpoint.app' : 'https://api.whizpoint.app')"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if target not in content:
        return
        
    print(f"Modifying {filepath}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    new_lines = []
    for line in lines:
        if target in line:
            rep = node_replacement if ('\\server\\' in filepath or '/server/' in filepath) else vite_replacement
            
            # Simple replacements for quoted strings
            line = line.replace("'" + target + "'", rep)
            line = line.replace('"' + target + '"', rep)
            
            # For template literals `${cloudUrl}` already covers it, but if `https://api.whizpoint.app/api/...` is used:
            # We skip placeholders
            
        new_lines.append(line)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

for root, _, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'dist' in root:
        continue
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx') or file.endswith('.js') or file.endswith('.cjs'):
            process_file(os.path.join(root, file))
