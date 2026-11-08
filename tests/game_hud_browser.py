"""Real game HUD regression, on generated PWA/subpath with disposable validated saves."""
import copy,json,os,subprocess,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
fixtures=json.loads(subprocess.check_output(['node','tests/hud-fixtures.mjs'],cwd=ROOT))
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT/'dist'),**k)
 def do_GET(self):self.path=self.path.removeprefix('/Lollipop-Clicker-TEST');super().do_GET()
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
BASE=f'http://127.0.0.1:{server.server_port}/Lollipop-Clicker-TEST/'
checks=0;errors=[]
def check(ok,label):
 global checks
 assert ok,label
 checks+=1;print('PASS',label,flush=True)
def saved(p):return p.evaluate('JSON.parse(localStorage.lollipopSave)')
def ready(p):p.wait_for_function("document.body.dataset.readonly==='false' && document.readyState==='complete'")
def open_game(b,seed=None,w=390,h=844):
 c=b.new_context(viewport={'width':w,'height':h},has_touch=w<800,reduced_motion='reduce')
 seed=copy.deepcopy(fixtures['fresh'] if seed is None else seed)
 c.add_init_script('if(!localStorage.lollipopSave){const seed='+json.dumps(seed)+';seed.lastTick=seed.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(seed)}')
 p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);ready(p);return c,p

def panel(p,name):
 p.locator(f'[data-game-panel="{name}"]:visible').first.click();expect(p.locator('#gamePanel')).to_be_visible()
 p.wait_for_function('document.querySelector("#gamePanel").dataset.panel==='+json.dumps(name))
