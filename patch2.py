with open('webportal/server/routes/mpesa.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status: 'UNLINKED'\\n            },", "status: 'UNLINKED',\n            isEnriched: !(config.initiatorName && config.initiatorPassword)\n            },")
content = content.replace("status: 'UNLINKED'\\n        },", "status: 'UNLINKED',\n        isEnriched: !(config.initiatorName && config.initiatorPassword)\n        },")
content = content.replace("// isEnriched: true,", "isEnriched: true,")

with open('webportal/server/routes/mpesa.ts', 'w', encoding='utf-8') as f:
    f.write(content)
