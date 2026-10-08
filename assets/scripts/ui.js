(() => {
  'use strict';
  const root=document.documentElement;
  document.querySelectorAll('.js-only').forEach(node=>node.hidden=false);
  const themeSelect=document.querySelector('#theme'), themeKey='digital-citizen-reflection-theme';
  const applyTheme=value=>{
    const theme=['signal','midnight'].includes(value)?value:'signal';
    root.dataset.theme=theme;themeSelect.value=theme;
    document.querySelector('meta[name="theme-color"]').content={signal:'#f4f0e8',midnight:'#0b1020'}[theme];
  };
  try{applyTheme(localStorage.getItem(themeKey));}catch{applyTheme('signal');}
  themeSelect.addEventListener('change',()=>{
    applyTheme(themeSelect.value);
    try{localStorage.setItem(themeKey,themeSelect.value);}catch{/* Theme remains usable for this visit. */}
  });
  const readingKey='digital-citizen-reflection-accessibility-v1';
  const defaults={version:1,size:'standard',contrast:false,spacing:false,motion:false};
  const controls={size:document.querySelector('#reading-size'),contrast:document.querySelector('#reading-contrast'),spacing:document.querySelector('#reading-spacing'),motion:document.querySelector('#reading-motion')};
  const message=document.querySelector('#reading-status'), panel=document.querySelector('#reading-options');
  let settings={...defaults}, canRemember=true;
  const valid=value=>value&&value.version===1&&['standard','large','extra-large'].includes(value.size)&&['contrast','spacing','motion'].every(key=>typeof value[key]==='boolean');
  const status=text=>{if(message.textContent!==text)message.textContent=text;};
  function applyReading(){
    root.dataset.textSize=settings.size;
    root.dataset.highContrast=String(settings.contrast);
    root.dataset.spacious=String(settings.spacing);
    root.dataset.reduceMotion=String(settings.motion);
    controls.size.value=settings.size;
    ['contrast','spacing','motion'].forEach(key=>controls[key].checked=settings[key]);
  }
  try{
    const raw=localStorage.getItem(readingKey);
    if(raw){try{const saved=JSON.parse(raw);if(!valid(saved))throw Error('Invalid reading options');settings={...defaults,size:saved.size,contrast:saved.contrast,spacing:saved.spacing,motion:saved.motion};}catch{localStorage.removeItem(readingKey);status('The saved reading options could not be read. Standard options are active.');}}
  }catch{canRemember=false;status('Viewing options work for this visit. This browser cannot remember them.');}
  applyReading();
  for(const [key,control] of Object.entries(controls))control.addEventListener('change',()=>{
    settings[key]=key==='size'?control.value:control.checked;applyReading();
    try{localStorage.setItem(readingKey,JSON.stringify(settings));canRemember=true;}catch{canRemember=false;}
    status(canRemember?'Reading options updated and remembered on this device.':'Reading options updated for this visit. This browser cannot remember them.');
  });
  document.querySelector('#reading-reset').addEventListener('click',()=>{
    settings={...defaults};applyReading();
    try{localStorage.removeItem(readingKey);status('Reading options reset. Your theme and reflection answers are unchanged.');}catch{status('Reading options reset for this visit. This browser could not remove the saved options.');}
  });
  panel.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();panel.open=false;panel.querySelector('summary').focus();}
  });
})();
