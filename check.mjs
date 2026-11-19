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


let solves = 0;
async function solveTurnstile(page) {
 if (!process.env.CAPSOLVER_API_KEY || solves >= 1) return;
 const widget = page.locator('[data-sitekey]').first();
 const key = await widget.getAttribute('data-sitekey').catch(()=>null);
 if (!key) return;
 solves++;
 const api = async (method, data) => {
  const response = await fetch('https://api.capsolver.com/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({clientKey:process.env.CAPSOLVER_API_KEY,...data}),signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw new Error('CapSolver HTTP '+response.status);
  const result = await response.json();
  if (result.errorId) throw new Error('CapSolver '+(result.errorCode || 'failed'));
  return result;
 };
 const task = await api('createTask',{task:{type:'AntiTurnstileTaskProxyLess',websiteURL:page.url(),websiteKey:key}});
 for (let attempt=0;attempt<20;attempt++) {
  await page.waitForTimeout(3000);
  const result=await api('getTaskResult',{taskId:task.taskId});
  if(result.status !== 'ready') continue;
  if(!result.solution?.token) throw new Error('CapSolver token missing');
  await page.evaluate(token=>{
   const input=document.querySelector('[name="cf-turnstile-response"]');
   if(input){input.value=token;input.dispatchEvent(new Event('change',{bubbles:true}));}
   const callback=document.querySelector('[data-callback]')?.getAttribute('data-callback');
   if(callback && typeof window[callback]==='function') window[callback](token);
  },result.solution.token);
  await page.waitForTimeout(3000);
  return;
 }
 throw new Error('CapSolver timed out');
}

const browser = await chromium.launch();
try {
 for (const store of stores) {
  const context = await browser.newContext({locale:'nl-NL'});
  const page = await context.newPage();
  let result = {store:store.name, url:store.url, status:'unknown', checkedAt:new Date().toISOString()};
  try {
   await page.goto(store.url, {waitUntil:'domcontentloaded',timeout:45000});
   await solveTurnstile(page);
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
