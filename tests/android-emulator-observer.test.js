import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

test('emulator observer records actual child signal and redacts bounded output',()=>{
 const root=mkdtempSync(join(tmpdir(),'emulator-observer-'));
 try {
  mkdirSync(join(root,'bin'));
  writeFileSync(join(root,'bin/adb'),'#!/bin/sh\necho device\n',{mode:0o755});
  const fixture=join(root,'emulator');
  writeFileSync(fixture,'#!/bin/sh\necho "androidboot.qemu.adb.pubkey=DO_NOT_COPY"\necho "native crash marker" >&2\nkill -ABRT $$\n',{mode:0o755});
  const run=spawnSync('python3',[resolve('scripts/android-emulator-observer.py'),'supervise',fixture,'-avd','test'],{env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,RUNNER_TEMP:root,ANDROID_SMOKE_API:'35'},encoding:'utf8',timeout:15000});
  assert.equal(run.status,134,run.stderr);
  const out=join(root,'android-smoke/api-35');
  const status=JSON.parse(readFileSync(join(out,'emulator-exit.json'),'utf8'));
  assert.equal(status.returncode,-6);assert.equal(status.signal,'SIGABRT');
  assert.ok(status.started_utc);assert.ok(status.ended_utc);
  const log=readFileSync(join(out,'emulator.log'),'utf8');
  assert.match(log,/native crash marker/);assert.doesNotMatch(log,/DO_NOT_COPY/);
 } finally {rmSync(root,{recursive:true,force:true});}
});

test('pre-launch hook can observe two sequential API images without replacing its backup',()=>{
 const root=mkdtempSync(join(tmpdir(),'emulator-hook-'));
 try {
  mkdirSync(join(root,'emulator'));
  const binary=join(root,'emulator/emulator');
  writeFileSync(binary,'#!/bin/sh\necho "fixture emulator version"\n',{mode:0o755});
  for (const api of ['34','35']) {
   const run=spawnSync('python3',[resolve('scripts/android-emulator-observer.py'),'install'],{env:{...process.env,ANDROID_HOME:root,RUNNER_TEMP:root,ANDROID_SMOKE_API:api},encoding:'utf8',timeout:10000});
   assert.equal(run.status,0,run.stderr);
   assert.match(readFileSync(join(root,`android-smoke/api-${api}/emulator-version.txt`),'utf8'),/fixture emulator version/);
  }
  assert.match(readFileSync(binary,'utf8'),/supervise/);
  assert.doesNotMatch(readFileSync(join(root,'emulator/emulator.smoke-real'),'utf8'),/supervise/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
