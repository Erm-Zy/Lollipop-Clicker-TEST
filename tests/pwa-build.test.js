import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildPwa } from '../scripts/build-pwa.mjs';

test('release build is deterministic, verifies actual deployed bytes and excludes non-web files', () => {
  const temp=mkdtempSync(join(tmpdir(),'lollipop-build-'));
  try {
    const root=join(temp,'source'),out=join(temp,'artifact');
    mkdirSync(root);
    for (const file of ['index.html','manifest.json','icon-192.png','icon-512.png','.nojekyll','pages','css','js','assets','sw.js']) cpSync(file,join(root,file),{recursive:true});
    const first=buildPwa({root,out});
    assert.equal(buildPwa({root,out}).id,first.id);
    assert.equal(first.assets.filter(a=>a.path.endsWith('.html')).length,9);
    assert.ok(first.assets.some(a=>a.path==='js/pwa/update.js' && a.required));
    assert.ok(!existsSync(join(out,'js/native/android.js')));
    for (const asset of first.assets) assert.equal(createHash('sha256').update(readFileSync(join(out,asset.path))).digest('hex'),asset.hash);
    assert.ok(readFileSync(join(out,'index.html'),'utf8').includes(first.id));
    writeFileSync(join(root,'README.md'),'documentation only');
    assert.equal(buildPwa({root,out}).id,first.id);
    writeFileSync(join(root,'css/global.css'),'\n/* deployed change */',{flag:'a'});
    assert.notEqual(buildPwa({root,out}).id,first.id);
    assert.throws(()=>buildPwa({root,out:root}),/inseguro/);
    assert.throws(()=>buildPwa({root,out:temp}),/inseguro/);
    assert.throws(()=>buildPwa({root,out:join(root,'js','generated')}),/inseguro/);
    const unrelated=join(temp,'unrelated');mkdirSync(unrelated);writeFileSync(join(unrelated,'keep'),'keep');
    assert.throws(()=>buildPwa({root,out:unrelated}),/recusa/);
    assert.equal(readFileSync(join(unrelated,'keep'),'utf8'),'keep');
  } finally { rmSync(temp,{recursive:true,force:true}); }
});
