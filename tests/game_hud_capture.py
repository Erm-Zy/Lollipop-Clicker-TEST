"""Actual Chromium baseline/after matrix. Isolated saves; serves generated dist at Pages subpath."""
import json,os,sys,subprocess,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
PHASE=sys.argv[1] if len(sys.argv)>1 else 'after'
OUT=ROOT/'docs/screenshots/game-hud'/PHASE;OUT.mkdir(parents=True,exist_ok=True)
fixtures=json.loads(subprocess.check_output(['node','tests/hud-fixtures.mjs'],cwd=ROOT))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT/'dist'),**k)
 def do_GET(self):self.path=self.path.removeprefix('/Lollipop-Clicker-TEST');super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/Lollipop-Clicker-TEST/'
viewports=[(320,568),(360,740),(390,844),(430,932),(768,1024),(1280,720),(1600,900),(740,360)]
pages=['home','shop','pets','team','prestige','arena','collection','rewards','settings']
metrics=[];errors=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in viewports:
   for state,seed in fixtures.items():
    ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',has_touch=w<800)
    ctx.add_init_script('if(!localStorage.lollipopSave){const seed='+json.dumps(seed)+';seed.lastTick=seed.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(seed)}')
    page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
    for name in pages:
     route='pets' if name=='team' else name
     page.goto(BASE+('index.html' if route=='home' else f'pages/{route}.html'))
     page.wait_for_function("document.body.dataset.readonly==='false' && document.readyState==='complete'")
     page.evaluate('document.fonts.ready');page.wait_for_timeout(100)
     if name=='team':page.locator('#openTeamBtn').click()
     metric=page.evaluate('''()=>{const rect=s=>{const el=document.querySelector(s);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,inView:r.top>=0&&r.bottom<=innerHeight}};
      return {overflow:document.documentElement.scrollWidth>innerWidth,documentHeight:document.documentElement.scrollHeight,header:rect('#gameHeader'),nav:rect('.bottom-nav'),candy:rect('#lollipop'),primary:rect('main'),viewport:{w:innerWidth,h:innerHeight},visibleActions:[...document.querySelectorAll('button,a')].filter(a=>{let r=a.getBoundingClientRect();return r.width&&r.height&&r.y>=0&&r.bottom<=innerHeight}).map(a=>({text:(a.innerText||a.getAttribute('aria-label')||'').trim().slice(0,85),width:Math.round(a.getBoundingClientRect().width),height:Math.round(a.getBoundingClientRect().height)}))}}''')
     metric.update(page=name,state=state);metrics.append(metric)
     shot=(state=='mid' and name=='home') or (w==390 and state=='mid') or (w==1280 and state=='late' and name in ['home','shop','prestige','arena','collection']) or (w==320 and state=='fresh' and name in ['home','shop']) or (w==740 and state=='late' and name in ['shop','arena']) or (w==390 and state=='late' and name in ['pets','team','prestige'])
     if shot:page.screenshot(path=str(OUT/f'{w}x{h}-{state}-{name}.png'))
     if PHASE=='after' and w in [390,1280] and state=='mid' and name=='prestige':
      page.locator('[data-node=maquina]').click();page.screenshot(path=str(OUT/f'{w}x{h}-{state}-prestige-selected.png'))
     if PHASE=='after' and w in [390,1280] and state=='mid' and name=='collection':
      page.locator('[data-category=theme]').click();page.screenshot(path=str(OUT/f'{w}x{h}-{state}-recipes-worlds.png'))
     # New hub overlays, captured with the exact same underlying fixture.
     if PHASE=='after' and name=='home' and ((w==390 and state in ['mid','late']) or (w in [320,1280,740] and state=='mid')):
      for panel in ['shop','rewards']:
       page.locator(f'[data-game-panel="{panel}"]:visible').first.click()
       page.wait_for_selector('#gamePanel[open]');page.wait_for_timeout(150)
       page.screenshot(path=str(OUT/f'{w}x{h}-{state}-home-{panel}.png'))
       page.locator('#closeGamePanel').click()
    ctx.close()
   print(f'{PHASE} {w}x{h}: 27 surfaces inspected',flush=True)
  if PHASE=='after':
   seed=fixtures['mid'].copy();seed['activeTheme']='neon'
   ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
   ctx.add_init_script('if(!localStorage.lollipopSave){const s='+json.dumps(seed)+';s.lastTick=s.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(s)}')
   page=ctx.new_page();page.goto(BASE);page.wait_for_function("document.body.dataset.theme==='neon' && document.body.dataset.readonly==='false'");page.screenshot(path=str(OUT/'390x844-mid-neon-home.png'));ctx.close()
  browser.close()
finally:server.shutdown()
(OUT/'layout.json').write_text('{\n"metrics":[\n'+',\n'.join(json.dumps(m,ensure_ascii=False,separators=(',',':')) for m in metrics)+'\n],\n"errors":'+json.dumps(errors)+'\n}\n')
assert not errors,errors
print(f'{len(metrics)} renderings; {len(list(OUT.glob("*.png")))} screenshots; errors={len(errors)}',flush=True)
