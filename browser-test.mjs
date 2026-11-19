import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {extract} from './extract.mjs';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();
 const title='<h1>Nintendo Switch 2 Pro Controller Zelda 40th Anniversary Edition</h1>';
 const cases=[
 ['available',title+'<section>€109,99 <span>Op voorraad</span><button>In winkelwagen</button></section>',true],
 ['Lobbes unavailable',title+'<section>99,99 Dit artikel is binnenkort leverbaar.</section><footer>Nu besteld, morgen in huis</footer>',false],
 ['disabled button',title+'<section>€109,99 Op voorraad<button disabled>In winkelwagen</button></section>',false],
 ['sold out overrides',title+'<section>€109,99 Op voorraad Uitverkocht<button>In winkelwagen</button></section>',false],
 ['recommendations',title+'<section>Uitverkocht</section><h2>Anderen bekeken ook</h2><section>€89,99 Op voorraad<button>In winkelwagen</button></section>',false],
 ['ambiguous price',title+'<section>€109,99 €149,99 Op voorraad<button>In winkelwagen</button></section>',false]
 ];
 for(const [name,html,expected]of cases){await page.setContent(html);const r=await page.evaluate(extract);assert.equal(r.available,expected,name);console.log('PASS',name);}
} finally {await browser.close();}
