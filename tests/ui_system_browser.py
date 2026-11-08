"""UI structure, real controls, responsive themes and subpath/offline; no production saves."""
import os,json,time,subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def do_GET(self):self.path=self.path.removeprefix('/Lollipop-Clicker-TEST');super().do_GET()
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/Lollipop-Clicker-TEST/'
OUT=ROOT/'test-results/ui-system';OUT.mkdir(parents=True,exist_ok=True)
checks=0;errors=[]
def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print('PASS',label,flush=True)
names=['home','shop','pets','prestige','arena','collection','rewards','achievements','statistics','settings']
def route(name):return BASE+('index.html' if name=='home' else f'pages/{name}.html')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in [(320,568),(360,740),(390,844),(430,932),(768,1024),(1280,720),(1600,900),(740,360)]:
   ctx=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
   for name in names:
    page.goto(route(name));page.wait_for_function("document.body.dataset.readonly==='false'")
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{w}x{h} {name}: no body overflow')
    check(page.locator('h1').count()==1 and page.locator('#saveStatus').is_visible(),f'{w} {name}: title and save state available')
    if name!='home':
     menu=page.locator('.more-menu summary:visible').first;menu.click()
     rect=page.locator('.more-menu[open] .more-links').bounding_box();check(rect['y']>=0 and rect['y']+rect['height']<=h+1,f'{w} {name}: More stays on screen')
     page.keyboard.press('Escape');check(page.locator('.more-menu[open]').count()==0 and menu.evaluate('(el)=>el===document.activeElement'),f'{w} {name}: Escape closes navigation')
    else:
     for panel in ['shop','rewards']:
      tile=page.locator(f'[data-game-panel="{panel}"]:visible').first;tile.click();check(page.locator('#gamePanel[open]').count()==1,f'{w}: real {panel} overlay opens')
      if panel=='shop':check(page.locator('#gamePanel [data-upgrade]').count()==8,'all eight real factories remain available')
      page.keyboard.press('Escape');page.locator('#gamePanel').wait_for(state='hidden');check(tile.evaluate('(el)=>el===document.activeElement'),'Escape returns focus to gameplay tool')
    if name=='shop':
     page.evaluate('scrollTo(0,document.body.scrollHeight)');check(page.locator('.header-wallet').bounding_box()['y']>=0,'wallet remains available while shopping');page.evaluate('scrollTo(0,0)')
    if w in [390,1280] and name in ['home','pets','prestige','shop','arena']:
     page.mouse.move(0,0);page.screenshot(path=str(OUT/f'{w}-{name}.png'),full_page=True)
   page.goto(route('pets'));page.wait_for_selector('#teamCount');check(page.locator('#panel-team').is_hidden() and page.locator('#panel-eggs').is_visible(),f'{w}: eggs precede team management')
   page.locator('#openTeamBtn').click();check(page.locator('#panel-team').is_visible() and page.locator('#panel-eggs').is_hidden(),f'{w}: real Team shortcut')
   ctx.close()
  for theme in ['classic','neon','rainbow','gold','cosmic','fire','ice']:
   raw={'version':6,'pirulitos':1000,'totalEarned':1000,'activeTheme':theme,'unlockedSkins':['classic',theme],'lastTick':int(time.time()*1000),'settings':{'animations':True,'reducedMotion':True,'music':False}}
   ctx=browser.new_context(viewport={'width':390,'height':844});ctx.add_init_script('if(!localStorage.lollipopSave)localStorage.lollipopSave='+json.dumps(json.dumps(raw)));page=ctx.new_page();page.goto(route('settings'));page.wait_for_function(f"document.body.dataset.theme==='{theme}'")
   check(page.locator('#exportSaveBtn').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth') and page.locator('body').get_attribute('data-motion')=='off',f'{theme}: theme, export and saved reduced-motion preserved')
   ctx.close()
  ctx=browser.new_context();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(route('collection'));page.locator('[data-item=blueberry]').click();page.locator('.loadout-panel > summary').click()
  check(page.evaluate('JSON.parse(localStorage.lollipopSave).activeFlavor')=='blueberry' and 'Blueberry' in page.locator('#collectionLoadout').inner_text(),'wardrobe changes real flavor and refreshes independent loadout')
  page.locator('[data-preview=morango]').click();page.keyboard.press('Escape');check(page.locator('#flavorComparison').is_hidden(),'flavor comparison keeps native Escape dismissal')
  page.goto(route('pets'));page.evaluate('navigator.serviceWorker.ready');page.reload();page.wait_for_function('Boolean(navigator.serviceWorker.controller)');ctx.set_offline(True);page.goto(route('shop'));check(page.locator('#upgradesList .upgrade-row').count()==8,'offline subpath navigation includes new CSS and real shop')
  ctx.close();check(not errors,'no uncaught JavaScript errors');browser.close()
finally:server.shutdown()
print(f'Completed {checks} UI system checks.')
