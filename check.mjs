import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { qualifies } from './rules.mjs';
import { extract } from './extract.mjs';
const stores = JSON.parse(await fs.readFile(new URL('./stores.json', import.meta.url)));
await fs.mkdir('results', {recursive:true});
let previous = {}; try {previous = JSON.parse(await fs.readFile('state.json'));} catch {}
const next = {}, report = [];
if (!process.env.DISCORD_WEBHOOK_URL) throw new Error('DISCORD_WEBHOOK_URL missing');
const webhookResponse = await fetch(process.env.DISCORD_WEBHOOK_URL,{signal:AbortSignal.timeout(15000)});
await fs.writeFile('results/discord.json',JSON.stringify({verified:webhookResponse.ok,status:webhookResponse.status}));
if (!webhookResponse.ok) throw new Error('Discord webhook verification failed: '+webhookResponse.status);

const browser = await chromium.launch();
try {
 for (const store of stores) {
  const context = await browser.newContext({locale:'nl-NL'});
  const page = await context.newPage();
  let result = {store:store.name, url:store.url, status:'unknown', checkedAt:new Date().toISOString()};
  try {
   await page.goto(store.url, {waitUntil:'domcontentloaded',timeout:45000});
   await page.getByRole('heading',{level:1}).first().waitFor({timeout:15000});
   await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});
   const title = await page.getByRole('heading',{level:1}).first().innerText();
   const body = await page.locator('body').innerText();
   if (/captcha|verify you are human|access denied|robot check|you have been blocked/i.test(body)) throw new Error('Verification required');
   if (!/40th Anniversary/i.test(title)) throw new Error('Target product heading missing');
   const extracted = await page.evaluate(extract);
   const {price,available} = extracted;
   const purchase = page.locator('[data-stock-monitor-purchase=true]');
   result = {...result,...extracted,total:price === null ? null : price+store.shipping};
   // Lobbes must pass its actual cart, never just the product HTML.
   if (available && store.cartRequired) {
    await purchase.first().click();
    await page.goto(store.cartUrl,{waitUntil:'domcontentloaded'});
    const cart = await page.locator('body').innerText();
    result.cartVerified = /40th Anniversary/i.test(cart) && /99[,.]99/.test(cart) && !/niet leverbaar|niet beschikbaar|uitverkocht|binnenkort/i.test(cart);
   }
   result.status = qualifies(result,store) ? 'in_stock' : 'unconfirmed';
   await page.screenshot({path:`results/${store.id}.png`,fullPage:true});
   if (result.status === 'in_stock') {
    const fingerprint = `${result.total}`;
    next[store.id] = fingerprint;
    if (previous[store.id] !== fingerprint) {
     if (!process.env.DISCORD_WEBHOOK_URL) throw new Error('DISCORD_WEBHOOK_URL missing');
     const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({allowed_mentions:{parse:[]},content:`Verified stock: **${store.name}**\n${title}\n**€${result.total.toFixed(2)} delivered to the Netherlands**\n${store.delivery}\n${store.url}\nChecked ${result.checkedAt}`})});
     if (!response.ok) throw new Error(`Discord returned ${response.status}`);
    }
   }
  } catch (error) {result.error=error.message; next[store.id]=previous[store.id]; await page.screenshot({path:`results/${store.id}.png`,fullPage:true}).catch(()=>{});}
  report.push(result); await context.close();
 }
} finally {await browser.close();}
await fs.writeFile('state.json',JSON.stringify(next,null,2));
await fs.writeFile('results/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if (report.every(r=>r.error)) process.exitCode=1;
