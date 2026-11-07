"""Prestige and safe schema5 migration browser QA. Serve the repo and set LOLLIPOP_BASE_URL.
Chromium viewport/touch simulation is not Android hardware validation.
"""
import copy,json,os,time
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('LOLLIPOP_BASE_URL','http://127.0.0.1:8000/').rstrip('/')+'/'
RESULTS=Path('test-results/prestige');RESULTS.mkdir(parents=True,exist_ok=True)
checks=0;errors=[]
def check(value,label):
 global checks
 assert value,label
 checks+=1;print('PASS',label,flush=True)
def seed(**updates):
 s={'version':4,'pirulitos':0,'totalEarned':0,'prestigeLevel':0,'prestigeClaimed':0,'prestigePoints':0,'prestigeBaseline':0,'stellarBoostLevel':0,'factoryExpansions':{},'upgrades':{},'settings':{'music':False,'sfx':False,'animations':True,'particles':True},'lastTick':int(time.time()*1000),'savedAt':int(time.time()*1000)}
 s.update(updates);return s
def ready(p,writable=True):
 p.wait_for_function("document.body.dataset.readonly === '%s'"%('false' if writable else 'true'))
def open_game(browser,s=None,page='prestige',width=390):
 ctx=browser.new_context(viewport={'width':width,'height':844},has_touch=width<700,is_mobile=width<700,reduced_motion='reduce',accept_downloads=True)
 s=seed() if s is None else s
 ctx.add_init_script("if(!localStorage.getItem('lollipopSave'))localStorage.setItem('lollipopSave',%s)"%json.dumps(json.dumps(s)))
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 p.goto(urljoin(BASE,f'pages/{page}.html'),wait_until='networkidle');ready(p);return ctx,p
def saved(p):return p.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")
def go(p,name):p.goto(urljoin(BASE,f'pages/{name}.html'),wait_until='networkidle');ready(p)

