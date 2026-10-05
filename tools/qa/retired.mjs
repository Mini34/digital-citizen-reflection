import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const target='https://mini34.github.io/signal-and-self/pages/digital-citizen-reflection.html';
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
try{const page=await browser.newPage();const outgoing=[];await page.route('https://mini34.github.io/**',r=>{outgoing.push(r.request().url());return r.fulfill({body:'Restored activity'});});
 await page.goto(base+'/?private=DO_NOT_FORWARD#DO_NOT_FORWARD');await page.waitForURL(target);assert.deepEqual(outgoing,[target]);
 const html=await (await page.request.get(base+'/')).text();assert.ok(html.includes('<a href="'+target+'">'));assert.ok(!html.includes('reflection-form'));console.log('Fixed redirect and no-JavaScript fallback verified.');
}finally{await browser.close();}
