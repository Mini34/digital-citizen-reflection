import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
const page=await ctx.newPage(),checks=[],errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()+' '+(r.postData()||'')));
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const scan=async name=>{const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();if(r.violations.length)console.log(JSON.stringify(r.violations));check(name+' accessible',r.violations.length===0);};
try{
 await page.goto(base+'/');
 check('Two clearly named appearance choices',(await page.locator('#theme option').allTextContents()).join(',')==='Light,Dark');
 check('Light is the default',await page.inputValue('#theme')==='signal');
 check('Removed introduction statement is absent',!(await page.locator('.reflection-intro').innerText()).includes('No sign-in needed. Your answers stay in this browser.'));
 check('Required fields are explained up front',await page.locator('.required-explanation').count()===1);
 for(const id of ['observation','context','notice','evidenceResponse','benefit','change','check'])check(id+' visible required marker',(await page.locator(`label[for="${id}"]`).textContent()).includes('Required')&&await page.locator('#'+id).getAttribute('required')!==null);
 check('Custom risk is initially optional',await page.locator('#riskDetail').getAttribute('required')===null&&(await page.locator('label[for="riskDetail"]').textContent()).includes('Optional'));
 await page.fill('#observation','REFINEMENT_PRIVATE_5872');await page.click('[data-reflection-step="2"]');await page.click('#reflection-start-own');
 check('Personal entry preserves answers and current step',await page.inputValue('#observation')==='REFINEMENT_PRIVATE_5872'&&await page.locator('#identify-title').isVisible());
 await page.click('#reflection-start-example');check('Example entry requests replacement of existing work',await page.locator('#reflection-switch-confirm').isVisible());await page.click('#reflection-switch-no');
 check('Cancelled example entry keeps personal work',await page.inputValue('#observation')==='REFINEMENT_PRIVATE_5872'&&await page.inputValue('#reflection-topic')==='attention');
 await page.click('#reflection-start-example');await page.click('#reflection-switch-yes');
 check('Example entry opens fictional news',await page.inputValue('#reflection-topic')==='news'&&(await page.locator('#reflection-mode').innerText()).includes('Fictional')&&(await page.inputValue('#observation')).includes('buses'));
 await page.click('[data-reflection-step="1"]');
 for(const card of await page.locator('.reflection-source:visible').all()){
  check('Finding and limit are both immediately visible',await card.getByText('What this source supports',{exact:true}).isVisible()&&await card.getByText('What it cannot tell us',{exact:true}).isVisible());
  await card.locator('details>summary').click();check('Original date and audience are retained',(await card.locator('details').innerText()).includes('Date:')&&(await card.locator('details').innerText()).includes('Population / audience:'));await card.locator('details>summary').click();
 }
 await page.click('[data-reflection-step="2"]');await page.selectOption('#risk','other');
 check('Custom risk updates its required marker',await page.locator('#riskDetail').getAttribute('required')!==null&&(await page.locator('label[for="riskDetail"]').textContent()).includes('Required'));
 await page.selectOption('#risk','Sharing a claim without evidence');check('Standard risk restores optional marker',await page.locator('#riskDetail').getAttribute('required')===null&&(await page.locator('label[for="riskDetail"]').textContent()).includes('Optional'));
 await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');
 check('Plan leads with the three commitments',(await page.locator('#summary-content dt').allTextContents()).join(',')==='Change to try,Check progress,Review date');
 check('Supporting reflection starts collapsed',!await page.locator('#summary-reflection').isVisible());
 await page.locator('#summary-supporting>summary').press('Enter');check('Supporting reflection opens by keyboard',(await page.locator('#summary-reflection').innerText()).includes('cropped screenshot'));await page.locator('#summary-supporting>summary').press('Enter');
 for(const mode of ['signal','midnight']){
  await page.selectOption('#theme',mode);await scan(mode+' compact plan');
  await page.locator('#summary-supporting>summary').click();await scan(mode+' expanded plan');await page.locator('#summary-supporting>summary').click();
  await page.emulateMedia({media:'print'});check(mode+' closed supporting reflection is included in print',await page.locator('#summary-reflection').isVisible());await page.emulateMedia({media:'screen'});
 }
 await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));check('Print fallback opens supporting details',await page.locator('#summary-reflection').isVisible());await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));check('Printing restores collapsed state',!await page.locator('#summary-reflection').isVisible());
 const download=page.waitForEvent('download');await page.click('#reflection-download');const file=await download,text=await fs.readFile(await file.path(),'utf8');
 for(const label of ['Observe','Context','What I notice','Evidence and its limits','Risk','Benefit to keep','Change to try','Check progress','Review date','Sources'])check('Complete text export includes '+label,text.includes(label));
 await page.click('#reflection-start-own');check('Personal entry from an example plan asks before replacing',await page.locator('#reflection-switch-confirm').isVisible());await page.click('#reflection-switch-no');check('Cancelled conversion retains fictional wording',(await page.inputValue('#observation')).includes('buses'));
 await page.click('#reflection-start-own');await page.click('#reflection-switch-yes');check('Confirmed personal start clears the fictional example',await page.inputValue('#observation')===''&&(await page.locator('#reflection-mode').innerText()).includes('Your own'));
 await page.selectOption('#theme','midnight');await page.goto(base+'/evidence.html');check('Dark persists across pages',await page.inputValue('#theme')==='midnight');
 for(const stored of ['signal','midnight','quiet','unknown']){
  const c=await browser.newContext();await c.addInitScript(v=>localStorage.setItem('digital-citizen-reflection-theme',v),stored);const p=await c.newPage();await p.goto(base+'/');check('Compatible appearance fallback for '+stored,await p.inputValue('#theme')===(stored==='midnight'?'midnight':'signal'));await c.close();
 }
 const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));const bp=await blocked.newPage();await bp.goto(base+'/');await bp.selectOption('#theme','midnight');check('Dark remains usable with blocked storage',await bp.evaluate(()=>document.documentElement.dataset.theme==='midnight'));await blocked.close();
 const nojs=await browser.newContext({javaScriptEnabled:false});const np=await nojs.newPage();await np.goto(base+'/');check('No-JS entry links lead to worksheet and examples',await np.locator('#reflection-start-own').getAttribute('href')==='#reflection-activity'&&await np.locator('#reflection-start-example').getAttribute('href')==='#examples-title');await np.emulateMedia({media:'print'});check('No-JS source dates and populations print',await np.locator('.reflection-source details p:visible').count()===8);await nojs.close();
 check('Private work absent from requests',!requests.some(r=>r.includes('REFINEMENT_PRIVATE_5872')));check('No script errors',errors.length===0);
}finally{await fs.mkdir(new URL('../../.build/qa/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../.build/qa/refinement-checks.json',import.meta.url),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));await browser.close();}
