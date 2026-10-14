import re
with open('webportal/server/routes/mpesa.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# For STK Callback
content = re.sub(r'(phoneNumber:\s*phone\.toString\(\),\s*status:\s*\'UNLINKED\')', r'\1,\n            isEnriched: !(config.initiatorName && config.initiatorPassword)', content)

# For C2B Confirmation
content = re.sub(r'(customerName,\s*status:\s*\'UNLINKED\')', r'\1,\n        isEnriched: !(config.initiatorName && config.initiatorPassword)', content)

# For findMany search
content = content.replace("// isEnriched: true,", "isEnriched: true,")

with open('webportal/server/routes/mpesa.ts', 'w', encoding='utf-8') as f:
    f.write(content)
