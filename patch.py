import re

with open('webportal/server/routes/mpesa.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace in STK Callback (create block)
stk_upsert = re.search(r'prisma\.mpesaTransaction\.upsert\(\{.*?where: \{ transactionId: receipt \},.*?create: \{.*?status: \'UNLINKED\'\s*\},.*?update: \{\}.*?\}\);', content, re.DOTALL)
if stk_upsert:
    old_str = stk_upsert.group(0)
    new_str = old_str.replace("status: 'UNLINKED'", "status: 'UNLINKED',\n              isEnriched: !(config.initiatorName && config.initiatorPassword)")
    content = content.replace(old_str, new_str)

# Replace in C2B Confirmation (create block)
c2b_upsert = re.search(r'prisma\.mpesaTransaction\.upsert\(\{.*?where: \{ transactionId: TransID \},.*?create: \{.*?status: \'UNLINKED\'\s*\},.*?update: \{\}.*?\}\);', content, re.DOTALL)
if c2b_upsert:
    old_str = c2b_upsert.group(0)
    new_str = old_str.replace("status: 'UNLINKED'", "status: 'UNLINKED',\n          isEnriched: !(config.initiatorName && config.initiatorPassword)")
    content = content.replace(old_str, new_str)

# Restore isEnriched in findMany (search)
search_block = re.search(r'const txns = await prisma\.mpesaTransaction\.findMany\(\{.*?where: \{.*?businessId,\s*status: \'UNLINKED\',.*?// isEnriched: true,', content, re.DOTALL)
if search_block:
    old_str = search_block.group(0)
    new_str = old_str.replace("// isEnriched: true,", "isEnriched: true,")
    content = content.replace(old_str, new_str)

with open('webportal/server/routes/mpesa.ts', 'w', encoding='utf-8') as f:
    f.write(content)
