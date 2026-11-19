// Runs inside the page, after client-side stock rendering.
export function extract() {
 const visible=e=>!!(e.getClientRects().length) && getComputedStyle(e).visibility!=='hidden';
 const title=document.querySelector('h1')?.innerText||'';
 const controls=[...document.querySelectorAll('button,input[type=submit],a[role=button]')].filter(e=>visible(e)&&/in winkelwagen|in winkelmandje|toevoegen aan winkelwagen/i.test(e.innerText||e.value||e.getAttribute('aria-label')||''));
 for(const control of controls){
  if(control.disabled || control.getAttribute('aria-disabled')==='true') continue;
  let box=control.parentElement;
  for(let depth=0;box&&depth<6;depth++,box=box.parentElement){
   const text=box.innerText||'';
   if(text.length>3000) break;
   if(/niet (op voorraad|leverbaar|beschikbaar)|uitverkocht|binnenkort|pre.?order|tijdelijk niet/i.test(text)) continue;
   const positive=/\bop voorraad\b|nu besteld, morgen in huis/i.test(text);
   const prices=[...text.matchAll(/(?:€\s*)?(\d{1,3})\s*[,\.]\s*(\d{2})(?!\d)/g)].map(m=>Number(`${m[1]}.${m[2]}`));
   const unique=[...new Set(prices.filter(n=>n>=60&&n<=300))];
   if(positive&&unique.length===1){control.setAttribute('data-stock-monitor-purchase','true');return {title,price:unique[0],available:true,stockText:[text]};}
  }
 }
 return {title,available:false,stockText:[],price:null};
}
