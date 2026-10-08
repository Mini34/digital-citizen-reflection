(() => {
  'use strict';
  const dataNode=document.querySelector('#reflection-data');
  if(!dataNode) return;
  const data=JSON.parse(dataNode.textContent), configs=data.guidance;
  if(!configs) return;
  const groups=new Map(), offered=new Set(), failures=new Map();
  let stopped=false, offerCount=0, lastOffer=-Infinity, activeId=null, blankMs=0, lastTick=performance.now();
  const currentTopic=()=>document.querySelector('#reflection-topic').value;
  function close(g, focus=false) {
    g.panel.hidden=true;g.open.setAttribute('aria-expanded','false');
    if(focus)g.open.focus();
  }
  function preview(g) {
    g.previewing=true;
    g.draft.value=g.answers.map((a,i)=>{
      if(!a)return '';
      if(a.literal)return a.text;
      const text=a.text.trim();
      return g.config.prompts[i].starter+' '+text+(/[.!?]$/.test(text)?'':'.');
    }).filter(Boolean).join('\n');
    render(g);g.draft.focus();
  }
  function render(g) {
    const node=g.node, p=g.config.prompts[g.index];
    node.querySelector('[data-help-question-area]').hidden=g.previewing;
    node.querySelector('[data-help-preview]').hidden=!g.previewing;
    node.querySelector('[data-help-progress]').textContent=g.previewing?'Your draft is ready to review':`Prompt ${g.index+1} of ${g.config.prompts.length}`;
    node.querySelector('[data-help-hint]').textContent=g.config.hints[currentTopic()]||'';
    node.querySelector('[data-help-question]').textContent=p.question;
    node.querySelector('[data-help-starter]').textContent='Sentence starter: '+p.starter+' …';
    g.input.value=g.answers[g.index]?.text||'';
    node.querySelector('[data-help-nochange]').hidden=!p.noChange;
    node.querySelector('[data-help-back]').hidden=!g.previewing&&g.index===0;
    node.querySelector('[data-help-next]').hidden=g.previewing;
    node.querySelector('[data-help-next]').textContent=g.index===g.config.prompts.length-1?'Preview draft':'Next prompt';
    const empty=g.target.value.trim()==='';
    node.querySelector('[data-help-use]').hidden=!empty;
    node.querySelector('[data-help-append]').hidden=empty;
    node.querySelector('[data-help-replace]').hidden=empty;
  }
  function open(g) {
    groups.forEach(other=>{if(other!==g)close(other);});
    g.offer.hidden=true;g.panel.hidden=false;g.open.setAttribute('aria-expanded','true');
    render(g);(g.previewing?g.draft:g.input).focus();blankMs=0;
  }
  function advance(g, answer) {
    g.answers[g.index]=answer;
    if(g.index===g.config.prompts.length-1){preview(g);return;}
    g.index++;render(g);g.input.focus();
  }
  function apply(g, append) {
    const draft=g.draft.value.trim();
    if(!draft){g.message.textContent='Add a prompt response or write in the preview before using a draft.';return;}
    const old=g.target.value, combined=append&&old.trim()?old+'\n'+draft:draft;
    if(combined.length>g.target.maxLength){g.message.textContent='That would exceed the answer limit. Shorten the draft, or replace the answer instead.';return;}
    g.target.value=combined;g.undo={old,inserted:combined};
    g.node.querySelector('[data-help-undo]').hidden=false;
    g.answers=[];g.index=0;g.previewing=false;g.draft.value='';g.input.value='';
    close(g);g.target.dispatchEvent(new Event('input',{bubbles:true}));g.target.focus();
  }
  function offer(g) {
    const now=performance.now();
    if(stopped||offerCount>=2||offered.has(g.id)||now-lastOffer<120000||document.hidden||!g.panel.hidden||g.target.value.trim()||!g.target.getClientRects().length)return;
    offered.add(g.id);offerCount++;lastOffer=now;g.offer.hidden=false;
  }
  document.querySelectorAll('[data-guidance-id]').forEach(node=>{
    const id=node.dataset.guidanceId,config=configs[id];if(!config)return;
    const g={id,node,config,target:document.getElementById(id),panel:node.querySelector('.guidance-panel'),open:node.querySelector('.guidance-open'),offer:node.querySelector('.guidance-offer'),input:node.querySelector(`#helper-${id}-answer`),draft:node.querySelector(`#helper-${id}-draft`),message:node.querySelector('[data-help-message]'),index:0,answers:[],previewing:false,undo:null};
    groups.set(id,g);node.parentElement.querySelector('.guidance-fallback').hidden=true;
    g.open.hidden=false;
    const on=(selector,fn)=>node.querySelector(selector).addEventListener('click',fn);
    g.open.addEventListener('click',()=>g.panel.hidden?open(g):close(g,true));
    on('[data-help-close]',()=>close(g,true));on('[data-help-accept]',()=>open(g));
    g.panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(g,true);}});
    on('[data-help-dismiss]',()=>{stopped=true;groups.forEach(x=>x.offer.hidden=true);g.open.focus();});
    on('[data-help-next]',()=>advance(g,g.input.value.trim()?(g.answers[g.index]?.text===g.input.value.trim()?g.answers[g.index]:{text:g.input.value.trim(),literal:false}):null));
    on('[data-help-uncertain]',()=>advance(g,{text:g.config.prompts[g.index].uncertain,literal:true}));
    on('[data-help-nochange]',()=>advance(g,{text:g.config.prompts[g.index].noChange,literal:true}));
    on('[data-help-skip]',()=>advance(g,null));
    on('[data-help-back]',()=>{if(g.previewing){g.previewing=false;}else{g.index=Math.max(0,g.index-1);}render(g);g.input.focus();});
    g.input.addEventListener('input',()=>{g.answers[g.index]=g.input.value.trim()?{text:g.input.value.trim(),literal:false}:null;});
    on('[data-help-use]',()=>apply(g,false));on('[data-help-replace]',()=>apply(g,false));on('[data-help-append]',()=>apply(g,true));
    on('[data-help-undo-button]',()=>{if(g.undo&&g.target.value===g.undo.inserted){g.target.value=g.undo.old;g.undo=null;node.querySelector('[data-help-undo]').hidden=true;g.target.dispatchEvent(new Event('input',{bubbles:true}));g.target.focus();}});
    g.target.addEventListener('input',()=>{g.offer.hidden=true;if(g.undo&&g.target.value!==g.undo.inserted){g.undo=null;node.querySelector('[data-help-undo]').hidden=true;}});
  });
  document.addEventListener('dcr:validation-missing',event=>{
    const id=event.detail.id,g=groups.get(id);if(!g)return;
    failures.set(id,(failures.get(id)||0)+1);if(failures.get(id)>=2)offer(g);
  });
  setInterval(()=>{
    const now=performance.now(),elapsed=now-lastTick;lastTick=now;
    const id=document.activeElement?.id,g=groups.get(id);
    if(document.hidden)return;
    if(!g||!g.panel.hidden||g.target.value.trim()||!g.target.getClientRects().length){activeId=null;blankMs=0;return;}
    if(activeId!==id){activeId=id;blankMs=0;}
    else blankMs+=elapsed;
    if(blankMs>=60000)offer(g);
  },250);
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();});
  window.DCRGuidance={
    hasPending:()=>[...groups.values()].some(g=>g.answers.some(Boolean)||g.draft.value.trim()),
    reset:()=>{groups.forEach(g=>{g.answers=[];g.index=0;g.previewing=false;g.undo=null;g.input.value='';g.draft.value='';g.message.textContent='';g.offer.hidden=true;g.node.querySelector('[data-help-undo]').hidden=true;close(g);});failures.clear();blankMs=0;activeId=null;}
  };
})();
