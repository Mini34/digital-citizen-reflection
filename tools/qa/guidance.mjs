import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_URL||'http://127.0.0.1:8001/digital-citizen-reflection';
const browser=await chromium.launch({...(process.env.QA_BROWSER==='chromium'?{}:{channel:'chrome'}),headless:true});
const checks=[],requests=[],errors=[];
const check=(text,value)=>{assert.ok(value,text);checks.push(text);};
const ctx=await browser.newContext({viewport:{width:1280,height:950}}),page=await ctx.newPage();
page.on('request',r=>requests.push(r.url()+' '+(r.postData()||'')+' '+JSON.stringify(r.headers())));page.on('pageerror',e=>errors.push(e.message));
const fields={observation:0,context:0,notice:0,evidenceResponse:1,riskDetail:2,benefit:2,change:3,check:3};
const group=id=>page.locator(`[data-guidance-id="${id}"]`);
async function fresh(){await page.goto(base+'/index.html');}
async function draft(id,text='GUIDANCE_PRIVATE_8172'){
 await group(id).locator('.guidance-open').click();
 await page.fill('#helper-'+id+'-answer',text);await group(id).locator('[data-help-next]').click();
 await group(id).locator('[data-help-skip]').click();await group(id).locator('[data-help-skip]').click();
}
try{
 for(const topic of ['attention','social','news','ai']){
  await fresh();await page.selectOption('#reflection-topic',topic);
  for(const [id,step] of Object.entries(fields)){
   await page.click(`[data-reflection-step="${step}"]`);await draft(id);
   check(topic+' '+id+' preview preserves supplied words',(await page.inputValue('#helper-'+id+'-draft')).includes('GUIDANCE_PRIVATE_8172'));
   check(topic+' '+id+' preview does not fill answer',await page.inputValue('#'+id)==='');
   await group(id).locator('[data-help-use]').click();check(topic+' '+id+' explicit use fills answer',(await page.inputValue('#'+id)).includes('GUIDANCE_PRIVATE_8172'));
   await group(id).locator('[data-help-undo-button]').click();check(topic+' '+id+' undo restores empty answer',await page.inputValue('#'+id)==='');
  }
 }
 await fresh();await page.click('#reflection-example');await page.fill('#notice','Existing answer');await draft('notice','my plans change');
 await page.fill('#helper-notice-draft','My own edited draft.');await group('notice').locator('[data-help-append]').click();check('Append preserves original and edited draft',await page.inputValue('#notice')==='Existing answer\nMy own edited draft.');
 await group('notice').locator('[data-help-undo-button]').click();check('Undo restores original filled answer',await page.inputValue('#notice')==='Existing answer');
 await draft('notice','I feel connected');await group('notice').locator('[data-help-replace]').click();check('Replace is explicit',(await page.inputValue('#notice')).includes('I feel connected')&&!(await page.inputValue('#notice')).includes('Existing answer'));
 await group('notice').locator('[data-help-undo-button]').click();await draft('notice','A different answer');await group('notice').locator('[data-help-use]').isVisible();
 await group('notice').locator('[data-help-replace]').click();await page.fill('#notice','Manual edit after helper');check('Manual editing invalidates undo',!await group('notice').locator('[data-help-undo]').isVisible());
 await page.check('#reflection-save');await draft('context','Unfinished helper');check('Unaccepted helper text absent from saved draft',await page.evaluate(()=>!localStorage.getItem('signal-and-self-reflection-v1').includes('Unfinished helper')));await group('context').locator('[data-help-close]').click();
 await page.reload();await page.click('#reflection-resume-button');check('Accepted edits resume, unfinished helper does not',await page.inputValue('#notice')==='Manual edit after helper'&&!await group('context').locator('.guidance-panel').isVisible());await page.uncheck('#reflection-save');
 await fresh();await group('notice').locator('.guidance-open').click();await group('notice').locator('[data-help-nochange]').click();await group('notice').locator('[data-help-uncertain]').click();await group('notice').locator('[data-help-skip]').click();
 check('No change and uncertainty remain valid',(await page.inputValue('#helper-notice-draft')).includes('no clear change')&&(await page.inputValue('#helper-notice-draft')).includes('not sure'));
 await group('notice').locator('[data-help-back]').click();await group('notice').locator('[data-help-back]').click();check('Previous prompts preserve uncertainty',await page.inputValue('#helper-notice-answer')==='I am not sure yet.');
 await fresh();await draft('notice','Unused draft');await group('notice').locator('[data-help-close]').click();await page.selectOption('#reflection-topic','ai');check('Unfinished helper prompts topic-switch confirmation',await page.locator('#reflection-switch-confirm').isVisible());await page.click('#reflection-switch-no');check('Cancelled switch retains helper draft',await page.inputValue('#helper-notice-draft')!=='');await page.selectOption('#reflection-topic','ai');await page.click('#reflection-switch-yes');check('Confirmed switch clears helper responses',await page.inputValue('#helper-notice-draft')==='');
 await draft('notice','Clear this helper');await group('notice').locator('[data-help-close]').click();await page.click('#reflection-clear');await page.click('#reflection-clear-yes');check('Clear also clears helper responses',await page.inputValue('#helper-notice-draft')==='');
 const timing=await ctx.newPage();await timing.clock.install();await timing.goto(base+'/index.html');await timing.locator('#observation').focus();await timing.clock.runFor(59000);check('No offer before 60 focused seconds',!await timing.locator('[data-guidance-id="observation"] .guidance-offer').isVisible());await timing.clock.runFor(1500);check('Empty focused field receives optional offer',await timing.locator('[data-guidance-id="observation"] .guidance-offer').isVisible());check('Offer does not open helper or steal focus',!await timing.locator('#helper-observation-panel').isVisible()&&await timing.locator('#observation').evaluate(n=>n===document.activeElement));
 await timing.fill('#observation','Short answer');await timing.clock.runFor(130000);check('Short valid writing is not judged',!await timing.locator('[data-guidance-id="observation"] .guidance-offer').isVisible());
 await timing.locator('#context').focus();await timing.clock.runFor(62000);check('Second field can receive second offer',await timing.locator('[data-guidance-id="context"] .guidance-offer').isVisible());await timing.locator('#notice').focus();await timing.clock.runFor(200000);check('Session offers capped at two',!await timing.locator('[data-guidance-id="notice"] .guidance-offer').isVisible());await timing.close();
 const pause=await ctx.newPage();await pause.clock.install();await pause.goto(base+'/index.html');await pause.locator('#context').focus();await pause.clock.runFor(30000);await pause.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await pause.clock.runFor(120000);check('Hidden-page time does not trigger offer',!await pause.locator('[data-guidance-id="context"] .guidance-offer').isVisible());await pause.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await pause.clock.runFor(31500);check('Visible timing resumes after pause',await pause.locator('[data-guidance-id="context"] .guidance-offer').isVisible());await pause.locator('[data-guidance-id="context"] [data-help-dismiss]').click();await pause.locator('#notice').focus();await pause.clock.runFor(200000);check('No thanks stops proactive offers',!await pause.locator('[data-guidance-id="notice"] .guidance-offer').isVisible());await pause.locator('[data-guidance-id="notice"] .guidance-open').click();check('Manual help remains available after dismissal',await pause.locator('#helper-notice-panel').isVisible());await pause.close();
 await fresh();await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Two missing-answer checks offer help',await group('observation').locator('.guidance-offer').isVisible());check('Validation offer stays closed',!await group('observation').locator('.guidance-panel').isVisible());
 await fresh();await page.click('#reflection-example');await page.check('#reflection-save');await draft('notice','Export this accepted detail');await group('notice').locator('[data-help-replace]').click();await page.click('[data-reflection-step="3"]');await page.click('#reflection-finish');check('Accepted helper text reaches action plan',(await page.locator('#summary-content').innerText()).includes('Export this accepted detail'));await page.uncheck('#reflection-save');
 await fresh();await group('notice').locator('.guidance-open').focus();await page.keyboard.press('Enter');check('Keyboard opens help and focuses its input',await page.locator('#helper-notice-answer').evaluate(n=>n===document.activeElement));
 for(const theme of ['signal','midnight','quiet']){
  await page.selectOption('#theme',theme);for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:950});check(theme+' open helper fits '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();if(scan.violations.length)console.log(JSON.stringify(scan.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))));check(theme+' open helper accessible',scan.violations.length===0);
 }
 check('Private helper text absent from all requests',!requests.some(r=>r.includes('GUIDANCE_PRIVATE_8172')||r.includes('Unfinished helper')));check('No identity, analytics, or AI service requests',!requests.some(r=>/accounts.google|cloudflareinsights|api.openai/.test(r)));check('No JavaScript errors',errors.length===0);
}finally{await fs.mkdir(new URL('../../.build/qa/',import.meta.url),{recursive:true});await fs.writeFile(new URL('../../.build/qa/guidance-checks.json',import.meta.url),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({passed:checks.length,errors}));await browser.close();}
