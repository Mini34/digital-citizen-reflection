import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const url=base+'/index.html', key='signal-and-self-reflection-v1';
const out=new URL('../../.build/qa/reflection/',import.meta.url); await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
const page=await ctx.newPage(), checks=[], errors=[], requests=[];
const check=(label,ok)=>{assert.ok(ok,label);checks.push(label);};
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()+' '+(r.postData()||'')+' '+JSON.stringify(r.headers())));
const screenshot=async name=>page.screenshot({path:new URL(name,out).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
async function example(id){await page.goto(url);await page.selectOption('#reflection-topic',id);await page.click('#reflection-example');}
try {
 for(const id of ['attention','social','news','ai']){
  await example(id);check(id+' example labelled fictional',(await page.locator('#reflection-mode').innerText()).includes('Fictional'));
  await page.click('#reflection-next');await page.click('#reflection-back');check(id+' back preserves answers',(await page.inputValue('#observation')).length>15);
  await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check(id+' complete plan',await page.locator('#reflection-summary').isVisible());
  check(id+' risk included',(await page.locator('#summary-content').innerText()).length>200);
 }
 await example('attention');check('Arithmetic handles 60 to 20 minutes',(await page.locator('#reflection-arithmetic').innerText()).includes('280 minutes less'));
 await page.fill('#before','0');await page.fill('#after','0');check('Zero values have finite arithmetic',(await page.locator('#reflection-arithmetic').innerText()).includes('0 minutes less'));
 await page.fill('#after','1500');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Invalid minutes prevent completion',!await page.locator('#reflection-summary').isVisible());
 await example('news');check('Review defaults to seven days ahead',await page.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+7);return document.querySelector('#reviewDate').value===`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}));await page.fill('#observation','PRIVATE_SENTINEL_49321');check('Default does not store draft',await page.evaluate(k=>localStorage.getItem(k)===null,key));
 const input=await page.inputValue('#observation');await page.selectOption('#reflection-topic','ai');check('Topic switch asks before discarding',(await page.inputValue('#observation'))===input&&await page.locator('#reflection-switch-confirm').isVisible());
 await page.click('#reflection-switch-no');check('Cancelled switch keeps original topic',await page.inputValue('#reflection-topic')==='news');
 await page.check('#reflection-save');check('Opt-in saving creates draft',await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).observation==='PRIVATE_SENTINEL_49321',key));await page.fill('#context','PRIVATE_SENTINEL_49321 context');check('Edits automatically update opted-in draft',await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).context==='PRIVATE_SENTINEL_49321 context',key));
 await page.reload();check('Resume is explicit',await page.locator('#reflection-resume').isVisible()&&await page.inputValue('#observation')==='');
 await page.click('#reflection-resume-button');check('Resume restores draft',await page.inputValue('#observation')==='PRIVATE_SENTINEL_49321');
 await page.uncheck('#reflection-save');check('Disabling saving removes draft but keeps answers',await page.evaluate(k=>localStorage.getItem(k)===null,key)&&await page.inputValue('#observation')==='PRIVATE_SENTINEL_49321');
 await page.check('#reflection-save');await page.click('#reflection-clear');await page.click('#reflection-clear-no');check('Clear cancellation preserves answers',await page.inputValue('#observation')==='PRIVATE_SENTINEL_49321');
 await page.click('#reflection-clear');await page.click('#reflection-clear-yes');check('Clear removes draft and current answers',await page.inputValue('#observation')===''&&await page.evaluate(k=>localStorage.getItem(k)===null,key));
 check('Private answers absent from URLs and request bodies',!requests.some(r=>r.includes('PRIVATE_SENTINEL_49321'))&&!page.url().includes('PRIVATE_SENTINEL'));
 check('No third-party script requested',!requests.some(r=>/accounts.google.com|cloudflareinsights.com/.test(r)));
 for(const bad of ['{bad json',JSON.stringify({version:19}),JSON.stringify({version:1,topic:'news',mode:'example',step:3})]){await page.evaluate(({k,v})=>localStorage.setItem(k,v),{k:key,v:bad});await page.reload();check('Malformed saved draft safely removed',await page.evaluate(k=>localStorage.getItem(k)===null,key));}
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied');}}));
 const blockedPage=await blocked.newPage();await blockedPage.goto(url);await blockedPage.click('#reflection-example');await blockedPage.click('#reflection-save');check('Blocked storage leaves temporary usable answers',!(await blockedPage.isChecked('#reflection-save'))&&(await blockedPage.inputValue('#observation')).length>15);await blocked.close();
 await example('attention');await page.fill('#before','1e2');await page.fill('#after','2e1');await page.check('#reflection-save');await page.reload();check('Browser-valid exponential minutes keep the saved draft',await page.locator('#reflection-resume').isVisible());await page.click('#reflection-resume-button');check('Exponential minutes and reflection answers resume together',await page.inputValue('#before')==='1e2'&&await page.inputValue('#after')==='2e1'&&(await page.inputValue('#observation')).includes('scroll')&&(await page.locator('#reflection-arithmetic').innerText()).includes('560 minutes less'));await page.uncheck('#reflection-save');
 await example('news');await page.locator('[data-reflection-step="1"]').focus();await page.keyboard.press('Enter');check('Keyboard step navigation',await page.locator('#evaluate-title').evaluate(el=>el===document.activeElement));
 for(const [i,name] of [[0,'observe'],[1,'evaluate'],[2,'identify'],[3,'act']]){await page.click(`[data-reflection-step="${i}"]`);await screenshot('demo-'+name+'.png');}
 await page.click('#reflection-finish');await screenshot('demo-action-plan.png');
 const download=page.waitForEvent('download');await page.click('#reflection-download');const downloaded=await download;const text=await fs.readFile(await downloaded.path(),'utf8');check('Text export contains answers and sources',downloaded.suggestedFilename()==='digital-citizen-action-plan.txt'&&text.includes('transit-agency')&&text.includes('https://www.unesco.org'));
 await page.emulateMedia({media:'print'});check('Print shows action plan and hides controls',await page.locator('#reflection-summary').isVisible()&&!await page.locator('#reflection-print').isVisible());await page.emulateMedia({media:'screen'});
 await page.click('#reflection-edit');check('Edit returns to populated observation',(await page.inputValue('#observation')).includes('viral'));
 await page.fill('#observation','My own news habit');await page.click('[data-reflection-step="2"]');await page.selectOption('#risk','other');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Custom risk needs a description',await page.locator('#riskDetail').isVisible()&&!await page.locator('#reflection-summary').isVisible());await page.fill('#riskDetail','Relying on a cropped headline');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Edited custom risk appears in summary',(await page.locator('#summary-content').innerText()).includes('Relying on a cropped headline'));await page.click('#reflection-edit');
 await page.selectOption('#reflection-topic','ai');await page.click('#reflection-switch-yes');check('Confirmed switch resets answers',await page.inputValue('#reflection-topic')==='ai'&&await page.inputValue('#observation')==='');
 for(const theme of ['signal','midnight','quiet']){
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1050});check(`${theme} no overflow at ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:1440,height:1050});
  for(let i=0;i<4;i++){await page.click(`[data-reflection-step="${i}"]`);const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();if(scan.violations.length)console.log(JSON.stringify(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))));check(`${theme} step ${i+1} axe clean`,scan.violations.length===0);}
 }
 await page.setViewportSize({width:390,height:844});await page.click('[data-reflection-step="0"]');await screenshot('mobile.png');
 const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(url);check('No-JS worksheet keeps all four steps and sources',await staticPage.locator('.reflection-step:visible').count()===4&&await staticPage.locator('.reflection-source:visible').count()===4);await nojs.close();
 check('No JavaScript errors',errors.length===0);
} finally {await fs.writeFile(new URL('checks.json',out),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));await browser.close();}
