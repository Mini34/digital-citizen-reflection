(() => {
  'use strict';
  document.querySelectorAll('.js-only').forEach(n=>n.hidden=false);
  const select=document.querySelector('#theme'), key='digital-citizen-reflection-theme';
  const apply=value=>{const theme=['signal','midnight','quiet'].includes(value)?value:'signal';document.documentElement.dataset.theme=theme;select.value=theme;document.querySelector('meta[name="theme-color"]').content={signal:'#f4f0e8',midnight:'#0b1020',quiet:'#efeee9'}[theme];};
  try{apply(localStorage.getItem(key));}catch{apply('signal');}
  select.addEventListener('change',()=>{apply(select.value);try{localStorage.setItem(key,select.value);}catch{/* Theme stays usable for this visit. */}});
})();
