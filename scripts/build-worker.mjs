import {build} from 'esbuild';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const assets={};
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await walk(p);else assets['/'+path.relative('dist/client',p)]={body:(await readFile(p)).toString('base64'),type:({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'})[path.extname(p)]||'application/octet-stream'};}}
await walk('dist/client');
const entry=`import {dataResponse} from './server/data.js';
const assets=${JSON.stringify(assets)};
export default {async fetch(request){const url=new URL(request.url);if(url.pathname==='/api/dashboard')return dataResponse();if(url.pathname.startsWith('/api/'))return Response.json({error:'Not found'},{status:404});const asset=assets[url.pathname]||(!url.pathname.split('/').pop().includes('.')?assets['/index.html']:null);if(!asset)return new Response('Not found',{status:404});const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':asset.type,'Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});}};`;
await mkdir('dist/server',{recursive:true});
await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'worker.js'},bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'dist/server/index.js',minify:true});
console.log('Built Worker with bundled React assets and live FPL API.');
