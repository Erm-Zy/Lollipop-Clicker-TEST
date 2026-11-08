"""Actual Chromium Service Workers against deterministic A/B/C artifacts.
Self-contained, no external website and no clearing player data during updates.
Python Playwright 1.62.0 + Chromium; CHROMIUM_PATH overrides /usr/bin/chromium.
"""
import json
import os
import shutil
import subprocess
import tempfile
from collections import Counter
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parent.parent
TEMP=tempfile.TemporaryDirectory(prefix='lollipop-pwa-')
WORK=Path(TEMP.name)
SOURCE=WORK/'source';SOURCE.mkdir()
for name in ['index.html','manifest.json','icon-192.png','icon-512.png','.nojekyll','pages','css','js','assets','sw.js']:
    src=ROOT/name;dst=SOURCE/name
    if src.is_dir():shutil.copytree(src,dst)
    else:shutil.copy2(src,dst)

def build(name):
    out=WORK/name
    subprocess.run(['node','--input-type=module','-e',"import {buildPwa} from './scripts/build-pwa.mjs';buildPwa({root:process.argv[1],out:process.argv[2]})",str(SOURCE),str(out)],cwd=ROOT,check=True)
    return json.loads((out/'pwa-release.json').read_text())['id']
IDS={}
for name in ['A','B','C']:
    with (SOURCE/'css/global.css').open('a') as file:file.write('\n/* regression release '+name+' */\n')
    IDS[name]=build(name)
# Faithful legacy worker + shared registration, then upgrade without resetting storage.
shutil.copytree(WORK/'A',WORK/'legacy')
for name in ['sw.js','js/ui/shared.js']:
    (WORK/'legacy'/name).write_bytes((ROOT/'tests/fixtures'/('legacy-sw.js' if name=='sw.js' else 'legacy-shared.js')).read_bytes())
CURRENT='A';FAULT=None;COUNTS=Counter()
class Server(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(WORK),**kwargs)
    def log_message(self,*args):pass
    def do_GET(self):
        # Variants are generated in the same second; SimpleHTTPServer's mtime-only
        # 304 logic cannot distinguish them. GitHub Pages uses content ETags.
        if "If-Modified-Since" in self.headers: del self.headers["If-Modified-Since"]
        path=urlparse(self.path).path
        relative=path.removeprefix('/Lollipop-Clicker-TEST/').lstrip('/')
        COUNTS[relative]+=1
        if FAULT and relative==FAULT[0]:
            if FAULT[1]=='404':self.send_error(404);return
            data=b'/* stale CDN bytes */'
            self.send_response(200);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        self.path='/'+CURRENT+'/'+relative
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control','max-age=600')
        super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),Server)
Thread(target=server.serve_forever,daemon=True).start()
ORIGIN=f'http://127.0.0.1:{server.server_port}'
BASE=ORIGIN+'/Lollipop-Clicker-TEST/'
checks=0

def check(value,label):
    global checks
    assert value,label
    checks+=1;print('PASS',label,flush=True)

def loaded(page,base=BASE):
    page.goto(base,wait_until='networkidle')
    page.wait_for_function("document.querySelector('#saveStatus') && !document.querySelector('#saveStatus').textContent.includes('Preparando sua fábrica')")

def install(page):
    page.evaluate("navigator.serviceWorker.ready.then(()=>true)")
    page.wait_for_function('!!navigator.serviceWorker.controller')

def update(page):
    return page.evaluate("""async()=>{
      const registration=await navigator.serviceWorker.getRegistration();
      await registration.update();
      const worker=registration.installing;
      if (worker && !['installed','activated','redundant'].includes(worker.state)) await new Promise(resolve=>worker.addEventListener('statechange',()=>{if(['installed','activated','redundant'].includes(worker.state))resolve()}));
      return worker?.state || registration.waiting?.state;
    }""")

def waiting(page):
    page.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
    expect(page.locator('#pwaUpdate')).to_be_visible()

def release(page):return page.locator('meta[name=lollipop-release]').get_attribute('content')

def activated(page,name):
    page.wait_for_function('(id)=>document.querySelector("meta[name=lollipop-release]")?.content===id',arg=IDS[name])
    page.wait_for_load_state('networkidle')
    expect(page.locator('#pwaUpdate')).to_be_hidden()

def confirm(page):page.locator('#pwaUpdate [data-update]').click()

