const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.png':'image/png'};
// Each setup uses a fresh browser context: IndexedDB and storage never cross tests.
async function serveRepository(context, base) {
 await context.route(new URL(base).origin + '/**', async route => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(route.request().url()).pathname));
  if (!file.startsWith(root + path.sep)) return route.fulfill({status:403,body:''});
  try { await route.fulfill({body:await fs.readFile(file),contentType:types[path.extname(file)] || 'application/octet-stream'}); }
  catch (error) { if(error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error; await route.fulfill({status:404,body:''}); }
 });
}
module.exports = {serveRepository};
