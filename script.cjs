const fs = require('fs');
const path = 'c:/Users/Josphat Mburu/Documents/codes/Whiz_POS-master/src/pages/DeveloperPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetRegex = /<div className="bg-green-50 p-4 border-b flex items-center justify-between">[\s\S]*?<button type="button" onClick=\{\(\) => togglePasswordVisibility\('mpesaConsumerSecret'\)\} className="text-sm text-blue-600">Toggle Secret Visibility<\/button>\s*<\/div>\s*<\/div>/;

const replacement = `<div className="bg-green-50 p-4 border-b flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1024px-M-PESA_LOGO-01.svg.png" alt="M-Pesa" className="h-8" />
                                          <h3 className="font-bold text-green-800 text-lg">STK Push & C2B API</h3>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" className="sr-only peer" checked={mpesaConfig.enabled} onChange={(e) => setMpesaConfig({...mpesaConfig, enabled: e.target.checked})} />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                      </label>
                                      </div>
                                      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                                      <div>
                                          <label className="block text-sm font-medium">Environment</label>
                                          <select name="environment" value={mpesaConfig.environment} onChange={(e) => setMpesaConfig({...mpesaConfig, environment: e.target.value as any})} className="w-full p-3 border rounded-lg">
                                          <option value="Sandbox">Sandbox (Testing)</option>
                                          <option value="Production">Live (Production)</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Callback Domain</label>
                                          <input type="text" name="callbackUrl" value={mpesaConfig.callbackUrl || 'https://api.whizpoint.app'} onChange={(e) => setMpesaConfig({...mpesaConfig, callbackUrl: e.target.value})} className="w-full p-3 border rounded-lg" placeholder="https://..." />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Type</label>
                                          <select name="type" value={mpesaConfig.type} onChange={(e) => setMpesaConfig({...mpesaConfig, type: e.target.value as any})} className="w-full p-3 border rounded-lg">
                                          <option value="Till">Buy Goods (Till Number)</option>
                                          <option value="Paybill">Paybill</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Consumer Key</label>
                                          <input type="text" name="consumerKey" value={mpesaConfig.consumerKey} onChange={(e) => setMpesaConfig({...mpesaConfig, consumerKey: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Consumer Secret</label>
                                          <input type={showPasswords['mpesaConsumerSecret'] ? 'text' : 'password'} name="consumerSecret" value={mpesaConfig.consumerSecret} onChange={(e) => setMpesaConfig({...mpesaConfig, consumerSecret: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium">Passkey</label>
                                          <input type={showPasswords['mpesaPasskey'] ? 'text' : 'password'} name="passkey" value={mpesaConfig.passkey} onChange={(e) => setMpesaConfig({...mpesaConfig, passkey: e.target.value})} className="w-full p-3 border rounded-lg" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-purple-700">Business Shortcode (Store No. / Head Office)</label>
                                          <input type="text" name="shortcode" value={mpesaConfig.shortcode} onChange={(e) => setMpesaConfig({...mpesaConfig, shortcode: e.target.value})} className="w-full p-3 border rounded-lg border-purple-200 bg-purple-50" placeholder="e.g. 123456" />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-blue-700">Till / Paybill Number (PartyB)</label>
                                          <input type="text" name="partyB" value={mpesaConfig.partyB} onChange={(e) => setMpesaConfig({...mpesaConfig, partyB: e.target.value})} className="w-full p-3 border rounded-lg border-blue-200 bg-blue-50" placeholder="e.g. 3098707" />
                                      </div>
                                      <div className="md:col-span-2 flex gap-4">
                                          <button type="button" onClick={() => togglePasswordVisibility('mpesaPasskey')} className="text-sm text-blue-600">Toggle Passkey Visibility</button>
                                          <button type="button" onClick={() => togglePasswordVisibility('mpesaConsumerSecret')} className="text-sm text-blue-600">Toggle Secret Visibility</button>
                                      </div>
                                      </div>`;

if(targetRegex.test(content)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log("SUCCESS");
} else {
    console.log("NOT FOUND");
}
