(() => {
  'use strict';
  const form = document.querySelector('#reflection-form');
  if (!form) return;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const data = JSON.parse($('#reflection-data').textContent), key = 'signal-and-self-reflection-v1';
  const fields = ['observation','context','notice','evidenceResponse','risk','riskDetail','benefit','change','check','reviewDate','before','after'];
  let step = 0, mode = 'own', saving = false, pending = null, stored = null, activeTopic = 'attention';
  function dateAhead() { const d = new Date(); d.setDate(d.getDate()+7); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  const topic = () => data.topics.find(t=>t.id===activeTopic);
  function state() { return {version:1,topic:activeTopic,mode,step,...Object.fromEntries(fields.map(id=>[id,$('#'+id).value]))}; }
  function valid(s) {
    if (!s || s.version!==1 || !data.topics.some(t=>t.id===s.topic) || !['own','example'].includes(s.mode) || !Number.isInteger(s.step) || s.step<0 || s.step>3) return false;
    if (!fields.every(id=>typeof s[id]==='string' && s[id].length<=1500)) return false;
    const t = data.topics.find(t=>t.id===s.topic);
    if (s.risk && ![...t.risks,'other'].includes(s.risk)) return false;
    if (!['before','after'].every(id=>{
      if(s[id]==='') return true;
      const input=document.createElement('input');
      Object.assign(input,{type:'number',min:'0',max:'1440',step:'1',value:s[id]});
      return input.value!=='' && input.checkValidity();
    })) return false;
    if (s.reviewDate && (!/^\d{4}-\d{2}-\d{2}$/.test(s.reviewDate) || new Date(s.reviewDate+'T12:00:00Z').toISOString().slice(0,10)!==s.reviewDate)) return false;
    return true;
  }
  const status = message => { const node=$('#reflection-storage-status'); if(node.textContent!==message)node.textContent=message; };
  // Validate only reflection fields; unfinished helper text stays independent.
  fields.forEach(id=>{
    const control=$('#'+id), error=document.createElement('p');
    error.id=id+'-error';error.className='field-error';error.hidden=true;
    control.insertAdjacentElement('afterend',error);
    control.setAttribute('aria-describedby',[(control.getAttribute('aria-describedby')||''),error.id].filter(Boolean).join(' '));
  });
  function errorMessage(control) {
    if(control.required&&!control.value.trim()) {
      if(control.tagName==='TEXTAREA')return 'Add a short answer, use Help me answer, or write “I’m not sure yet.”';
      if(control.type==='date')return 'Choose a date to review your change.';
      return 'Choose an option before building your plan.';
    }
    if(!control.checkValidity())return control.type==='number'?'Enter a whole number from 0 to 1,440 minutes.':'Check this value before building your plan.';
    return '';
  }
  function updateErrorSummary() {
    const invalid=fields.map(id=>$('#'+id)).find(control=>control.getAttribute('aria-invalid')==='true'&&errorMessage(control));
    const summary=$('#reflection-error-summary');
    summary.hidden=!invalid;
    if(invalid) {
      const section=invalid.closest('.reflection-step');
      const message='There’s an answer to check in step '+(Number(section.dataset.step)+1)+'. '+errorMessage(invalid);
      if(summary.textContent!==message)summary.textContent=message;
    }
  }
  function clearError(control) {
    if(!errorMessage(control)) {
      $('#'+control.id+'-error').hidden=true;control.removeAttribute('aria-invalid');
    }
    updateErrorSummary();
  }
  function updateRisk() {
    const custom=$('#risk').value==='other';$('#riskDetail').required=custom;
    $('label[for="riskDetail"] [data-field-label]').textContent=custom?'Describe your risk':'Describe the risk';
    $('label[for="riskDetail"] [data-field-requirement]').textContent=custom?'Required':'Optional';
    $('[data-guidance-id="riskDetail"] .guidance-open .visually-hidden').textContent=custom?': Describe your risk':': Describe the risk (optional)';
    clearError($('#riskDetail'));
  }
  function persist() {
    if (!saving) return;
    try { localStorage.setItem(key,JSON.stringify(state())); status('Draft saved on this device. No answers are sent to the site.'); }
    catch { saving=false; $('#reflection-save').checked=false; status('Saving failed. Your answers remain in this temporary session; you can download the action plan.'); }
  }
  function renderTopic() {
    $('#reflection-topic').value=activeTopic;
    $('#risk').replaceChildren();
    for (const [value,label] of [['','Choose a risk'],...topic().risks.map(r=>[r,r]),['other','Describe my own risk']]) { const opt=document.createElement('option'); opt.value=value; opt.textContent=label; $('#risk').append(opt); }
    $$('[data-source-topics]').forEach(n=>n.hidden=!n.dataset.sourceTopics.split(' ').includes(activeTopic));
    $('#attention-comparison').hidden=activeTopic!=='attention';
  }
  function arithmetic() {
    const a=$('#before'), b=$('#after'), ready=a.value!==''&&b.value!==''&&a.checkValidity()&&b.checkValidity();
    let text='Enter both values to compare them. These are arithmetic estimates, not health recommendations.';
    if (ready) { const diff=Number(a.value)-Number(b.value); text=`Current: ${a.value} min/day. Planned: ${b.value} min/day. ${Math.abs(diff)} minutes ${diff>=0?'less':'more'} per day; ${Math.abs(diff*7)} minutes ${diff>=0?'less':'more'} over seven days if repeated daily. Arithmetic estimate, not a measured outcome or health recommendation.`; }
    if($('#reflection-arithmetic').textContent!==text)$('#reflection-arithmetic').textContent=text;
    const max=Math.max(Number(a.value)||0,Number(b.value)||0,1);
    $('#before-bar').style.width=ready?`${Number(a.value)/max*100}%`:'0%'; $('#after-bar').style.width=ready?`${Number(b.value)/max*100}%`:'0%';
  }
  function renderMode() { $('#reflection-mode').textContent=mode==='example'?'Fictional example · editable; not a measured result':'Your own reflection · private to this browser'; }
  function navigate(n, focus=true) {
    step=n; $('#reflection-summary').hidden=true; form.hidden=false;
    $$('.reflection-step').forEach((node,i)=>node.hidden=i!==step);
    $$('[data-reflection-step]').forEach((node,i)=>{if(i===step) node.setAttribute('aria-current','step'); else node.removeAttribute('aria-current');});
    $('#reflection-progress').textContent=`Step ${step+1} of 4 · ${['Observe','Evaluate','Identify','Act'][step]}`;
    $('#reflection-back').disabled=step===0; $('#reflection-next').hidden=step===3;
    if (focus) $(`.reflection-step[data-step="${step}"] h3`).focus(); persist();
  }
  function hasAnswers() { return fields.filter(id=>id!=='reviewDate').some(id=>$('#'+id).value!=='') || Boolean(window.DCRGuidance?.hasPending()); }
  function loadNew(id, example) {
    window.DCRGuidance?.reset();
    activeTopic=id; mode=example?'example':'own'; renderTopic();
    fields.forEach(f=>{$('#'+f).value=example?(topic().example[f]||''):'';$('#'+f+'-error').hidden=true;$('#'+f).removeAttribute('aria-invalid');}); $('#reviewDate').value=dateAhead();updateRisk();$('#reflection-error-summary').hidden=true;
    renderMode(); arithmetic(); navigate(0); persist();
  }
  function requestSwitch(id, example) {
    $('#reflection-topic').value=activeTopic;
    if (!hasAnswers()) { loadNew(id,example); return; }
    navigate(0,false);pending={id,example}; $('#reflection-switch-confirm').hidden=false; $('#reflection-switch-yes').focus();
  }
  function complete() {
    for (let i=0;i<4;i++) {
      const section=$(`.reflection-step[data-step="${i}"]`);
      $('#risk').required=true;
      updateRisk();
      const invalid=fields.map(id=>$('#'+id)).find(el=>section.contains(el)&&errorMessage(el));
      if (invalid) {
        navigate(i,false);const error=$('#'+invalid.id+'-error');error.textContent=errorMessage(invalid);error.hidden=false;invalid.setAttribute('aria-invalid','true');
        updateErrorSummary();
        invalid.focus();if(invalid.value.trim()==='')document.dispatchEvent(new CustomEvent('dcr:validation-missing',{detail:{id:invalid.id}}));return;
      }
    }
    showSummary();
  }
  function summaryRows() {
    const s=state(); return [['Topic',topic().label],['Observe',s.observation],['Context',s.context],['What I notice',s.notice],['Evidence and its limits',s.evidenceResponse],['Risk',s.risk==='other'?s.riskDetail:s.risk+(s.riskDetail?' · '+s.riskDetail:'')],['Benefit to keep',s.benefit],['Change to try',s.change],['Check progress',s.check],['Review date',s.reviewDate],...(activeTopic==='attention'&&s.before!==''&&s.after!==''?[['Time comparison',$('#reflection-arithmetic').textContent]]:[])];
  }
  function showSummary() {
    $('#summary-mode').textContent=mode==='example'?'Fictional example action plan · edited examples remain fictional':'Personal action plan · kept in this browser';
    $('#summary-content').replaceChildren();$('#summary-reflection').replaceChildren();$('#summary-supporting').open=false;
    const rows=summaryRows(), priorities=['Change to try','Check progress','Review date'];
    for(const [label,value] of [...priorities.map(label=>rows.find(row=>row[0]===label)),...rows.filter(row=>!priorities.includes(row[0]))]) {const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;(priorities.includes(label)?$('#summary-content'):$('#summary-reflection')).append(dt,dd);}
    form.hidden=true; $('#reflection-summary').hidden=false; $('#summary-title').focus(); persist();
  }
  function clear() {
    let removed=true; try {localStorage.removeItem(key);} catch {removed=false;}
    saving=false; stored=null; $('#reflection-save').checked=false; $('#reflection-resume').hidden=true; $('#reflection-clear-confirm').hidden=true;
    loadNew(activeTopic,false); status(removed?'Reflection cleared. Nothing is saved.':'Answers cleared from this page. Browser storage could not be cleared; use browser settings to remove any saved draft.'); $('#reflection-clear').focus();
  }
  form.addEventListener('input',event=>{if(fields.includes(event.target.id)){clearError(event.target);if(event.target.id==='risk')updateRisk();arithmetic();persist();}});
  $('#risk').addEventListener('change',()=>{updateRisk();clearError($('#risk'));});
  $('#reflection-topic').addEventListener('change',event=>requestSwitch(event.target.value,false));
  $('#reflection-example').addEventListener('click',()=>requestSwitch(activeTopic,true));
  $('#reflection-own').addEventListener('click',()=>requestSwitch(activeTopic,false));
  $('#reflection-start-own').addEventListener('click',event=>{event.preventDefault();if(mode==='own')navigate(step);else requestSwitch(activeTopic,false);});
  $('#reflection-start-example').addEventListener('click',event=>{event.preventDefault();requestSwitch('news',true);});
  $('#reflection-switch-yes').addEventListener('click',()=>{const change=pending;pending=null;$('#reflection-switch-confirm').hidden=true;if(change)loadNew(change.id,change.example);});
  $('#reflection-switch-no').addEventListener('click',()=>{pending=null;$('#reflection-switch-confirm').hidden=true;$('#reflection-topic').focus();});
  $('#reflection-next').addEventListener('click',()=>navigate(Math.min(step+1,3)));
  $('#reflection-back').addEventListener('click',()=>navigate(Math.max(step-1,0)));
  $$('[data-reflection-step]').forEach(n=>n.addEventListener('click',()=>navigate(Number(n.dataset.reflectionStep))));
  $('#reflection-finish').addEventListener('click',complete); $('#reflection-edit').addEventListener('click',()=>navigate(0));
  $('#reflection-save').addEventListener('change',event=>{
    saving=event.target.checked;
    if(saving) {stored=null;$('#reflection-resume').hidden=true;persist();}
    else {try{localStorage.removeItem(key);stored=null;$('#reflection-resume').hidden=true;status('Saving disabled and stored draft removed. Your current answers remain on this page.');}catch{status('Saving disabled, but the stored draft could not be removed. Use browser settings to clear site data.');}}
  });
  $('#reflection-clear').addEventListener('click',()=>{$('#reflection-clear-confirm').hidden=false;$('#reflection-clear-yes').focus();});
  $('#reflection-clear-yes').addEventListener('click',clear); $('#reflection-clear-no').addEventListener('click',()=>{$('#reflection-clear-confirm').hidden=true;$('#reflection-clear').focus();});
  $('#reflection-resume-button').addEventListener('click',()=>{if(!stored)return;activeTopic=stored.topic;mode=stored.mode;renderTopic();fields.forEach(f=>$('#'+f).value=stored[f]);updateRisk();fields.forEach(f=>clearError($('#'+f)));renderMode();arithmetic();saving=true;$('#reflection-save').checked=true;$('#reflection-resume').hidden=true;navigate(stored.step);});
  $('#reflection-download').addEventListener('click',()=>{
    const text=['Digital Citizen Reflection', $('#summary-mode').textContent,'',...summaryRows().map(([k,v])=>`${k}\n${v}\n`),'Sources',...data.sources.filter(s=>s.topics.includes(activeTopic)).map(s=>`${s.publisher}: ${s.url}`)].join('\n');
    const blob=new Blob([text],{type:'text/plain;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='digital-citizen-action-plan.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  $('#reflection-print').addEventListener('click',()=>window.print());
  let printDisclosures=[];
  window.addEventListener('beforeprint',()=>{printDisclosures=[$('#summary-supporting'),...$$('.reflection-source details')].map(node=>({node,open:node.open}));printDisclosures.forEach(({node})=>node.open=true);});
  window.addEventListener('afterprint',()=>{printDisclosures.forEach(({node,open})=>node.open=open);printDisclosures=[];});
  renderTopic(); $('#reviewDate').value=dateAhead();renderMode();arithmetic();navigate(0,false);$('.reflection-nojs').hidden=true;
  try { const raw=localStorage.getItem(key);if(raw){try{const s=JSON.parse(raw);if(!valid(s))throw Error('Invalid draft');stored=s;$('#reflection-resume').hidden=false;status('Saved draft found. Choose Resume to open it.');}catch{localStorage.removeItem(key);status('The saved draft could not be read and was removed. Start a new reflection.');}}}catch{status('Browser storage is unavailable. Continue temporarily or download your action plan.');}
})();
