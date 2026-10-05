import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
const checks=[],check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
try{
 const context=await browser.newContext(),page=await context.newPage(),requests=[],errors=[];
 page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['','evidence.html','resources.html','privacy.html','script.html']){
  await page.goto(base+'/'+route);check('Canonical '+route,(await page.locator('link[rel="canonical"]').getAttribute('href'))==='https://mini34.github.io/digital-citizen-reflection/'+route);
  check('Project navigation '+route,(await page.locator('.site-nav').innerText()).replace(/\s+/g,' ')==='Activity Evidence Resources Privacy');
  for(const theme of ['signal','midnight','quiet']){
   await page.selectOption('#theme',theme);await page.setViewportSize({width:390,height:844});check(route+' '+theme+' mobile layout',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();check(route+' '+theme+' accessibility',!scan.violations.length);
  }
 }
 await page.goto(base+'/resources.html');for(const a of await page.locator('.resource-list a').all()){const url=await a.getAttribute('href'),r=await page.request.get(base+'/'+url);check('Download '+url,r.ok()&&(await r.body()).length>1000);}
 const legacy=await browser.newContext();await legacy.addInitScript(()=>{
  window.storageReads=[];const original=Storage.prototype.getItem;Storage.prototype.getItem=function(k){window.storageReads.push(k);return original.call(this,k);};
  localStorage.setItem('signal-and-self-google-viewer','IDENTITY_MUST_NOT_READ');localStorage.setItem('signal-and-self-preferences','PERSONALIZATION_MUST_NOT_READ');
 });const lp=await legacy.newPage();await lp.goto(base+'/');await lp.selectOption('#reflection-topic','news');await lp.click('#reflection-example');await lp.check('#reflection-save');await lp.reload();await lp.click('#reflection-resume-button');check('Compatible version-one reflection resumes',await lp.inputValue('#observation')==='I almost share a viral post saying our city\'s buses will be free next month.');
 check('Only reflection and project theme keys are read',await lp.evaluate(()=>storageReads.every(k=>['signal-and-self-reflection-v1','digital-citizen-reflection-theme'].includes(k))));await legacy.close();
 const nojs=await browser.newContext({javaScriptEnabled:false}),np=await nojs.newPage();await np.goto(base+'/');check('All eight written prompts available without JavaScript',await np.locator('.reflection-step textarea[name]').count()===8&&await np.locator('.guidance-fallback').count()===8);await nojs.close();
 check('All loaded resources stay on the local site',requests.every(r=>r.startsWith(base+'/')));check('No script errors on supporting pages',errors.length===0);
 await fs.mkdir(new URL('../../.build/qa/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../.build/qa/site-checks.json',import.meta.url),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}
