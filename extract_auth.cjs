const fs = require('fs');

const transcriptPath = "C:\\Users\\Josphat Mburu\\.gemini\\antigravity\\brain\\3130528b-4f31-46e8-bddd-bbc08688c0e3\\.system_generated\\logs\\transcript_full.jsonl";
const data = fs.readFileSync(transcriptPath, 'utf8');
const lines = data.split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.tool_calls && obj.tool_calls.length > 0) continue;
    if (obj.type === 'TOOL_RESPONSE' && obj.content && obj.content.includes('import { useState') && obj.content.includes('AuthPage')) {
       fs.writeFileSync('AuthPageOriginal.txt', obj.content);
       console.log('Found it!');
       break;
    }
  } catch (err) {}
}
