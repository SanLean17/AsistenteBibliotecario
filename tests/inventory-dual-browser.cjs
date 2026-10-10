const {setup,assert,noOverflow}=require('./ui-helpers.cjs');
(async()=>{
 const {page,go,finish}=await setup({deviceScaleFactor:1});
 await go('inventario');

 await page.getByRole('button',{name:'Empezar con la cámara',exact:true}).click();
 await page.getByText('INVENTARIO SIN ZONA · GUARDADO',{exact:true}).waitFor();
 await page.getByText(/Zona pendiente de configurar/).waitFor();
 await page.getByText(/Podés salir de esta pantalla y continuar más tarde/).waitFor();

 // Add a sector after the quick draft already exists.
 await page.locator('#local-location [name=name]').first().fill('Sala principal');
 await page.locator('#local-location button').first().click();
 await page.locator('article strong').filter({hasText:'Sala principal'}).waitFor();

 // Draft survives navigation away and back.
 await go('biblioteca');
 await go('inventario');
 await page.getByText('INVENTARIO SIN ZONA · GUARDADO',{exact:true}).waitFor();

 const scopeForm=page.locator('#local-inventory-scope');
 await scopeForm.locator('[name=locationId]').selectOption({label:'Sala principal'});
 await scopeForm.getByRole('button',{name:'Asignar zona y clasificar'}).click();
 await page.getByText('INVENTARIO EN CURSO',{exact:true}).waitFor();
 await page.getByText(/Zona:.*Sala principal/).waitFor();

 for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await noOverflow(page,'inventory dual flow '+width);
 }
 await finish();
 console.log('PASS quick inventory draft, later zone assignment and responsive layout');
})().catch(e=>{console.error(e);process.exit(1);});
