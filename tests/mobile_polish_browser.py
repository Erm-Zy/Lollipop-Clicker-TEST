"""Measured subpath baseline and regression; disposable validated saves only."""
import json,os,sys,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
phase=sys.argv[1] if len(sys.argv)>1 else 'verify'
out=(ROOT/'docs/screenshots/mobile-polish'/phase if phase in ['before','after'] else ROOT/'test-results/mobile-polish');out.mkdir(parents=True,exist_ok=True)
fixtures=json.loads(subprocess.check_output(['node','tests/hud-fixtures.mjs'],cwd=ROOT))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'dist'),**kw)
 def do_GET(self):self.path=self.path.removeprefix('/Lollipop-Clicker-TEST');super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/Lollipop-Clicker-TEST/'
metrics=[];errors=[];checks=0
sizes=[(320,568),(360,740),(390,844),(430,932),(740,360),(768,1024),(1280,720),(1600,900)]
def check(ok,msg):
 global checks
 assert ok,msg
 checks+=1
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in sizes:
   for state,seed in fixtures.items():
    c=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',has_touch=True)
    c.add_init_script('if(!localStorage.lollipopSave){const s='+json.dumps(seed)+';s.lastTick=s.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(s)}')
    p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
    for name in ['home','world','shop-panel','wheel-panel','prestige','pets','achievements','arena','collection','settings','statistics','shop']:
     if name in ['world','shop-panel','wheel-panel']:
      panel={'world':'world','shop-panel':'shop','wheel-panel':'rewards'}[name]
      p.locator(f'[data-game-panel="{panel}"]:visible').first.click();p.wait_for_selector('#gamePanel[open]')
     else:
      p.goto(base+('index.html' if name=='home' else f'pages/{name}.html'));p.wait_for_function("document.body.dataset.readonly==='false'")
     p.wait_for_timeout(50)
     m=p.evaluate('''()=>{const r=s=>{const e=document.querySelector(s);if(!e)return null;const b=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:b.x,y:b.y,w:b.width,h:b.height,bottom:b.bottom,display:c.display,visibility:c.visibility}};return {height:document.documentElement.scrollHeight,client:document.documentElement.clientHeight,width:document.documentElement.scrollWidth,scrollY,visualHeight:visualViewport.height,header:r('#gameHeader'),brand:r('.brand > span:last-child'),wallet:r('.header-wallet'),stage:r('.game-layout'),dock:r('.bottom-nav'),panel:r('#gamePanel'),grid:r('#buildingLots'),lots:[...document.querySelectorAll('#buildingLots > *')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})),bodyOverflow:getComputedStyle(document.body).overflowY}}''')
     m.update(viewport=[w,h],state=state,page=name);metrics.append(m)
     if state=='mid' and w in [390,740,1280] and name in ['home','world','prestige','settings']:
      if name=='settings':p.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');p.wait_for_timeout(50)
      p.screenshot(path=str(out/f'{w}x{h}-{state}-{name}.png'))
     if phase!='before':
      check(m['width']<=w,f'overflow {m}')
      check(m['brand']['w']>25 and m['brand']['h']>10,f'brand {m}')
      check(p.evaluate("()=>{const a=document.querySelector('.brand').getBoundingClientRect(),b=document.querySelector('.header-wallet')?.getBoundingClientRect(),c=document.querySelector('.utility-right').getBoundingClientRect();return a.right<= (b?.left??c.left)+1 && (!b || b.right<=c.left+1)}"),f'header overlap {m}')
      if name=='settings':
       p.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)');p.wait_for_timeout(50)
       last=p.locator('main button').last;last.scroll_into_view_if_needed()
       check(p.evaluate("()=>{const a=[...document.querySelectorAll('main button')].at(-1).getBoundingClientRect(),n=document.querySelector('.bottom-nav').getBoundingClientRect();return a.bottom<=n.top+1}"),'last settings button above dock')
      if name=='home':
       for key in ['PageDown','Space']:p.keyboard.press(key)
       p.mouse.wheel(0,1500);p.evaluate('window.scrollTo(0,10000)');p.wait_for_timeout(50)
       check(p.evaluate('scrollY===0 && document.documentElement.scrollHeight<=innerHeight+1'),f'World scroll {m}')
       check(p.locator('#lollipop').is_visible(),'clicker visible')
       c.new_cdp_session(p).send('Input.synthesizeScrollGesture',{'x':w//2,'y':h//2,'yDistance':-500,'gestureSourceType':'touch'})
       check(p.evaluate('scrollY===0'),'touch keeps stage stationary')
       for selector in ['#lollipop','.world-peek','.utility-left a','.utility-right a','.tools-left a','.tools-right [data-game-panel]']:
        for el in p.locator(selector).all():
         r=el.bounding_box();check(r is not None and r['y']>=0 and r['y']+r['height']<=h+1,f'visible control {selector} {r}')
      if name=='world':
       check(len(m['lots'])==8 and all(e['w']>44 and e['h']>=44 for e in m['lots']),f'factory hidden {m}')
       p.locator('#buildingLots a').last.scroll_into_view_if_needed();check(p.locator('#buildingLots a').last.is_visible(),'last factory')
       key=p.locator('#buildingLots a').last.get_attribute('data-focus-upgrade')
       p.locator('#buildingLots a').last.click();check(p.locator('#gamePanel').get_attribute('data-panel')=='shop','factory opens shop');check(p.evaluate("location.hash==='#shop'"),'shop history');check(p.locator(f'[data-upgrade="{key}"]').is_visible(),'matching Shop machine')
     if name in ['world','shop-panel','wheel-panel']:
      p.keyboard.press('Escape');p.wait_for_selector('#gamePanel',state='hidden')
    c.close()
   print(phase,w,h,flush=True)
  browser.close()
finally:server.shutdown()
(out/'metrics.json').write_text(json.dumps({'metrics':metrics,'errors':errors,'checks':checks},ensure_ascii=False,indent=2))
assert not errors,errors
print(f'{len(metrics)} renderings; {checks} checks; {len(errors)} errors')
