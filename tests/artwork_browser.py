"""Standalone localhost/subdirectory integration test. Uses the existing app icon
as an HTTP fixture; creates no image files and requires Python Playwright/Chromium.
"""
import os
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urljoin, urlparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread, Event
from playwright.sync_api import sync_playwright, expect
artifact=tempfile.TemporaryDirectory(prefix='lollipop-art-')
subprocess.run(['node','scripts/build-pwa.mjs','--out',str(Path(artifact.name)/Path.cwd().name)],check=True)
allow_image=Event()
requests={}
class FixtureServer(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=artifact.name,**kwargs)
    def log_message(self,*args):pass
    def do_GET(self):
        name=urlparse(self.path).path.rsplit('/',1)[-1]
        if name in ['test-machine.png','offline-test.png','missing-test.png','corrupt-test.png']:
            requests[name]=requests.get(name,0)+1
            if name=='missing-test.png':self.send_error(404);return
            if name=='test-machine.png':allow_image.wait(10)
            image=b'not an image' if name=='corrupt-test.png' else Path('icon-192.png').read_bytes()
            self.send_response(200);self.send_header('Content-Type','image/png');self.send_header('Content-Length',str(len(image)));self.end_headers();self.wfile.write(image);return
        super().do_GET()
server=ThreadingHTTPServer(('127.0.0.1',0),FixtureServer)
Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/{Path.cwd().name}/'
checks=0

def check(value,label):
    global checks
    assert value,label
    checks+=1
    print('PASS',label,flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':900},reduced_motion='reduce')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(BASE,wait_until='networkidle')
    page.wait_for_function("document.body.dataset.readonly === 'false'")
    check(page.locator('#lollipop > svg').count()==1 and page.locator('image[data-art-image]').count()==0,'default game renders original SVGs without optional image requests')
    page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
    page.reload(wait_until='networkidle')
    page.wait_for_function("document.body.dataset.readonly === 'false'")
    # Make a purchase possible using the real clicker, not a modified save.
    for _ in range(8):page.locator('#lollipop').click()
    page.locator('[data-game-panel=shop]:visible').first.click()
    before=page.locator('[data-upgrade=maquina] .building-art').bounding_box()
    page.evaluate("""async ({base,path})=>{
      const {ARTWORK}=await import(new URL('js/ui/assets.js',base));
      const art=await import(new URL('js/ui/art.js',base));
      ARTWORK.buildings.maquina=path;
      document.querySelector('[data-upgrade=maquina] .building-art').innerHTML=art.buildingSVG('maquina',10);
    }""",{'base':BASE,'path':'assets/images/buildings/test-machine.png'})
    page.wait_for_function("document.querySelector('image[data-art-image]') !== null")
    check(page.locator('[data-art-fallback]').evaluate("el=>getComputedStyle(el).display !== 'none'"),'original artwork stays visible while an image loads')
    allow_image.set()
    page.wait_for_function("document.querySelector('image[data-art-image]')?.getAttribute('opacity') === '1'")
    check(page.locator('[data-art-fallback]').evaluate("el=>getComputedStyle(el).display === 'none'"),'valid configured PNG takes over only after successful load')
    check(page.locator('image[data-art-image]').get_attribute('preserveAspectRatio')=='xMidYMid meet','custom art preserves its aspect ratio')
    after=page.locator('[data-upgrade=maquina] .building-art').bounding_box()
    check(before['width']==after['width'] and before['height']==after['height'],'custom art keeps the original layout and hit area')
    page.locator('[data-upgrade=maquina]').click()
    check(page.evaluate("JSON.parse(localStorage.getItem('lollipopSave')).upgrades.maquina") == 1,'original purchase interaction works with custom art')
    # Warm exactly the same path list the shared bootstrap sends to the worker.
    existing='assets/images/buildings/offline-test.png'
    page.evaluate("""async ({base,path})=>{
      const ready=await navigator.serviceWorker.ready;
      ready.active.postMessage({type:'lollipop:cache-art',paths:[path]});
    }""",{'base':BASE,'path':existing})
    page.wait_for_function("""async url => !!(await caches.match(url))""",arg=urljoin(BASE,existing))
    check(True,'PWA cache contains explicitly requested local artwork')

    assign="""async ({base,path})=>{
      const {ARTWORK}=await import(new URL('js/ui/assets.js',base));
      const art=await import(new URL('js/ui/art.js',base));
      ARTWORK.buildings.maquina=path;
      document.querySelector('[data-upgrade=maquina] .building-art').innerHTML=art.buildingSVG('maquina');
    }"""
    page.evaluate(assign,{'base':BASE,'path':'assets/images/buildings/missing-test.png'})
    page.wait_for_function("!document.querySelector('[data-upgrade=maquina] image[data-art-image]')")
    check(page.locator('[data-upgrade=maquina] [data-art-fallback]').evaluate("el=>getComputedStyle(el).display !== 'none'"),'missing optional image leaves the complete original SVG visible')
    page.evaluate(assign,{'base':BASE,'path':'assets/images/buildings/missing-test.png'})
    page.wait_for_timeout(200)
    check(requests.get("missing-test.png")==1,'known failed image is not requested repeatedly on redraw')
    page.evaluate(assign,{'base':BASE,'path':'assets/images/buildings/corrupt-test.png'})
    page.wait_for_function("!document.querySelector('[data-upgrade=maquina] image[data-art-image]')")
    check(page.locator('[data-upgrade=maquina] [data-art-fallback]').evaluate("el=>getComputedStyle(el).display !== 'none'"),'undecodable PNG response also restores the SVG')
    context.set_offline(True)
    page.evaluate(assign,{'base':BASE,'path':existing})
    page.wait_for_function("document.querySelector('[data-upgrade=maquina] image[data-art-image]')?.getAttribute('opacity') === '1'")
    check(True,'configured local artwork loads from the PWA cache offline')
    page.evaluate(assign,{'base':BASE,'path':'assets/images/buildings/never-cached.png'})
    page.wait_for_function("!document.querySelector('[data-upgrade=maquina] image[data-art-image]')")
    check(page.locator('[data-upgrade=maquina] [data-art-fallback]').evaluate("el=>getComputedStyle(el).display !== 'none'"),'offline cache miss preserves the SVG instead of blank artwork')
    check(not errors,'no uncaught JavaScript errors: '+repr(errors))
    context.close();browser.close()
server.shutdown()
artifact.cleanup()
print(f'Completed {checks} artwork browser checks.')