try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    errors=[]
    context=browser.new_context()
    context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
    context.add_init_script("""if(location.protocol==='http:'){window.__loads=Number(sessionStorage.getItem('test.loads')||0)+1;sessionStorage.setItem('test.loads',window.__loads);
    window.__updateChecks=0;const originalUpdate=ServiceWorkerRegistration.prototype.update;
    ServiceWorkerRegistration.prototype.update=function(...args){window.__updateChecks++;return originalUpdate.apply(this,args)};
    navigator.serviceWorker.addEventListener('message',event=>{if(window.__blockUpdate && ['PWA_PREPARE','PWA_ARM'].includes(event.data?.type))event.stopImmediatePropagation()});}""")
    page=context.new_page();loaded(page);install(page)
    check(page.evaluate('window.__loads')==1,'initial install claims the client without reloading')
    check(page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.updateViaCache)")=='none','worker update bypasses HTTP cache (server advertises max-age=600)')
    for _ in range(10):page.locator('#lollipop').click()
    page.wait_for_function("JSON.parse(localStorage.lollipopSave).totalClicks===10")
    saved=page.evaluate("JSON.parse(localStorage.lollipopSave).totalClicks")
    # Add unrelated and nested-app caches; cleanup must never delete these.
    page.evaluate("""async base=>{await caches.open('unrelated-app');await caches.open('lollipop-pwa:'+encodeURIComponent(base)+':candidate-future');await caches.open('lollipop-clicker-other:'+base+'nested/');await caches.open('lollipop-pwa:'+encodeURIComponent(base+'nested/')+':old')}""",BASE)
    CURRENT='B';page.reload(wait_until='networkidle');waiting(page)
    check(release(page)==IDS['A'],'complete B waits while the A game stays loaded')
    old=page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.active.state)")
    check(old=='activated','working controller remains active while update waits')
    page.locator('#pwaUpdate [data-later]').click()
    page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(300)
    expect(page.locator('#pwaUpdate')).to_be_hidden()
    page.reload(wait_until='networkidle')
    expect(page.locator('#pwaUpdate')).to_be_hidden()
    check(release(page)==IDS['A'],'Depois persists across navigation and does not activate or clear data')
    page.evaluate("sessionStorage.removeItem('lollipop.pwa.deferred')")
    page.reload(wait_until='networkidle');waiting(page)
    # Read-only view acknowledges without saving its stale snapshot.
    second=context.new_page();loaded(second)
    second.wait_for_function("document.body.dataset.readonly==='true'")
    second.set_viewport_size({'width':390,'height':844})
    waiting(second)
    check(second.evaluate("document.documentElement.scrollWidth<=innerWidth") and second.locator('#pwaUpdate [data-update]').bounding_box()['height']>=44,'mobile update notice fits the screen and provides 44px touch targets')
    second.locator('[data-game-panel=shop]:visible').first.click()
    expect(second.locator('#panelUpdateNotice')).to_be_visible()
    check('atualizar' in second.locator('#panelUpdateNotice').inner_text(),'real waiting PWA update remains announced inside the modal')
    second.locator('#closeGamePanel').click();expect(second.locator('#gamePanel')).not_to_be_visible()
    # Block saving only primary save, so failed update cannot destroy persisted progress.
    page.evaluate("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw new DOMException('quota','QuotaExceededError');return window.realSet.call(this,k,v)};true")
    confirm(page)
    expect(page.locator('#pwaUpdate p')).to_contain_text('Não foi possível salvar')
    check(release(page)==IDS['A'] and page.evaluate("JSON.parse(localStorage.lollipopSave).totalClicks")==saved,'failed writer save prevents activation and preserves the previous save')
    page.evaluate('Storage.prototype.setItem=window.realSet;true')
    second.evaluate('window.__blockUpdate=true')
    confirm(page)
    confirm(second)
    expect(second.locator('#pwaUpdate p')).to_contain_text('Outra janela')
    check(True,'simultaneous confirmation is rejected without replacing the current transaction')
    expect(page.locator('#pwaUpdate p')).to_contain_text('não respondeu',timeout=15_000)
    check(page.evaluate("document.body.dataset.readonly==='false'") and release(page)==IDS['A'],'unresponsive tab aborts activation and unfreezes the writer')
    second.evaluate('window.__blockUpdate=false')
    # Record protocol order on both windows across the reload.
    for tab in [page,second]:
        tab.evaluate("navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='PWA_ARM')sessionStorage.setItem('test.armed','yes')});navigator.serviceWorker.addEventListener('controllerchange',()=>sessionStorage.setItem('test.controlled',sessionStorage.getItem('test.armed')||'no'))")
    page.locator('#lollipop').click();saved+=1
    confirm(page);activated(page,'B');activated(second,'B')
    check(page.evaluate("sessionStorage.getItem('test.controlled')")=='yes' and second.evaluate("sessionStorage.getItem('test.controlled')")=='yes','all tabs arm before controllerchange and reload to B together')
    check(page.evaluate("JSON.parse(localStorage.lollipopSave).totalClicks")==saved,'writer save survives coordinated update; read-only tab does not overwrite it')
    page.wait_for_function("id=>caches.keys().then(keys=>!keys.some(k=>k.endsWith(id)))",arg=IDS['A'])
    keys=page.evaluate('caches.keys()')
    check('unrelated-app' in keys and any('nested' in k and k.startswith('lollipop-clicker-') for k in keys),'obsolete own caches removed only after reload, unrelated and nested app caches preserved')
    check(any(k.endswith(':candidate-future') for k in keys),'activation preserves a future candidate cache that has never activated')
    second.close()
    before=page.evaluate('window.__loads')
    for _ in range(3):page.evaluate("document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'))")
    page.wait_for_timeout(400)
    check(page.evaluate('window.__loads')==before,'foreground events do not cause reload loops')
    page.wait_for_function('window.__updateChecks>0')
    before_requests=page.evaluate('window.__updateChecks')
    for _ in range(10):page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
    page.wait_for_timeout(400)
    check(page.evaluate('window.__updateChecks')==before_requests,'foreground update checks are throttled instead of polling')
    # Missing mandatory asset and mixed CDN bytes both reject C, keep B offline.
    for mode in ['404','stale']:
        CURRENT='C';FAULT=('js/gameplay.js',mode)
        outcome=update(page)
        check(outcome=='redundant','failed '+mode+' worker reaches redundant state')
        page.wait_for_function("navigator.serviceWorker.getRegistration().then(r=>!r.installing&&!r.waiting)")
        check(release(page)==IDS['B'],'failed '+mode+' precache does not replace working release')
        check(not any(k.endswith(IDS['C']) for k in page.evaluate('caches.keys()')),'failed '+mode+' candidate cache is discarded')
    FAULT=None
    context.set_offline(True)
    page.reload(wait_until='networkidle')
    check(release(page)==IDS['B'] and page.locator('#lollipop').is_visible(),'offline startup retains complete B shell after failed installs')
    page.locator('#lollipop').click()
    page.wait_for_function("n=>JSON.parse(localStorage.lollipopSave).totalClicks===n",arg=saved+1)
    check(page.evaluate("JSON.parse(localStorage.lollipopSave).totalClicks")==saved+1,'clicks and save still work offline')
    page.goto(BASE+'pages/settings.html',wait_until='networkidle')
    check(page.locator('h1').count()>0,'offline page navigation resolves GitHub Pages subpath')
    context.set_offline(False)
    # Advance only the wall clock to exercise the one-minute foreground gate.
    page.evaluate("window.originalNow=Date.now;Date.now=()=>window.originalNow()+61000;document.dispatchEvent(new Event('visibilitychange'))")
    waiting(page);confirm(page);activated(page,'C')
    check(release(page)==IDS['C'],'successful retry installs C after transient CDN/network failure')
    context.close()
    # A failed first installation leaves online play intact and retries on foreground.
    CURRENT='A';FAULT=('manifest.json','404')
    fresh=browser.new_context()
    fresh.add_init_script("""if(location.protocol==='http:'){
    const original=ServiceWorkerContainer.prototype.register;
    ServiceWorkerContainer.prototype.register=function(...args){return original.apply(this,args).then(reg=>{
      function watch(){reg.installing?.addEventListener('statechange',event=>{if(event.target.state==='redundant')window.installFailed=true})}
      watch();reg.addEventListener('updatefound',watch);return reg;
    }).catch(error=>{window.installFailed=true;throw error})};}""")
    first=fresh.new_page();loaded(first)
    first.wait_for_function('window.installFailed===true')
    check(first.evaluate('navigator.serviceWorker.controller===null') and first.locator('#lollipop').is_visible(),'failed initial precache leaves online game usable without claiming a broken controller')
    FAULT=None
    first.evaluate("window.originalNow=Date.now;Date.now=()=>window.originalNow()+61000;window.dispatchEvent(new Event('online'))")
    install(first)
    check(first.evaluate('!!navigator.serviceWorker.controller'),'failed first install retries on foreground/online without clearing data')
    fresh.close()
    # Root deployment as well as the GitHub Pages subpath; native must not register SW.
    CURRENT='A'
    context=browser.new_context();root_page=context.new_page();loaded(root_page,ORIGIN+'/');install(root_page)
    check(root_page.evaluate('navigator.serviceWorker.controller.scriptURL')==ORIGIN+'/sw.js','root deployment also registers the correct worker')
    context.close()
    native=browser.new_context();native.add_init_script('window.Capacitor={isNativePlatform:()=>true}')
    tab=native.new_page();loaded(tab)
    check(tab.locator('#pwaUpdate').count()==0 and tab.evaluate('navigator.serviceWorker.getRegistrations().then(r=>r.length)')==0,'Capacitor assets never register a browser updater or promise APK updates')
    native.close()
    # Upgrade from the actual previous cache-first implementation, not a new manager.
    CURRENT='legacy';legacy=browser.new_context();old=legacy.new_page();loaded(old)
    old.evaluate('navigator.serviceWorker.ready.then(()=>true)');old.reload(wait_until='networkidle');install(old)
    old.locator('#lollipop').click();old.wait_for_function('JSON.parse(localStorage.lollipopSave).totalClicks===1');old_clicks=old.evaluate('JSON.parse(localStorage.lollipopSave).totalClicks')
    CURRENT='B';update(old)
    old.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)')
    check(old.locator('#pwaUpdate').count()==0,'legacy pages are not force-reloaded by the first rollout')
    old.close()
    new=legacy.new_page();loaded(new);activated(new,'B');install(new)
    check(new.evaluate('JSON.parse(localStorage.lollipopSave).totalClicks')==old_clicks,'closing legacy windows once upgrades without clearing browser/save data')
    legacy.close()
    check(not errors,'no uncaught application JavaScript errors: '+repr(errors))
    browser.close()
finally:
    server.shutdown();TEMP.cleanup()
print(f'Completed {checks} PWA lifecycle browser checks.')
