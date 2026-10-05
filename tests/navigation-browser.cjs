const {setup,noOverflow,assert,base}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup({deviceScaleFactor:1});
 for(const theme of ['light','dark']){
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(base);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);await noOverflow(page,`public ${theme} ${width}`);
   assert.ok(await page.evaluate(()=>document.fonts.check('14px Inter')&&document.fonts.check('italic 36px Lora')));
   await page.screenshot({path:`qa/gradient-public-${theme}-${width}.png`,fullPage:true});
   await go('inicio');await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(200);await noOverflow(page,`app ${theme} ${width}`);
   assert.equal(await page.locator('.mobile-nav').count(),0);
   await page.screenshot({path:`qa/gradient-app-${theme}-${width}.png`,fullPage:true});
   if(width<=760){
    const toggle=page.locator('#app-menu-toggle');await toggle.click();await page.locator('#workspace-menu').waitFor();
    await page.screenshot({path:`qa/gradient-menu-${theme}-${width}.png`});
    for(const route of ['biblioteca','agregar','ejemplares','configuracion','inicio']){
     await page.locator(`#workspace-menu a[data-nav=${route}]`).click();await page.waitForURL('**#'+route);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#workspace-menu').isVisible(),false);await noOverflow(page,route);await toggle.click();
    }
    await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await toggle.evaluate(el=>document.activeElement===el));
    await toggle.click();await page.mouse.click(width-8,700);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    await toggle.click();await page.setViewportSize({width:1100,height:900});await page.waitForFunction(()=>document.querySelector('#app-menu-toggle').getAttribute('aria-expanded')==='false');await page.setViewportSize({width,height:900});assert.equal(await page.locator('#workspace-menu').isVisible(),false);
   }else{assert.ok(await page.locator('.sidebar').isVisible());assert.equal(await page.locator('#app-menu-toggle').isVisible(),false);}
  }
 }
 await finish();console.log('PASS gradients / shared fonts / no overflow / menu routes, Escape, outside close, viewport changes; both themes at 320,390,768,1440.');
})().catch(e=>{console.error(e);process.exit(1)});
