const fs = require("fs");
const path = "local-server/server/routes/settings.ts";
let content = fs.readFileSync(path, "utf-8");

content = content.replace(/email: `old_` \+ oldId \+ `_` \+ existingBusiness.email/g, "email: `old_${oldId}_${existingBusiness.email}`");
content = content.replace(/email: old_ \+ oldId \+ _ \+ existingBusiness.email/g, "email: `old_${oldId}_${existingBusiness.email}`");
content = content.replace(/apiKey: `old_` \+ oldId \+ `_` \+ \(existingBusiness.apiKey \|\| ''\)/g, "apiKey: `old_${oldId}_${existingBusiness.apiKey || ''}`");
content = content.replace(/apiKey: old_ \+ oldId \+ _ \+ \(existingBusiness.apiKey \|\| ''\)/g, "apiKey: `old_${oldId}_${existingBusiness.apiKey || ''}`");
content = content.replace(/console.error\(Failed to cascade businessId on  \+ table, err\);/g, "console.error(`Failed to cascade businessId on ${table}`, err);");
content = content.replace(/console.error\(`Failed to cascade businessId on ` \+ table, err\);/g, "console.error(`Failed to cascade businessId on ${table}`, err);");

fs.writeFileSync(path, content);
console.log("Fixed!");
