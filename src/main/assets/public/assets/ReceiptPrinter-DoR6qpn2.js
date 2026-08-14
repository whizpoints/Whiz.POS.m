import{a as D,g as F,R as Z,r as j,j as i}from"./index-tu3Z8e84.js";const U={},I=e=>{let n;const t=new Set,r=(l,u)=>{const o=typeof l=="function"?l(n):l;if(!Object.is(o,n)){const b=n;n=u??(typeof o!="object"||o===null)?o:Object.assign({},n,o),t.forEach(w=>w(n,b))}},a=()=>n,c={setState:r,getState:a,getInitialState:()=>d,subscribe:l=>(t.add(l),()=>t.delete(l)),destroy:()=>{(U?"production":void 0)!=="production"&&console.warn("[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."),t.clear()}},d=n=e(r,a,c);return c},P=e=>e?I(e):I;var X={exports:{}},H={},k={exports:{}},T={};/**
 * @license React
 * use-sync-external-store-shim.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var V;function Y(){if(V)return T;V=1;var e=D();function n(u,o){return u===o&&(u!==0||1/u===1/o)||u!==u&&o!==o}var t=typeof Object.is=="function"?Object.is:n,r=e.useState,a=e.useEffect,s=e.useLayoutEffect,p=e.useDebugValue;function m(u,o){var b=o(),w=r({inst:{value:b,getSnapshot:o}}),h=w[0].inst,y=w[1];return s(function(){h.value=b,h.getSnapshot=o,c(h)&&y({inst:h})},[u,b,o]),a(function(){return c(h)&&y({inst:h}),u(function(){c(h)&&y({inst:h})})},[u]),p(b),b}function c(u){var o=u.getSnapshot;u=u.value;try{var b=o();return!t(u,b)}catch{return!0}}function d(u,o){return o()}var l=typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"?d:m;return T.useSyncExternalStore=e.useSyncExternalStore!==void 0?e.useSyncExternalStore:l,T}var L;function z(){return L||(L=1,k.exports=Y()),k.exports}/**
 * @license React
 * use-sync-external-store-shim/with-selector.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var Q;function q(){if(Q)return H;Q=1;var e=D(),n=z();function t(d,l){return d===l&&(d!==0||1/d===1/l)||d!==d&&l!==l}var r=typeof Object.is=="function"?Object.is:t,a=n.useSyncExternalStore,s=e.useRef,p=e.useEffect,m=e.useMemo,c=e.useDebugValue;return H.useSyncExternalStoreWithSelector=function(d,l,u,o,b){var w=s(null);if(w.current===null){var h={hasValue:!1,value:null};w.current=h}else h=w.current;w=m(function(){function f(g){if(!v){if(v=!0,x=g,g=o(g),b!==void 0&&h.hasValue){var C=h.value;if(b(C,g))return M=C}return M=g}if(C=M,r(x,g))return C;var $=o(g);return b!==void 0&&b(C,$)?(x=g,C):(x=g,M=$)}var v=!1,x,M,R=u===void 0?null:u;return[function(){return f(l())},R===null?void 0:function(){return f(R())}]},[l,u,o,b]);var y=a(d,w[0],w[1]);return p(function(){h.hasValue=!0,h.value=y},[y]),c(y),y},H}var B;function K(){return B||(B=1,X.exports=q()),X.exports}var G=K();const ee=F(G),J={},{useDebugValue:te}=Z,{useSyncExternalStoreWithSelector:ae}=ee;let A=!1;const re=e=>e;function se(e,n=re,t){(J?"production":void 0)!=="production"&&t&&!A&&(console.warn("[DEPRECATED] Use `createWithEqualityFn` instead of `create` or use `useStoreWithEqualityFn` instead of `useStore`. They can be imported from 'zustand/traditional'. https://github.com/pmndrs/zustand/discussions/1937"),A=!0);const r=ae(e.subscribe,e.getState,e.getServerState||e.getInitialState,n,t);return te(r),r}const _=e=>{(J?"production":void 0)!=="production"&&typeof e!="function"&&console.warn("[DEPRECATED] Passing a vanilla store will be unsupported in a future version. Instead use `import { useStore } from 'zustand'`.");const n=typeof e=="function"?P(e):e,t=(r,a)=>se(n,r,a);return Object.assign(t,n),t},ne=e=>e?_(e):_,oe={};function de(e,n){let t;try{t=e()}catch{return}return{getItem:a=>{var s;const p=c=>c===null?null:JSON.parse(c,void 0),m=(s=t.getItem(a))!=null?s:null;return m instanceof Promise?m.then(p):p(m)},setItem:(a,s)=>t.setItem(a,JSON.stringify(s,void 0)),removeItem:a=>t.removeItem(a)}}const S=e=>n=>{try{const t=e(n);return t instanceof Promise?t:{then(r){return S(r)(t)},catch(r){return this}}}catch(t){return{then(r){return this},catch(r){return S(r)(t)}}}},ce=(e,n)=>(t,r,a)=>{let s={getStorage:()=>localStorage,serialize:JSON.stringify,deserialize:JSON.parse,partialize:y=>y,version:0,merge:(y,f)=>({...f,...y}),...n},p=!1;const m=new Set,c=new Set;let d;try{d=s.getStorage()}catch{}if(!d)return e((...y)=>{console.warn(`[zustand persist middleware] Unable to update item '${s.name}', the given storage is currently unavailable.`),t(...y)},r,a);const l=S(s.serialize),u=()=>{const y=s.partialize({...r()});let f;const v=l({state:y,version:s.version}).then(x=>d.setItem(s.name,x)).catch(x=>{f=x});if(f)throw f;return v},o=a.setState;a.setState=(y,f)=>{o(y,f),u()};const b=e((...y)=>{t(...y),u()},r,a);let w;const h=()=>{var y;if(!d)return;p=!1,m.forEach(v=>v(r()));const f=((y=s.onRehydrateStorage)==null?void 0:y.call(s,r()))||void 0;return S(d.getItem.bind(d))(s.name).then(v=>{if(v)return s.deserialize(v)}).then(v=>{if(v)if(typeof v.version=="number"&&v.version!==s.version){if(s.migrate)return s.migrate(v.state,v.version);console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}else return v.state}).then(v=>{var x;return w=s.merge(v,(x=r())!=null?x:b),t(w,!0),u()}).then(()=>{f?.(w,void 0),p=!0,c.forEach(v=>v(w))}).catch(v=>{f?.(void 0,v)})};return a.persist={setOptions:y=>{s={...s,...y},y.getStorage&&(d=y.getStorage())},clearStorage:()=>{d?.removeItem(s.name)},getOptions:()=>s,rehydrate:()=>h(),hasHydrated:()=>p,onHydrate:y=>(m.add(y),()=>{m.delete(y)}),onFinishHydration:y=>(c.add(y),()=>{c.delete(y)})},h(),w||b},ie=(e,n)=>(t,r,a)=>{let s={storage:de(()=>localStorage),partialize:h=>h,version:0,merge:(h,y)=>({...y,...h}),...n},p=!1;const m=new Set,c=new Set;let d=s.storage;if(!d)return e((...h)=>{console.warn(`[zustand persist middleware] Unable to update item '${s.name}', the given storage is currently unavailable.`),t(...h)},r,a);const l=()=>{const h=s.partialize({...r()});return d.setItem(s.name,{state:h,version:s.version})},u=a.setState;a.setState=(h,y)=>{u(h,y),l()};const o=e((...h)=>{t(...h),l()},r,a);a.getInitialState=()=>o;let b;const w=()=>{var h,y;if(!d)return;p=!1,m.forEach(v=>{var x;return v((x=r())!=null?x:o)});const f=((y=s.onRehydrateStorage)==null?void 0:y.call(s,(h=r())!=null?h:o))||void 0;return S(d.getItem.bind(d))(s.name).then(v=>{if(v)if(typeof v.version=="number"&&v.version!==s.version){if(s.migrate)return[!0,s.migrate(v.state,v.version)];console.error("State loaded from storage couldn't be migrated since no migrate function was provided")}else return[!1,v.state];return[!1,void 0]}).then(v=>{var x;const[M,R]=v;if(b=s.merge(R,(x=r())!=null?x:o),t(b,!0),M)return l()}).then(()=>{f?.(b,void 0),b=r(),p=!0,c.forEach(v=>v(b))}).catch(v=>{f?.(void 0,v)})};return a.persist={setOptions:h=>{s={...s,...h},h.storage&&(d=h.storage)},clearStorage:()=>{d?.removeItem(s.name)},getOptions:()=>s,rehydrate:()=>w(),hasHydrated:()=>p,onHydrate:h=>(m.add(h),()=>{m.delete(h)}),onFinishHydration:h=>(c.add(h),()=>{c.delete(h)})},s.skipHydration||w(),b||o},ue=(e,n)=>"getStorage"in n||"serialize"in n||"deserialize"in n?((oe?"production":void 0)!=="production"&&console.warn("[DEPRECATED] `getStorage`, `serialize` and `deserialize` options are deprecated. Use `storage` option instead."),ce(e,n)):ie(e,n),le=ue,O=ne()(le((e,n)=>({products:[],cart:[],transactions:[],creditCustomers:[],users:[],expenses:[],businessSetup:null,currentCashier:null,isCheckoutOpen:!1,isSetupWizardOpen:!1,isLoginOpen:!0,currentPage:"pos",isOnline:navigator.onLine,syncQueue:[],lastSyncTime:null,setProducts:t=>e({products:t}),addToCart:t=>{e(r=>r.cart.find(s=>s.product.id===t.id)?{cart:r.cart.map(s=>s.product.id===t.id?{...s,quantity:s.quantity+1}:s)}:{cart:[...r.cart,{product:t,quantity:1}]})},removeFromCart:t=>{e(r=>({cart:r.cart.filter(a=>a.product.id!==t)}))},updateQuantity:(t,r)=>{if(r<=0){n().removeFromCart(t);return}e(a=>({cart:a.cart.map(s=>s.product.id===t?{...s,quantity:r}:s)}))},clearCart:()=>e({cart:[]}),setCurrentCashier:t=>e({currentCashier:t}),openCheckout:()=>e({isCheckoutOpen:!0}),closeCheckout:()=>e({isCheckoutOpen:!1}),openSetupWizard:()=>e({isSetupWizardOpen:!0}),closeSetupWizard:()=>e({isSetupWizardOpen:!1}),openLogin:()=>e({isLoginOpen:!0}),closeLogin:()=>e({isLoginOpen:!1}),setCurrentPage:t=>e({currentPage:t}),completeTransaction:(t,r)=>{const a=n();if(!a.currentCashier)return;const s=a.cart.reduce((d,l)=>d+l.product.price*l.quantity,0),p=s*(a.businessSetup?.taxRate||.16),m=s+p,c={id:`TXN${Date.now()}`,timestamp:new Date().toISOString(),items:[...a.cart],subtotal:s,tax:p,total:m,paymentMethod:t,cashier:a.currentCashier.name,creditCustomer:r,status:"completed"};if(a.saveTransaction(c),t==="credit"&&r){const d=a.creditCustomers.find(l=>l.name===r);if(d)a.updateCreditCustomer(d.id,{totalCredit:d.totalCredit+m,balance:d.balance+m,transactions:[...d.transactions,c.id],lastUpdated:new Date().toISOString()});else{const l={id:`CUST${Date.now()}`,name:r,phone:"",totalCredit:m,paidAmount:0,balance:m,transactions:[c.id],createdAt:new Date().toISOString(),lastUpdated:new Date().toISOString()};a.saveCreditCustomer(l)}}a.clearCart(),a.closeCheckout()},saveTransaction:async t=>{try{(await fetch("/api/transactions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok&&(e(a=>({transactions:[t,...a.transactions]})),n().isOnline&&n().addToSyncQueue({type:"transaction",data:t}))}catch(r){console.error("Failed to save transaction:",r),e(a=>({transactions:[t,...a.transactions]}))}},saveCreditCustomer:async t=>{try{(await fetch("/api/credit-customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok&&e(a=>({creditCustomers:[...a.creditCustomers,t]}))}catch(r){console.error("Failed to save credit customer:",r),e(a=>({creditCustomers:[...a.creditCustomers,t]}))}},updateCreditCustomer:async(t,r)=>{e(a=>({creditCustomers:a.creditCustomers.map(s=>s.id===t?{...s,...r}:s)}));try{await fetch(`/api/credit-customers/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)})}catch(a){console.error("Failed to update credit customer:",a)}},saveExpense:async t=>{try{(await fetch("/api/expenses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok&&e(a=>({expenses:[t,...a.expenses]}))}catch(r){console.error("Failed to save expense:",r),e(a=>({expenses:[t,...a.expenses]}))}},saveBusinessSetup:async t=>{try{(await fetch("/api/business-setup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok&&e({businessSetup:t})}catch(r){console.error("Failed to save business setup:",r),e({businessSetup:t})}},addToSyncQueue:t=>{e(r=>({syncQueue:[...r.syncQueue,t]}))},processSyncQueue:async()=>{const t=n();if(!t.isOnline||t.syncQueue.length===0)return;const r=[...t.syncQueue];e({syncQueue:[]});for(const a of r)try{console.log("Syncing:",a)}catch(s){console.error("Sync failed:",s),e(p=>({syncQueue:[...p.syncQueue,a]}))}e({lastSyncTime:new Date().toISOString()})},setOnlineStatus:t=>{e({isOnline:t}),t&&n().processSyncQueue()},getDailySales:t=>{const a=n().transactions.filter(c=>c.timestamp.startsWith(t)&&c.status==="completed"),s=a.filter(c=>c.paymentMethod==="cash").reduce((c,d)=>c+d.total,0),p=a.filter(c=>c.paymentMethod==="mpesa").reduce((c,d)=>c+d.total,0),m=a.filter(c=>c.paymentMethod==="credit").reduce((c,d)=>c+d.total,0);return{cash:s,mpesa:p,credit:m,total:s+p+m}},getTransactionsByDateRange:(t,r)=>n().transactions.filter(s=>{const p=new Date(s.timestamp);return p>=new Date(t)&&p<=new Date(r)}),getUnpaidCredits:()=>n().creditCustomers.filter(r=>r.balance>0),saveUser:async t=>{try{(await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).ok&&e(a=>({users:[...a.users,t]}))}catch(r){console.error("Failed to save user:",r),e(a=>({users:[...a.users,t]}))}},updateUser:async(t,r)=>{e(a=>({users:a.users.map(s=>s.id===t?{...s,...r}:s)}));try{await fetch(`/api/users/${t}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)})}catch(a){console.error("Failed to update user:",a)}}}),{name:"pos-storage",partialize:e=>({businessSetup:e.businessSetup,currentCashier:e.currentCashier,transactions:e.transactions.slice(-100),creditCustomers:e.creditCustomers,users:e.users,expenses:e.expenses.slice(-50),lastSyncTime:e.lastSyncTime,products:e.products.slice(-100),inventoryProducts:e.inventoryProducts,loyaltyCustomers:e.loyaltyCustomers,syncHistory:e.syncHistory.slice(-50)})}));/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),ye=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(n,t,r)=>r?r.toUpperCase():t.toLowerCase()),E=e=>{const n=ye(e);return n.charAt(0).toUpperCase()+n.slice(1)},W=(...e)=>e.filter((n,t,r)=>!!n&&n.trim()!==""&&r.indexOf(n)===t).join(" ").trim(),ve=e=>{for(const n in e)if(n.startsWith("aria-")||n==="role"||n==="title")return!0};/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var me={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const pe=j.forwardRef(({color:e="currentColor",size:n=24,strokeWidth:t=2,absoluteStrokeWidth:r,className:a="",children:s,iconNode:p,...m},c)=>j.createElement("svg",{ref:c,...me,width:n,height:n,stroke:e,strokeWidth:r?Number(t)*24/Number(n):t,className:W("lucide",a),...!s&&!ve(m)&&{"aria-hidden":"true"},...m},[...p.map(([d,l])=>j.createElement(d,l)),...Array.isArray(s)?s:[s]]));/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=(e,n)=>{const t=j.forwardRef(({className:r,...a},s)=>j.createElement(pe,{ref:s,iconNode:n,className:W(`lucide-${he(E(e))}`,`lucide-${e}`,r),...a}));return t.displayName=E(e),t};/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const be=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],We=N("chart-column",be);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const we=[["path",{d:"M10 2v2",key:"7u0qdc"}],["path",{d:"M14 2v2",key:"6buw04"}],["path",{d:"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1",key:"pwadti"}],["path",{d:"M6 2v2",key:"colzsn"}]],Fe=N("coffee",we);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const fe=[["rect",{width:"20",height:"14",x:"2",y:"5",rx:"2",key:"ynyp8z"}],["line",{x1:"2",x2:"22",y1:"10",y2:"10",key:"1b3vmo"}]],Ne=N("credit-card",fe);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const xe=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],ge=N("download",xe);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const je=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],Ze=N("funnel",je);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],Ue=N("lock",Me);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ce=[["path",{d:"M5 12h14",key:"1ays0h"}]],Pe=N("minus",Ce);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Se=[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]],Ye=N("plus",Se);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],Xe=N("printer",Re);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const He=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],ze=N("search",He);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ke=[["path",{d:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z",key:"1qme2f"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],qe=N("settings",ke);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Te=[["path",{d:"M12 2v13",key:"1km8f5"}],["path",{d:"m16 6-4-4-4 4",key:"13yo43"}],["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",key:"1b2hhj"}]],$e=N("share",Te);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ie=[["rect",{width:"14",height:"20",x:"5",y:"2",rx:"2",ry:"2",key:"1yt0o3"}],["path",{d:"M12 18h.01",key:"mhygvu"}]],Ve=N("smartphone",Ie);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Le=[["path",{d:"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7",key:"ztvudi"}],["path",{d:"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8",key:"1b2hhj"}],["path",{d:"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4",key:"2ebpfo"}],["path",{d:"M2 7h20",key:"1fcdvo"}],["path",{d:"M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7",key:"6c3vgh"}]],Ke=N("store",Le);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Qe=[["path",{d:"M10 11v6",key:"nco0om"}],["path",{d:"M14 11v6",key:"outv1u"}],["path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",key:"miytrc"}],["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",key:"e791ji"}]],Ge=N("trash-2",Qe);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Be=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],et=N("user",Be);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ae=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],tt=N("users",Ae);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _e=[["path",{d:"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1",key:"18etb6"}],["path",{d:"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4",key:"xoc0q4"}]],Ee=N("wallet",_e);/**
 * @license lucide-react v0.533.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const De=[["path",{d:"M18 6 6 18",key:"1bl5f8"}],["path",{d:"m6 6 12 12",key:"d8bk6v"}]],Je=N("x",De);function at(){const{isCheckoutOpen:e,closeCheckout:n,cart:t,completeTransaction:r}=O(),[a,s]=j.useState("cash"),[p,m]=j.useState(""),c=t.reduce((o,b)=>o+b.product.price*b.quantity,0),d=c*.16,l=c+d;if(!e)return null;const u=()=>{if(a==="credit"&&!p.trim()){alert("Please enter customer name for credit payment");return}r(a,a==="credit"?p:void 0),m(""),s("cash")};return i.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMjg6NA","data-yw-s":!0,children:i.jsxs("div",{className:"bg-white rounded-lg shadow-xl w-full max-w-md mx-4","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMjk6Ng","data-yw-s":!0,children:[i.jsxs("div",{className:"flex justify-between items-center p-6 border-b","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMzA6OA","data-yw-s":!0,children:[i.jsx("h2",{className:"text-xl font-semibold text-gray-800","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMzE6MTA","data-yw-t":!0,"data-yw-s":!0,children:"Checkout"}),i.jsx("button",{onClick:n,className:"text-gray-400 hover:text-gray-600","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMzI6MTA","data-yw-s":!0,children:i.jsx(Je,{className:"w-6 h-6","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMzY6MTI","data-yw-s":!0})})]}),i.jsxs("div",{className:"p-6","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDA6OA","data-yw-s":!0,children:[i.jsxs("div",{className:"space-y-2 mb-6","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDE6MTA","data-yw-s":!0,children:[i.jsxs("div",{className:"flex justify-between text-sm","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDI6MTI","data-yw-s":!0,children:[i.jsx("span",{className:"text-gray-600","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDM6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"Subtotal"}),i.jsxs("span",{className:"font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDQ6MTQ","data-yw-s":!0,children:[i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDQ6NDQ","data-yw-t":!0,"data-yw-auto":!0,children:"KES "}),c.toFixed(2)]})]}),i.jsxs("div",{className:"flex justify-between text-sm","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDY6MTI","data-yw-s":!0,children:[i.jsx("span",{className:"text-gray-600","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDc6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"VAT (16%)"}),i.jsxs("span",{className:"font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDg6MTQ","data-yw-s":!0,children:[i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANDg6NDQ","data-yw-t":!0,"data-yw-auto":!0,children:"KES "}),d.toFixed(2)]})]}),i.jsxs("div",{className:"flex justify-between text-lg font-bold text-gray-800 pt-2 border-t","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTA6MTI","data-yw-s":!0,children:[i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTE6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"Total"}),i.jsxs("span",{className:"text-blue-600","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTI6MTQ","data-yw-s":!0,children:[i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTI6NDY","data-yw-t":!0,"data-yw-auto":!0,children:"KES "}),l.toFixed(2)]})]})]}),i.jsxs("div",{className:"space-y-3","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTY6MTA","data-yw-s":!0,children:[i.jsx("h3",{className:"font-medium text-gray-700 mb-2","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTc6MTI","data-yw-t":!0,"data-yw-s":!0,children:"Payment Method"}),i.jsxs("button",{onClick:()=>s("cash"),className:`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${a==="cash"?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`,"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANTk6MTI","data-yw-s":!0,children:[i.jsx(Ee,{className:"w-5 h-5 mr-3","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANjc6MTQ","data-yw-s":!0}),i.jsx("span",{className:"font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANjg6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"Cash"})]}),i.jsxs("button",{onClick:()=>s("mpesa"),className:`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${a==="mpesa"?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`,"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANzE6MTI","data-yw-s":!0,children:[i.jsx(Ve,{className:"w-5 h-5 mr-3","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hANzk6MTQ","data-yw-s":!0}),i.jsx("span",{className:"font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAODA6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"M-Pesa"})]}),i.jsxs("button",{onClick:()=>s("credit"),className:`w-full flex items-center p-3 rounded-lg border-2 transition-colors ${a==="credit"?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`,"data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAODM6MTI","data-yw-s":!0,children:[i.jsx(Ne,{className:"w-5 h-5 mr-3","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAOTE6MTQ","data-yw-s":!0}),i.jsx("span",{className:"font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAOTI6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"Credit"})]})]}),a==="credit"&&i.jsxs("div",{className:"mt-4","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAOTc6MTI","data-yw-s":!0,children:[i.jsx("label",{className:"block text-sm font-medium text-gray-700 mb-1","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAOTg6MTQ","data-yw-t":!0,"data-yw-s":!0,children:"Customer Name"}),i.jsx("input",{type:"text",value:p,onChange:o=>m(o.target.value),className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",placeholder:"Enter customer name","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMTAxOjE0","data-yw-s":!0})]}),i.jsxs("div",{className:"flex gap-3 mt-6","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMTExOjEw","data-yw-s":!0,children:[i.jsx("button",{onClick:n,className:"flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMTEyOjEy","data-yw-t":!0,"data-yw-s":!0,children:"Cancel"}),i.jsx("button",{onClick:u,className:"flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium","data-yw":"c3JjL2NvbXBvbmVudHMvQ2hlY2tvdXRNb2RhbC50c3hAMTE4OjEy","data-yw-t":!0,"data-yw-s":!0,children:"Complete Payment"})]})]})]})})}function rt({transaction:e,onClose:n}){const{businessSetup:t}=O(),r=()=>{const c=window.open("","_blank");if(c){const d=p();c.document.write(d),c.document.close(),c.print()}},a=()=>{const c=m(),d=new Blob([c],{type:"text/plain"}),l=URL.createObjectURL(d),u=document.createElement("a");u.href=l,u.download=`receipt-${e.id}.txt`,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(l)},s=async()=>{const c=m();if(navigator.share)try{await navigator.share({title:`Receipt ${e.id}`,text:c})}catch(d){console.log("Error sharing:",d)}else navigator.clipboard.writeText(c),alert("Receipt copied to clipboard!")},p=()=>{const c=t?.receiptHeader||"WHIZ POS - Thank you for your purchase!",d=t?.receiptFooter||"Please come again!",l=t?.currency||"KES";return`
      <html>
        <head>
          <title>Receipt ${e.id}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 20px; 
              max-width: 300px; 
              margin: 0 auto;
              padding: 20px;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .content { margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 20px; }
            .total { font-weight: bold; font-size: 1.2em; }
            .payment-info { margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${t?.businessName||"WHIZ POS"}</h2>
            <p>${t?.address||""}</p>
            <p>${t?.phone||""}</p>
            <p>Receipt #${e.id}</p>
            <p>${new Date(e.timestamp).toLocaleString()}</p>
          </div>
          
          <div class="content">
            <div class="item">
              <span>${c}</span>
            </div>
            
            ${e.items.map(u=>`
              <div class="item">
                <span>${u.quantity}x ${u.product.name}</span>
                <span>${l} ${(u.product.price*u.quantity).toFixed(2)}</span>
              </div>
            `).join("")}
            
            <div class="item">
              <span>Subtotal:</span>
              <span>${l} ${e.subtotal.toFixed(2)}</span>
            </div>
            
            <div class="item">
              <span>Tax (${(t?.taxRate||.16)*100}%):</span>
              <span>${l} ${e.tax.toFixed(2)}</span>
            </div>
            
            <div class="item total">
              <span>TOTAL:</span>
              <span>${l} ${e.total.toFixed(2)}</span>
            </div>
            
            <div class="payment-info">
              <div class="item">
                <span>Payment:</span>
                <span>${e.paymentMethod.toUpperCase()}</span>
              </div>
              
              ${e.creditCustomer?`
                <div class="item">
                  <span>Customer:</span>
                  <span>${e.creditCustomer}</span>
                </div>
              `:""}
            </div>
          </div>
          
          <div class="footer">
            <p>Cashier: ${e.cashier}</p>
            <p>${d}</p>
          </div>
        </body>
      </html>
    `},m=()=>{const c=t?.receiptHeader||"WHIZ POS - Thank you for your purchase!",d=t?.receiptFooter||"Please come again!",l=t?.currency||"KES",u="=".repeat(30);let o=`${u}
`;return o+=`${t?.businessName||"WHIZ POS"}
`,o+=`${t?.address||""}
`,o+=`${t?.phone||""}
`,o+=`${u}
`,o+=`Receipt #${e.id}
`,o+=`${new Date(e.timestamp).toLocaleString()}
`,o+=`${u}
`,o+=`${c}
`,o+=`${u}
`,e.items.forEach(b=>{o+=`${b.quantity}x ${b.product.name.padEnd(20)} ${l}${(b.product.price*b.quantity).toFixed(2).padStart(10)}
`}),o+=`${u}
`,o+=`Subtotal: ${l}${e.subtotal.toFixed(2)}
`,o+=`Tax (${(t?.taxRate||.16)*100}%): ${l}${e.tax.toFixed(2)}
`,o+=`${u}
`,o+=`TOTAL: ${l}${e.total.toFixed(2)}
`,o+=`${u}
`,o+=`Payment: ${e.paymentMethod.toUpperCase()}
`,e.creditCustomer&&(o+=`Customer: ${e.creditCustomer}
`),o+=`${u}
`,o+=`Cashier: ${e.cashier}
`,o+=`${u}
`,o+=`${d}
`,o+=`${u}
`,o};return i.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4NDo0","data-yw-s":!0,children:i.jsx("div",{className:"bg-white rounded-lg shadow-xl w-full max-w-md mx-4","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4NTo2","data-yw-s":!0,children:i.jsxs("div",{className:"p-6","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4Njo4","data-yw-s":!0,children:[i.jsxs("div",{className:"flex justify-between items-center mb-6","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4NzoxMA","data-yw-s":!0,children:[i.jsx("h2",{className:"text-xl font-bold text-gray-800","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4ODoxMg","data-yw-t":!0,"data-yw-s":!0,children:"Receipt Options"}),i.jsx("button",{onClick:n,className:"text-gray-400 hover:text-gray-600","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE4OToxMg","data-yw-t":!0,"data-yw-s":!0,children:"×"})]}),i.jsx("div",{className:"bg-gray-50 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE5ODoxMA","data-yw-s":!0,children:i.jsx("pre",{className:"text-xs font-mono whitespace-pre-wrap","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDE5OToxMg","data-yw-s":!0,children:m()})}),i.jsxs("div",{className:"space-y-3","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIwNToxMA","data-yw-s":!0,children:[i.jsxs("button",{onClick:r,className:"w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIwNjoxMg","data-yw-s":!0,children:[i.jsx(Xe,{className:"w-5 h-5","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIxMDoxNA","data-yw-s":!0}),i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIxMToxNA","data-yw-t":!0,"data-yw-s":!0,children:"Print Receipt"})]}),i.jsxs("div",{className:"grid grid-cols-2 gap-3","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIxNDoxMg","data-yw-s":!0,children:[i.jsxs("button",{onClick:a,className:"flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIxNToxNA","data-yw-s":!0,children:[i.jsx(ge,{className:"w-4 h-4","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIxOToxNg","data-yw-s":!0}),i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIyMDoxNg","data-yw-t":!0,"data-yw-s":!0,children:"Download"})]}),i.jsxs("button",{onClick:s,className:"flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIyMzoxNA","data-yw-s":!0,children:[i.jsx($e,{className:"w-4 h-4","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIyNzoxNg","data-yw-s":!0}),i.jsx("span",{"data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIyODoxNg","data-yw-t":!0,"data-yw-s":!0,children:"Share"})]})]})]}),i.jsx("div",{className:"mt-4 text-center","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIzMzoxMA","data-yw-s":!0,children:i.jsx("button",{onClick:n,className:"text-gray-500 hover:text-gray-700 text-sm","data-yw":"c3JjL2NvbXBvbmVudHMvUmVjZWlwdFByaW50ZXIudHN4QDIzNDoxMg","data-yw-t":!0,"data-yw-s":!0,children:"Close"})})]})})})}export{Ne as C,ge as D,Ze as F,Ue as L,Pe as M,Ye as P,rt as R,Ke as S,Ge as T,et as U,Je as X,ze as a,at as b,N as c,qe as d,tt as e,We as f,Fe as g,Xe as h,O as u};
//# sourceMappingURL=ReceiptPrinter-DoR6qpn2.js.map
