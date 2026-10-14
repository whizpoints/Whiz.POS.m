import re
with open('local-server/server/routes/mpesa.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# For STK Callback
content = re.sub(r'(status:\s*\'UNLINKED\',)', r'\1\n              isEnriched: config.initiatorName && config.initiatorPassword ? 0 : 1,', content)

with open('local-server/server/routes/mpesa.ts', 'w', encoding='utf-8') as f:
    f.write(content)