def close(p):
 p.locator('#closeGamePanel').click();expect(p.locator('#gamePanel')).not_to_be_visible()
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in [(320,568),(360,740),(390,844),(430,932),(768,1024),(1280,720),(1600,900),(740,360)]:
   c,p=open_game(b,fixtures['late'],w,h)
   check(p.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight+1'),f'{w}x{h}: home is one viewport without horizontal overflow')
   check(p.locator('.hud-tile:visible').count()==10,f'{w}: all nine destinations plus boost available')
   check(p.evaluate('''()=>[...document.querySelectorAll('.hud-tile')].filter(a=>a.getClientRects().length).every(a=>{let r=a.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width>=44&&r.height>=44&&r.y>=0&&r.bottom<=innerHeight&&a.contains(hit)})'''),f'{w}: HUD targets are reachable, unobstructed and >=44px')
   check(p.locator('#lollipop').evaluate('(a)=>{let r=a.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),f'{w}: lollipop stays visible and hittable')
   panel(p,'shop');check(p.locator('#gamePanel [data-upgrade]').count()==8,f'{w}: all factories in drawer')
   p.locator('[data-upgrade=superfabrica]').scroll_into_view_if_needed();r=p.locator('#closeGamePanel').bounding_box()
   check(r['y']>=0 and r['y']+r['height']<=h,f'{w}: close remains in viewport at end of shop')
   p.keyboard.press('Escape');expect(p.locator('#gamePanel')).not_to_be_visible()
   check(p.locator('[data-game-panel=shop]:visible').first.evaluate('(a)=>a===document.activeElement'),f'{w}: Escape restores focus')
   c.close()
  c,p=open_game(b)
  for _ in range(10):p.locator('#lollipop').click()
  panel(p,'shop');p.locator('.shop-ledger > summary').click()
  expect(p.locator('.shop-ledger')).to_contain_text('Compra: 15 doces')
  check('Compra: 15 doces' in p.locator('.shop-ledger').inner_text(),'exact purchase price is also readable in optional details')
  p.locator('.shop-ledger > summary').click();p.locator('[data-upgrade=maquina]').click()
  expect(p.locator('#panelFeedback')).to_be_visible()
  check(saved(p)['upgrades']['maquina']==1 and saved(p)['totalClicks']==10,'drawer purchase uses real transaction and flushes the same click state')
  close(p);old=p.locator('#scoreDisplay').inner_text();p.locator('#lollipop').click()
  check(p.locator('#scoreDisplay').inner_text()!=old,'clicker works immediately after closing shop')
  p.evaluate("window.clickThrough=0;document.querySelector('#lollipop').addEventListener('click',()=>clickThrough++)")
  panel(p,'shop');p.set_viewport_size({'width':740,'height':360});p.wait_for_timeout(100)
  check(p.locator('#closeGamePanel').bounding_box()['y']>=0,'open panel keeps its close control after rotation')
  p.mouse.click(1,1);expect(p.locator('#gamePanel')).not_to_be_visible();check(p.evaluate('clickThrough===0'),'backdrop closes without click-through to lollipop')
  p.set_viewport_size({'width':390,'height':844})
  panel(p,'shop');p.go_back();expect(p.locator('#gamePanel')).not_to_be_visible();p.go_forward();expect(p.locator('#gamePanel')).to_be_visible()
  check(p.locator('body').get_attribute('data-page')=='home','Back/Forward restores overlay without replacing home/runtime')
  for _ in range(14):
   p.keyboard.press('Tab');check(p.evaluate('document.querySelector("#gamePanel").contains(document.activeElement)'),'native modal keeps keyboard focus inside')
  p.evaluate('document.querySelector("#gamePanel").close()');expect(p.locator('#gamePanel')).not_to_be_visible();p.wait_for_function('!history.state?.lollipopPanel')
  check(p.locator('body').get_attribute('data-page')=='home','native dialog close (Android Back hook) removes history entry and keeps home')
  p.goto(BASE+'index.html#shop');ready(p);expect(p.locator('#gamePanel')).to_be_visible();p.reload();ready(p);expect(p.locator('#gamePanel')).to_be_visible();close(p)
  check(p.url.endswith('index.html'),'direct/reloaded overlay link can close safely to home')
  c.close()
  # Exact lot/capacity semantics in the new surface, using game getters as oracle.
  seed=copy.deepcopy(fixtures['late']);seed.update(pirulitos=1e15,upgrades={k:0 for k in seed['upgrades']},prestigePoints=800);seed['factoryExpansions']['maquina']=10
  c,p=open_game(b,seed);nodes=p.evaluate('document.querySelectorAll("*").length')
  for _ in range(5):panel(p,'shop');close(p)
  check(p.evaluate('document.querySelectorAll("*").length')==nodes,'repeated panel lifecycle keeps DOM stable')
  panel(p,'shop')
  for quantity,count in [('1',1),('10',11),('100',111),('max',140)]:
   p.locator(f'[data-buy="{quantity}"]').click();p.locator('[data-upgrade=maquina]').click();check(saved(p)['upgrades']['maquina']==count,f'drawer {quantity}: exact fixed lot/MAX capacity preserved')
  check(p.locator('[data-upgrade=maquina]').is_disabled(),'capacity prevents extra drawer purchase')
  c.close()
  # Committed wheel result survives close/reload; no second writer or duplicate prize.
  seed=copy.deepcopy(fixtures['fresh']);seed.update(pirulitos=1000,totalEarned=1000)
  c,p=open_game(b,seed);panel(p,'rewards');p.locator('#spinBtn').click()
  pending=saved(p)['pendingWheel'];check(bool(pending),'wheel commits pending result before animation')
  p.keyboard.press('Escape');expect(p.locator('#gamePanel')).not_to_be_visible();p.reload();ready(p)
  p.wait_for_function('JSON.parse(localStorage.lollipopSave).pendingWheel===null',timeout=12000)
  settled=saved(p);check(settled['wheelSpins']==1 and settled['lastWheelReward'] is not None,'pending prize settles after close/restart')
  panel(p,'rewards');check(p.locator('#spinBtn').is_disabled() and p.locator('#wheelResult').is_visible(),'cooldown and actual result visible on reopen')
  close(p);p.reload();ready(p);check(saved(p)['wheelSpins']==1 and saved(p)['pirulitos']==settled['pirulitos'],'wheel reopening cannot duplicate payout')
  c.close()
  # Four independent recipe selections preserve the old route/keys after reload.
  seed=copy.deepcopy(fixtures['mid']);seed.update(pirulitos=1e15,totalEarned=1e15)
  c,p=open_game(b,seed);p.locator('.game-dock a[href$="collection.html"]').click();ready(p)
  check(p.locator('h1').inner_text()=='Receitas' and p.url.endswith('/pages/collection.html'),'Receitas visible name, original document route preserved')
  p.locator('[data-item=uva]').click()
  for category,id in [('skin','neon'),('theme','gold'),('particles','ice')]:
   p.locator(f'[data-category="{category}"]').click();p.locator(f'[data-item="{id}"]').click()
  s=saved(p);check((s['activeFlavor'],s['activeSkin'],s['activeTheme'],s['activeParticles'])==('uva','neon','gold','ice'),'all four recipe categories equip independently')
  p.reload();ready(p);check(saved(p)['activeFlavor']=='uva' and saved(p)['activeTheme']=='gold','historic save keys survive recipe rename/reload')
  p.goto(BASE+'pages/prestige.html');ready(p);check(p.locator('[data-node]').count()==9,'all nine independent prestige choices remain')
  points=saved(p)['prestigePoints'];p.locator('[data-node=maquina]').click();p.locator('[data-expand=maquina]').click()
  check(saved(p)['prestigePoints']==points-2 and saved(p)['factoryExpansions']['maquina']==1,'selected prestige detail performs real independent purchase')
  p.once('dialog',lambda d:d.dismiss());p.locator('#prestigeBtn').click();check(saved(p)['prestigePoints']==points-2,'rebirth remains explicitly confirmed and cancellable')
  p.goto(BASE+'pages/arena.html');ready(p);p.locator('#startBossBtn').click();check(saved(p)['boss'] is not None,'full-screen Arena still starts real timed combat')
  p.locator('.game-dock a[href$="index.html"]').click();ready(p);check(p.locator('#lollipop').is_enabled(),'full-screen modes return to working home')
  c.close()
  # 10 billion egg batch / exact accessible label / selected team art.
  seed=copy.deepcopy(fixtures['late']);seed['upgrades']['maquina']=16
  c,p=open_game(b,seed);p.goto(BASE+'pages/pets.html');ready(p);p.locator('[data-egg=celestial]').click()
  batch=p.locator('[data-hatch="2"]');check('10 bi' in batch.inner_text() and '10.000.000.000' in batch.get_attribute('aria-label'),'10-billion batch uses short price and exact accessible amount')
  check(batch.evaluate('(a)=>a.scrollWidth<=a.clientWidth'),'large egg price fits its actual button')
  out=ROOT/'docs/screenshots/game-hud/after';out.mkdir(parents=True,exist_ok=True);p.screenshot(path=str(out/'390x844-late-10bi-eggs.png'))
  p.locator('#openTeamBtn').click();check(p.locator('#petTeam svg').count()==3,'equipped portraits precede optional team tools')
  c.close()
  seed=copy.deepcopy(fixtures['fresh']);seed.update(pirulitos=4999999999,totalEarned=1e15,prestigeLevel=10,prestigeClaimed=10);seed['pets']['unlockedEggs']=['acucarado','celestial']
  c,p=open_game(b,seed);p.goto(BASE+'pages/pets.html');ready(p);p.locator('[data-egg=celestial]').click()
  check(p.locator('[data-hatch="1"]').is_disabled() and 'Faltam 1' in p.locator('#hatchAvailability').inner_text(),'near-threshold 5-bi display still refuses a purchase one candy short')
  check(saved(p)['pirulitos']==4999999999,'compact display never rounds stored currency')
  c.close()
  seed=copy.deepcopy(fixtures['fresh']);seed.update(pirulitos=1e100,totalEarned=1e100)
  c,p=open_game(b,seed,320,568);check('e+100' in p.locator('#scoreDisplay').inner_text() and p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'high exponent remains finite and fits narrow HUD')
  panel(p,'shop');check(p.locator('#closeGamePanel').bounding_box()['x']+44<=320 and p.evaluate('document.documentElement.scrollWidth<=innerWidth'),'high-exponent wallet leaves close action reachable')
  c.close()
  # Ownership/protected saves, including warnings inside the modal.
  c,p=open_game(b);other=c.new_page();other.on('pageerror',lambda e:errors.append(str(e)));other.goto(BASE);other.wait_for_function("document.body.dataset.readonly==='true'")
  panel(other,'shop');check(other.locator('#lollipop').is_disabled() and other.locator('#panelSaveStatus').is_visible() and other.locator('[data-upgrade]:enabled').count()==0,'second tab warning stays accessible in modal; purchases and clicks blocked')
  c.close()
  c,p=open_game(b);p.evaluate("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return realSet.call(this,k,v)};true")
  # A real tick tries to save; game keeps the original data rather than clearing it.
  p.wait_for_timeout(5500);panel(p,'shop');check(p.locator('#panelSaveStatus').is_visible() and p.locator('#gamePanel [data-upgrade]:enabled').count()==0,'save failure is prominent and cannot silently buy in drawer')
  c.close()
  # Actual service worker + subpath offline, new overlay modules and fallback documents.
  c,p=open_game(b);p.evaluate('navigator.serviceWorker.ready');p.reload();ready(p);p.wait_for_function('Boolean(navigator.serviceWorker.controller)');c.set_offline(True)
  panel(p,'shop');check(p.locator('[data-upgrade]').count()==8,'offline home drawer includes all real upgrades')
  p.locator('[data-panel-page=shop]').click();ready(p);check(p.url.endswith('/pages/shop.html'),'offline shop fallback is a real playable document')
  p.goto(BASE+'pages/collection.html');ready(p);check(p.locator('h1').inner_text()=='Receitas','offline subpath recipe route loads')
  c.close();check(not errors,'no uncaught game HUD JavaScript errors: '+repr(errors));b.close()
finally:server.shutdown()
print(f'Completed {checks} game HUD checks.')
