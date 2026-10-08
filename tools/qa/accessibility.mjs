import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const key='digital-citizen-reflection-accessibility-v1',reflectionKey='signal-and-self-reflection-v1';
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
const checks=[],errors=[],requests=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage();
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()+' '+(r.postData()||'')));
const scan=async label=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();if(result.violations.length)console.log(JSON.stringify(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({html:n.html,problem:n.failureSummary}))}))));check(label+' axe',!result.violations.length);};
async function options(){if((await page.locator('#reading-options').getAttribute('open'))===null)await page.locator('#reading-options>summary').click();}
try{
 await page.goto(base+'/');await page.keyboard.press('Tab');check('Skip link is first keyboard stop',await page.locator('.skip-link').evaluate(n=>n===document.activeElement));await page.keyboard.press('Enter');check('Skip link reaches main',await page.locator('main').evaluate(n=>n===document.activeElement));
 await page.locator('#reading-options>summary').press('Enter');await page.locator('#reading-size').waitFor({state:'visible'});check('Options open with keyboard',await page.locator('#reading-size').isVisible());await page.locator('#reading-size').selectOption('extra-large');await page.check('#reading-spacing');await page.check('#reading-contrast');await page.check('#reading-motion');
 check('Options enlarge the base font and adjust spacing',await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize)===20&&parseFloat(getComputedStyle(document.body).lineHeight)>=38));
 check('Only viewing choices enter reading storage',await page.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));return Object.keys(s).sort().join(',')==='contrast,motion,size,spacing,version';},key));
 await page.locator('#reading-reset').focus();await page.keyboard.press('Escape');check('Escape closes options and restores focus',!(await page.locator('#reading-size').isVisible())&&await page.locator('#reading-options>summary').evaluate(n=>n===document.activeElement));
 await page.goto(base+'/resources.html');check('Reading choices persist across pages',await page.evaluate(()=>document.documentElement.dataset.textSize==='extra-large'&&document.documentElement.dataset.spacious==='true'));
 check('QR image has meaningful alternative text and equivalent link',await page.locator('.resource-qr img').getAttribute('alt')==='QR code for the Digital Citizen Reflection activity'&&await page.locator('.resource-qr a').getAttribute('href')==='index.html');
 await options();await page.click('#reading-reset');check('Reset removes reading storage',await page.evaluate(k=>localStorage.getItem(k)===null,key));
 for(const theme of ['signal','midnight']){
  await page.selectOption('#theme',theme);
  for(const route of ['','evidence.html','resources.html','privacy.html','accessibility.html','script.html']){
   await page.goto(base+'/'+route);await options();await page.selectOption('#reading-size','extra-large');await page.check('#reading-spacing');await page.check('#reading-contrast');await page.check('#reading-motion');
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1050});check(theme+' '+route+' enhanced reading fits '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
   await page.setViewportSize({width:390,height:844});await scan(theme+' '+route+' enhanced reading');
   await page.click('#reading-reset');
  }
 }
 await page.goto(base+'/');await page.click('#reflection-example');
 for(const theme of ['signal','midnight']){
  await page.selectOption('#theme',theme);await options();await page.check('#reading-contrast');await page.selectOption('#reading-size','extra-large');await page.check('#reading-spacing');await page.locator('#reading-options>summary').click();
  for(let step=0;step<4;step++){
   await page.click(`[data-reflection-step="${step}"]`);check(theme+' step '+step+' current identified in text',await page.locator('[aria-current="step"] .step-current').isVisible());check(theme+' step '+step+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await scan(theme+' step '+step);
  }
  await page.click('#reflection-finish');await scan(theme+' action plan');await page.emulateMedia({media:'print'});check(theme+' print has dark text on white',await page.locator('#summary-content dd').first().evaluate(n=>getComputedStyle(n).color==='rgb(0, 0, 0)')&&await page.locator('body').evaluate(n=>getComputedStyle(n).backgroundColor==='rgb(255, 255, 255)'));await page.emulateMedia({media:'screen'});await page.click('#reflection-edit');
 }
 await options();await page.click('#reading-reset');await page.locator('#reading-options>summary').click();
 await page.click('#reflection-own');await page.click('#reflection-switch-yes');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');
 check('Missing response receives inline error and focus',await page.locator('#observation').getAttribute('aria-invalid')==='true'&&await page.locator('#observation-error').isVisible()&&await page.locator('#observation').evaluate(n=>n===document.activeElement));
 check('Error is associated with its field',(await page.locator('#observation').getAttribute('aria-describedby')).includes('observation-error'));await scan('Missing answer');
 await page.fill('#observation','   ');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Whitespace is treated as an empty answer',await page.locator('#observation').getAttribute('aria-invalid')==='true');
 await page.fill('#observation','ACCESSIBILITY_PRIVATE_6241');check('Valid editing clears the inline error',!(await page.locator('#observation-error').isVisible())&&await page.locator('#observation').getAttribute('aria-invalid')===null);
 await page.locator('[data-guidance-id="notice"] .guidance-open').click();await page.locator('#helper-notice-answer').press('Escape');check('Escape closes helper and restores its opening button',!await page.locator('#helper-notice-panel').isVisible()&&await page.locator('[data-guidance-id="notice"] .guidance-open').evaluate(n=>n===document.activeElement));
 await page.check('#reflection-save');await options();await page.selectOption('#reading-size','large');await page.click('#reading-reset');check('Reading reset preserves reflection draft and theme',await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).observation==='ACCESSIBILITY_PRIVATE_6241',reflectionKey)&&await page.inputValue('#theme')==='midnight');
 await page.evaluate(()=>{window.statusChanges=0;const n=document.querySelector('#reflection-storage-status');new MutationObserver(records=>window.statusChanges+=records.length).observe(n,{childList:true,characterData:true,subtree:true});});await page.fill('#context','A quiet evening');await page.fill('#context','A different evening');check('Saving does not reannounce identical status on each edit',await page.evaluate(()=>window.statusChanges===0));
 await page.emulateMedia({reducedMotion:'reduce'});check('System reduced motion suppresses transitions',await page.locator('#reflection-next').evaluate(n=>getComputedStyle(n).transitionDuration==='0s'));await page.emulateMedia({reducedMotion:'no-preference'});await page.check('#reading-motion');check('Manual reduced motion suppresses transitions',await page.locator('#reflection-next').evaluate(n=>getComputedStyle(n).transitionDuration==='0s'));
 await page.emulateMedia({forcedColors:'active'});await page.locator('#reading-options>summary').click();await page.click('[data-reflection-step="1"]');check('Forced colors keep step outlines visible',await page.locator('[aria-current="step"]').evaluate(n=>parseFloat(getComputedStyle(n).borderTopWidth)>=3));await page.emulateMedia({forcedColors:'none'});
 await page.goto(base+'/');await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.setViewportSize({width:320,height:844});check('200 percent text reflows at 320 pixels',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));const bp=await blocked.newPage();await bp.goto(base+'/');await bp.locator('#reading-options>summary').click();await bp.selectOption('#reading-size','extra-large');check('Blocked storage retains usable reading controls',await bp.evaluate(()=>document.documentElement.dataset.textSize==='extra-large')&&(await bp.locator('#reading-status').innerText()).includes('this visit'));await blocked.close();
 const malformed=await browser.newContext();const mp=await malformed.newPage();await mp.goto(base+'/');for(const raw of ['{broken',JSON.stringify({version:1,size:'gigantic',contrast:true,spacing:true,motion:true}),JSON.stringify({version:1,size:'large',contrast:'yes',spacing:false,motion:false})]){await mp.evaluate(({k,raw})=>localStorage.setItem(k,raw),{k:key,raw});await mp.reload();check('Malformed reading options safely reset',await mp.evaluate(k=>localStorage.getItem(k)===null&&document.documentElement.dataset.textSize==='standard',key));}await malformed.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base+'/');check('No-JS controls do not pretend to work',!await np.locator('#reading-options').isVisible()&&!await np.locator('#theme').isVisible());check('Worksheet has no submitting HTML form',await np.locator('form').count()===0);await np.fill('#before','23');await np.locator('#before').press('Enter');check('No-JS keyboard entry does not enter the URL',!np.url().includes('23')&&!np.url().includes('before='));await np.emulateMedia({media:'print'});check('No-JS print includes all four steps and sources',await np.locator('.reflection-step:visible').count()===4&&await np.locator('.reflection-source:visible').count()===4);await nojs.close();
 check('Private reflection absent from requests',!requests.some(url=>url.includes('ACCESSIBILITY_PRIVATE_6241')));check('No script errors',!errors.length);
 await fs.mkdir(new URL('../../.build/qa/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../.build/qa/accessibility-checks.json',import.meta.url),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));
}finally{await browser.close();}
