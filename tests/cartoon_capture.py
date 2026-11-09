"""Real rendered baseline/after, identical isolated fixtures and Pages subpath."""
import json,os,sys,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
phase=sys.argv[1] if len(sys.argv)>1 else 'after'
out=ROOT/'docs/screenshots/cartoon'/phase
out.mkdir(parents=True,exist_ok=True)
if phase=='before' and (out/'layout.json').exists():raise RuntimeError('Baseline already recorded; do not overwrite')
fixtures=json.loads(subprocess.check_output(['node','tests/cartoon-fixtures.mjs'],cwd=ROOT))
release=json.loads((ROOT/'dist/pwa-release.json').read_text())['id']
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT/'dist'),**k)
 def do_GET(self):self.path=self.path.removeprefix('/Lollipop-Clicker-TEST');super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/Lollipop-Clicker-TEST/'
metrics=[];errors=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in [(320,568),(360,740),(390,844),(430,932),(768,1024),(740,360),(1280,720),(1600,900)]:
   for label,seed in fixtures.items():
    ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',has_touch=w<800)
    ctx.add_init_script('if(!localStorage.lollipopSave){let s='+json.dumps(seed)+';s.lastTick=s.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(s)}')
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    for name in ['eggs','inventory','team','catalog','achievements','prestige']:
     route='pets' if name in ['eggs','inventory','team','catalog'] else name
     page.goto(base+f'pages/{route}.html');page.wait_for_function("document.body.dataset.readonly==='false'")
     if route=='pets':page.locator(f'[data-panel={name}]').click()
     page.evaluate('document.fonts.ready');page.wait_for_timeout(70)
     assert page.locator('meta[name=lollipop-release]').get_attribute('content')==release,'Build changed during capture'
     m=page.evaluate('''()=>({overflow:document.documentElement.scrollWidth>innerWidth,height:document.documentElement.scrollHeight,header:document.querySelector('#gameHeader').offsetHeight,tiles:[...document.querySelectorAll('#petInventory > *,#achievementsList > *')].filter(e=>!e.hidden).map(e=>{let r=e.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height),inView:r.top>=0&&r.bottom<=innerHeight}})})''');m.update(page=name,state=label,viewport=[w,h],release=release);metrics.append(m)
     if (w==390 and label in ['mid','late']) or (w in [320,1280,740] and label=='mid') or (w==390 and label=='fresh' and name in ['eggs','achievements']):
      page.screenshot(path=str(out/f'{w}x{h}-{label}-{name}.png'))
     if phase=='after' and label=='mid' and w in [390,1280] and name in ['inventory','achievements','prestige']:
      if name=='inventory':page.locator('[data-inspect]').first.click();page.locator('#petDetail').scroll_into_view_if_needed()
      elif name=='achievements':page.locator('[data-achievement]').nth(4).click();page.locator('#achievementDetail').scroll_into_view_if_needed()
      else:page.locator('[data-node=pets]').click()
      page.screenshot(path=str(out/f'{w}x{h}-{label}-{name}-selected.png'))
    ctx.close()
   print(phase,w,h,'18 surfaces',flush=True)
  if phase=='after':
   seed=json.loads(json.dumps(fixtures['mid']));seed['activeTheme']='neon';seed['unlockedSkins']=['classic','neon']
   ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
   ctx.add_init_script('if(!localStorage.lollipopSave){let s='+json.dumps(seed)+';s.lastTick=s.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(s)}')
   page=ctx.new_page();page.goto(base+'pages/pets.html');page.wait_for_function("document.body.dataset.theme==='neon' && document.body.dataset.readonly==='false'")
   page.locator('[data-panel=inventory]').click();page.screenshot(path=str(out/'390x844-mid-neon-inventory.png'))
   page.locator('[data-inspect]').first.click();page.set_viewport_size({'width':390,'height':480});page.screenshot(path=str(out/'390x480-mid-pet-detail.png'));ctx.close()
  browser.close()
finally:server.shutdown()
(out/'layout.json').write_text('{"metrics":[\n'+',\n'.join(json.dumps(m,ensure_ascii=False,separators=(',',':')) for m in metrics)+'\n],"errors":'+json.dumps(errors)+'}\n')
assert not errors,errors
assert not any(m['overflow'] for m in metrics),[m for m in metrics if m['overflow']]
print(len(metrics),'renderings;',len(list(out.glob('*.png'))),'screenshots; no overflow/errors')
