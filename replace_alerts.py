import os
import re

files_to_edit = [
    r"src\components\invoice\DocumentModal.tsx",
    r"src\components\BarcodeScanner.tsx",
    r"src\components\BusinessRegistration.tsx",
    r"src\components\CreditCustomerModal.tsx",
    r"src\components\eTIMSManagementPage.tsx",
    r"src\components\FinancialLedgerPage.tsx",
    r"src\components\InventoryManagement.tsx",
    r"src\components\LoyaltyProgram.tsx",
    r"src\components\OfflineSyncStatus.tsx",
    r"src\components\ProcurementPage.tsx",
    r"src\components\SettingsPage.tsx",
    r"src\pages\DeveloperPage.tsx",
    r"src\pages\InvoiceGenerator.tsx"
]

def determine_toast_type(line):
    success_keywords = ['success', 'saved', 'completed', 'coming soon', 'checking for', 'response:']
    line_lower = line.lower()
    for kw in success_keywords:
        if kw in line_lower:
            return 'toast.success'
    return 'toast.error'

for file_path in files_to_edit:
    full_path = os.path.join(r"c:\Users\Josphat Mburu\Documents\codes\Whiz_POS-master", file_path)
    if not os.path.exists(full_path):
        continue
    
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the last import to insert our import after it
    # If no import, insert at top
    import_statement = "import toast from 'react-hot-toast';\n"
    if "import toast from 'react-hot-toast';" in content:
        continue
        
    lines = content.split('\n')
    modified = False
    new_lines = []
    
    in_comment = False
    
    for i, line in enumerate(lines):
        if '// alert(' in line:
            new_lines.append(line)
            continue
            
        if re.search(r'\balert\(', line):
            toast_type = determine_toast_type(line)
            new_line = re.sub(r'\balert\(', f'{toast_type}(', line)
            new_lines.append(new_line)
            modified = True
        else:
            new_lines.append(line)
            
    if modified:
        # Find where to insert import
        insert_idx = 0
        for i, line in enumerate(new_lines):
            if line.startswith('import '):
                insert_idx = i + 1
        
        new_lines.insert(insert_idx, "import toast from 'react-hot-toast';")
        
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        print(f"Modified {file_path}")
