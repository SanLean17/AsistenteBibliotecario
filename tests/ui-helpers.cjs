const {chromium,webkit,firefox,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173/';
async function setup(options={}){
 fs.mkdirSync('qa',{recursive:true});
 const engine=process.env.TEST_ENGINE==='webkit'?webkit:process.env.TEST_ENGINE==='firefox'?firefox:chromium;
 const browser=await engine.launch({timeout:20000,headless:true,...(engine===chromium?{channel:process.env.BROWSER_CHANNEL||'msedge'}:{})});
 const device={...devices[process.env.TEST_ENGINE==='webkit'?'iPhone 13':'Pixel 7']};if(engine===firefox){delete device.isMobile;delete device.defaultBrowserType;delete device.userAgent;}
 const context=await browser.newContext({...device,viewport:{width:390,height:844},acceptDownloads:true,...options});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://fonts.googleapis.com/**',r=>r.abort());
 await page.route('https://covers.openlibrary.org/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#ED5AB3"/><text x="20" y="140">EL HOBBIT</text></svg>'}));
 const go=async hash=>{await page.goto(base+'app.html#'+hash);const target={inicio:'.home-search',biblioteca:'#search',agregar:'#isbn-form',ejemplares:'.holdings-list',configuracion:'[data-action="clear-catalog"]',ficha:'.record-page',editar:'#book-form'}[hash.split('/')[0]];await page.locator(target||'main h1').first().waitFor();};
 const finish=async()=>{assert.deepEqual(errors,[]);await browser.close();};
 return {browser,context,page,errors,go,finish};
}
async function fixture(page){
 await page.route('https://www.googleapis.com/books/v1/**',r=>r.fulfill({json:{}}));
 await page.route('https://openlibrary.org/api/books?**',r=>r.fulfill({json:JSON.parse(fs.readFileSync('tests/fixtures/hobbit.json','utf8').replace(/^\uFEFF/,''))}));
}
async function lookup(page){await page.locator('#isbn-query').fill('950-547-063-0');await page.locator('#isbn-search').click();await page.locator('#confirm-isbn').waitFor();}
async function save(page){await page.getByRole('button',{name:'Guardar en el catálogo',exact:true}).click();await page.locator('.record-page').waitFor();assert.equal(new URL(page.url()).search,'');}
async function noOverflow(page,label){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' overflow');}
module.exports={setup,fixture,lookup,save,noOverflow,assert,fs,base};