with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 ctx,p=open_game(b)
 check(p.locator('.prestige-orb svg').count()==1,'original star illustration remains')
 check(p.locator('.prestige-progress').get_attribute('aria-valuenow')=='0','new journey accessible progress is zero')
 check(p.locator('#buyStellarBtn').is_disabled() and p.locator('[data-expand=maquina]').is_disabled(),'zero PP disables permanent purchases')
 check(p.locator('[data-expand]').count()==8,'all eight independent expansion cards exist')
 ctx.close()

 ctx,p=open_game(b,seed(totalEarned=215200000000,prestigeLevel=58,prestigeClaimed=58,prestigeBaseline=195112000000))
 check(p.locator('.prestige-progress').get_attribute('aria-valuenow')=='100','earned milestone fills journey bar')
 p.once('dialog',lambda d:d.dismiss());p.locator('#prestigeBtn').click()
 check(saved(p)['prestigeLevel']==58 and saved(p)['prestigePoints']==0,'cancelled rebirth does not credit points')
 p.once('dialog',lambda d:d.accept());p.locator('#prestigeBtn').click()
 s=saved(p)
 check(s['prestigeLevel']==59 and s['prestigePoints']==1 and s['totalEarned']==215200000000,'rebirth grants one point and preserves lifetime history')
 check(s['prestigeBaseline']==215200000000,'rebirth baseline is persisted atomically')
 check(p.locator('.prestige-progress').get_attribute('aria-valuenow')=='0','215.2B regression: immediate zero bar after rebirth')
 check('800 mi' in p.locator('#prestigeRequirement').inner_text(),'next milestone shows 800 million remaining')
 p.reload(wait_until='networkidle');ready(p)
 check(p.locator('.prestige-progress').get_attribute('aria-valuenow')=='0' and saved(p)['prestigePoints']==1,'refresh preserves zero bar and does not duplicate points')
 ctx.close()

 ctx,p=open_game(b,seed(totalEarned=64000000,prestigeLevel=3,prestigeClaimed=3,prestigePoints=3))
 p.locator('#buyStellarBtn').click()
 check(saved(p)['stellarBoostLevel']==1 and saved(p)['prestigePoints']==2,'Stellar debits exact PP cost')
 check(saved(p)['prestigeLevel']==3 and saved(p)['prestigeClaimed']==3,'spending does not lower level or claimed milestones')
 p.locator('[data-expand=maquina]').click()
 check(saved(p)['factoryExpansions']['maquina']==1 and saved(p)['prestigePoints']==0,'factory expansion debits two PP')
 check('50' in p.locator('[data-expansion=maquina] .expansion-capacity').inner_text(),'expansion preview reflects increased capacity')
 check(p.locator('[data-expand=calda]').is_disabled(),'other expansion remains independent and unaffordable')
 p.once('dialog',lambda d:d.accept());p.locator('#prestigeBtn').click()
 s=saved(p)
 check(s['prestigeLevel']==4 and s['prestigePoints']==1 and s['stellarBoostLevel']==1 and s['factoryExpansions']['maquina']==1,'rebirth preserves upgrades and credits only new points')
 go(p,'shop')
 check(p.locator('[data-upgrade=maquina] .owned').inner_text()=='0 / 50','new journey starts at zero with expanded capacity')
 go(p,'statistics')
 check('×1,7' in p.locator('#statPrestige').inner_text(),'statistics show combined permanent multiplier')
 ctx.close()

 ctx,p=open_game(b,seed(totalEarned=27000000,prestigeLevel=3,prestigeClaimed=3,prestigePoints=3))
 other=ctx.new_page();other.goto(urljoin(BASE,'pages/prestige.html'),wait_until='networkidle');ready(other,False)
 check(other.locator('#buyStellarBtn').is_disabled() and other.locator('[data-expand=maquina]').is_disabled(),'second tab cannot independently spend PP')
 p.locator('#buyStellarBtn').evaluate('el=>{el.click();el.click();el.click();}')
 check(saved(p)['stellarBoostLevel']==2 and saved(p)['prestigePoints']==0,'rapid repeated input buys only the affordable levels')
 p.close();other.reload(wait_until='networkidle');ready(other)
 check(other.locator('#buyStellarBtn').is_disabled() and saved(other)['prestigePoints']==0,'new writer sees already-spent points')
 ctx.close()

 ctx,p=open_game(b,seed(totalEarned=27000000,prestigeLevel=3,prestigeClaimed=3,prestigePoints=3,upgrades={'maquina':32,'calda':25,'fabrica':7}))
 before=saved(p)
 p.evaluate("window.failedNotices=[];document.addEventListener('lollipop:toast',e=>failedNotices.push(e.detail.message))")
 p.evaluate("() => { const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('test quota');return write.call(this,k,v)}; }")
 p.locator('#buyStellarBtn').click()
 check(saved(p)['prestigePoints']==before['prestigePoints'] and saved(p)['stellarBoostLevel']==0,'failed persistence does not spend points')
 check('Nível 0 / 20' in p.locator('#stellarLevel').inner_text(),'failed PP transaction rolls back visible state')
 check(p.evaluate("!failedNotices.some(t=>t.includes('Conquista desbloqueada: Fábrica de Doces'))"),'failed permanent purchase never announces an uncommitted achievement')
 ctx.close()

 ctx,p=open_game(b,seed(pirulitos=1e12,totalEarned=1e12,upgrades={'maquina':35}),page='shop')
 for view in ['normal','compact']:
  p.locator(f'button[data-shop-view="{view}"]').click();p.locator('[data-buy="10"]').click()
  row=p.locator('[data-upgrade=maquina]')
  check(row.is_disabled() and 'Restam apenas 5 espaços' in row.inner_text(),f'{view}: fixed batch explains actual room')
  check(row.locator('.purchase-estimate').inner_text()=='' and 'Faltam' not in row.inner_text(),f'{view}: capacity is not shown as currency shortage or timer')
 p.locator('[data-buy=max]').click()
 check('MAX: 5 unidades' in p.locator('[data-upgrade=maquina]').inner_text(),'MAX quotes remaining five slots')
 p.locator('[data-upgrade=maquina]').click()
 check(saved(p)['upgrades']['maquina']==40,'MAX fills exactly the final capacity')
 for view in ['normal','compact']:
  p.locator(f'button[data-shop-view="{view}"]').click()
  row=p.locator('[data-upgrade=maquina]')
  check(row.is_disabled() and 'Limite atingido' in row.inner_text(),f'{view}: full capacity has a distinct disabled state')
  check(row.locator('.owned').inner_text()=='40 / 40',f'{view}: owned/capacity label is accurate')
 p.reload(wait_until='networkidle');ready(p)
 check(saved(p)['upgrades']['maquina']==40,'capacity survives reload')
 ctx.close()

 legacy=seed(version=3,totalEarned=215200000000,prestigeLevel=59,prestigeClaimed=59,upgrades={'maquina':10})
 ctx,p=open_game(b,legacy)
 check(saved(p)['version']==5 and saved(p)['prestigePoints']==59,'compatible schema3 tester progress gains historical PP once')
 check(p.locator('.prestige-progress').get_attribute('aria-valuenow')=='0','migration initializes an honest new journey baseline')
 p.reload(wait_until='networkidle');ready(p)
 check(saved(p)['prestigePoints']==59 and p.locator('.beta-reset-notice').count()==0,'compatible migration is not a reset and points are not repeated')
 ctx.close()

 legacy=seed(version=3,totalEarned=215200000000,prestigeLevel=59,prestigeClaimed=59,upgrades={'maquina':1000})
 ctx,p=open_game(b,legacy)
 check(saved(p)==legacy,'incompatible old progression stays untouched instead of being reset')
 check(p.locator('#ownershipNotice').is_visible() and p.locator('#prestigeBtn').is_disabled(),'incompatible save stays protected with a Portuguese recovery notice')
 check(p.locator('.beta-reset-notice').count()==0,'Pets migration does not trigger the old beta reset')
 p.reload(wait_until='networkidle');ready(p)
 check(saved(p)==legacy,'reload keeps the incompatible original untouched')
 go(p,'settings')
 with p.expect_download() as download:p.locator('#exportSaveBtn').click()
 target=RESULTS/'protected-original.json';download.value.save_as(target)
 check(json.loads(target.read_text())==legacy,'settings exports the untouched protected original')
 ctx.close()

 for width in [280,320,390,768,1440]:
  state=seed(totalEarned=1e12,prestigeLevel=100,prestigeClaimed=100,prestigePoints=100,prestigeBaseline=1e12)
  ctx,p=open_game(b,state,width=width)
  check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}px Sanctuary has no horizontal overflow')
  p.evaluate('scrollTo(0,document.body.scrollHeight)')
  if width<=640:
   last=p.locator('.inventory-footnote').bounding_box();nav=p.locator('.bottom-nav').bounding_box()
   check(last['y']+last['height']<=nav['y'],f'{width}px Sanctuary footer clears bottom navigation')
  if width in [390,1440]:
   p.evaluate('scrollTo(0,0)');p.locator('#toast').evaluate('el=>el.hidden=true')
   p.screenshot(path=str(RESULTS/f'{"mobile" if width==390 else "desktop"}-sanctuary.png'),full_page=True)
  go(p,'shop');p.locator('button[data-shop-view=compact]').click()
  check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}px capacity shop has no horizontal overflow')
  if width==390:p.screenshot(path=str(RESULTS/'mobile-shop-capacity.png'),full_page=True)
  ctx.close()

 expanded={key:10 for key in ['maquina','calda','fabrica','misturador','embaladora','laboratorio','linha','superfabrica']}
 ctx,p=open_game(b,seed(totalEarned=1090**3*1e6,prestigeLevel=1090,prestigeClaimed=1090,prestigePoints=0,stellarBoostLevel=20,factoryExpansions=expanded))
 check(p.locator('#buyStellarBtn').is_disabled() and 'MAX' in p.locator('#buyStellarBtn').inner_text(),'maximum Stellar has no further purchase')
 check(all(p.locator(f'[data-expand={key}]').is_disabled() for key in expanded),'all expansion maxima are enforced in UI')
 ctx.close()
 check(not errors,f'no uncaught JavaScript errors: {errors}')
 b.close()
print(f'Completed {checks} prestige browser checks.')
