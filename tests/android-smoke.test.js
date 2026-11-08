import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
test('smoke diagnostics retain the failing Gradle exit code and streamed markers',()=>{
 const root=mkdtempSync(join(tmpdir(),'smoke-diagnostics-'));
 try {
  mkdirSync(join(root,'bin'));mkdirSync(join(root,'android'));
  writeFileSync(join(root,'bin/adb'),'#!/bin/sh\necho "LollipopSmoke fixture stage"\nexit 0\n',{mode:0o755});
  writeFileSync(join(root,'android/gradlew'),'#!/bin/sh\necho "fixture assertion failed"\nexit 7\n',{mode:0o755});
  const run=spawnSync('bash',[resolve('scripts/android-smoke.sh')],{cwd:root,env:{...process.env,PATH:join(root,'bin')+':'+process.env.PATH,RUNNER_TEMP:root},encoding:'utf8'});
  assert.equal(run.status,7);assert.match(readFileSync(join(root,'android-smoke/result.txt'),'utf8'),/instrumentation_exit=7/);
  assert.match(readFileSync(join(root,'android-smoke/gradle.txt'),'utf8'),/fixture assertion failed/);
  assert.match(readFileSync(join(root,'android-smoke/live-logcat.txt'),'utf8'),/fixture stage/);
 } finally {rmSync(root,{recursive:true,force:true});}
});
