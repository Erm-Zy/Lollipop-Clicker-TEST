"""Live economy/save/accessibility regressions for the illustrated sanctuary/album."""
import copy,json,os,subprocess,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from threading import Thread
from playwright.sync_api import sync_playwright,expect
from pet_ui_helpers import inspect_pet,pet_action,inventory_control,hatch_control
ROOT=Path(__file__).resolve().parent.parent
fixtures=json.loads(subprocess.check_output(['node','tests/cartoon-fixtures.mjs'],cwd=ROOT))
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
def ready(p):p.wait_for_function("document.body.dataset.readonly==='false'")
def open_game(b,seed=None,w=390,h=844,route='pets'):
 c=b.new_context(viewport={'width':w,'height':h},has_touch=w<800,reduced_motion='reduce')
 seed=copy.deepcopy(fixtures['fresh'] if seed is None else seed)
 c.add_init_script('if(!localStorage.lollipopSave){const seed='+json.dumps(seed)+';seed.lastTick=seed.savedAt=Date.now();localStorage.lollipopSave=JSON.stringify(seed)};Math.random=()=>0;')
 p=c.new_page();p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE+f'pages/{route}.html');ready(p);return c,p
def panel(p,name):p.locator(f'[data-panel={name}]').click()
def copies(n=4):
 s=copy.deepcopy(fixtures['fresh']);s.update(pirulitos=1e6,totalEarned=1e6)
 s['pets']['inventory']=[{'id':f'pet-{i+1}','speciesId':'balinha','stage':0,'acquiredAt':1700000000000+i,'favorite':False,'locked':False} for i in range(n)]
 s['pets']['nextId']=n+1;return s
def optin(p,accept=True):
 p.once('dialog',lambda d:d.accept() if accept else d.dismiss());p.locator('#autoFusionToggle').click()
def hatch(p,count=1):
 p.locator(f'[data-hatch="{count}"]').click();expect(p.locator('#hatchDialog')).to_be_visible();p.locator('#closeHatchBtn').click()
def fusion_ready(p):
 # Automatic consumption stays conservative until the real SW version handshake.
 # First install can briefly expose a same-release waiting worker. Observe the
 # completed initial installation too; do not race that legitimate safety guard.
 p.evaluate("async()=>{if(document.querySelector('#pwaUpdate')){await navigator.serviceWorker.ready;window.testFusionRegistration=await navigator.serviceWorker.getRegistration()}}")
 p.wait_for_function("()=>{const e=document.querySelector('#pwaUpdate');if(!e)return true;const r=window.testFusionRegistration;return e.dataset.ready==='false'&&!!navigator.serviceWorker.controller&&r?.active?.state==='activated'&&!r.waiting&&!r.installing}")
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
  for w,h in [(320,568),(360,740),(390,844),(430,932),(768,1024),(740,360),(1280,720),(1600,900)]:
   c,p=open_game(b,fixtures['late'],w,h)
   check(p.locator('h1').inner_text()=='Ninho dos Pets' and p.locator('[data-egg]').count()==3,f'{w}: real sanctuary/three eggs')
   check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{w}: no egg overflow')
   p.locator('[data-egg=celestial]').click();check('10 bi' in p.locator('[data-hatch="2"]').inner_text() and '10.000.000.000' in p.locator('[data-hatch="2"]').get_attribute('aria-label'),f'{w}: 10 bi compact/exact price')
   panel(p,'inventory');check(p.locator('[data-pet]').count()==48,f'{w}: real instance pagination')
   check(p.locator('[data-action]').count()==0,f'{w}: no repeated action panels in grid')
   id=p.locator('[data-pet]').first.get_attribute('data-pet');inspect_pet(p,id)
   check(p.locator('#petDetail [data-instance]').count()==1 and p.locator('#petDetail [data-action]').count()==4,f'{w}: one selected instance detail')
   p.keyboard.press('Escape');expect(p.locator('#petDetailDialog')).not_to_be_visible()
   check(p.locator(f'[data-inspect="{id}"]').evaluate('(e)=>document.activeElement===e'),f'{w}: detail Escape returns focus')
   panel(p,'catalog');check(p.locator('[data-discovery]').count()==72 and p.locator('.pet-catalog-entry').count()==18,f'{w}: all actual discoveries/species render')
   p.locator('[data-discovery="balinha:3"]').click();check('Gigante' in p.locator('#discoveryDetail').inner_text(),f'{w}: discovery selection uses actual stage')
   p.goto(BASE+'pages/achievements.html');ready(p)
   check(p.locator('[data-achievement]').count()==13 and p.locator('#achievementDetail').count()==1,f'{w}: badge album 13 and single detail')
   check(p.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{w}: album stays inside viewport')
   p.locator('[data-achievement=c1000]').focus();p.keyboard.press('Enter');check('Maratona' in p.locator('#achievementTitle').inner_text(),f'{w}: keyboard selects real achievement')
   check(p.locator('[data-achievement]').evaluate_all('(xs)=>xs.every(e=>{let r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})'),f'{w}: badge targets >=44px')
   c.close()
  # New save, locked badge selectable, category uses stable internal ID.
  c,p=open_game(b,route='achievements');p.locator('[data-achievement=c1]').click()
  check('Em progresso' in p.locator('#achievementStatus').inner_text() and p.locator('#achievementProgress').get_attribute('aria-valuenow')=='0','locked badge still exposes actual progress')
  p.keyboard.press('ArrowRight');check(p.locator('[data-achievement=c100]').get_attribute('aria-pressed')=='true','arrow navigation selects/focuses neighboring badge')
  p.locator('[data-achievement-category="Coleção"]').click();check(p.locator('[data-achievement-category="Coleção"]').inner_text()=='Receitas' and p.locator('[data-achievement]:visible').count()==3,'Receitas label retains actual collection category/three achievements')
  p.goto(BASE+'index.html');ready(p);p.locator('#lollipop').click();p.goto(BASE+'pages/achievements.html');ready(p);p.locator('[data-achievement=c1]').click()
  check(p.locator('[data-achievement=c1]').get_attribute('class').find('unlocked')>=0 and 'Conquistado' in p.locator('#achievementStatus').inner_text(),'real click unlocks permanent badge and live detail')
  unlocked=saved(p)['unlockedAchievements'];p.reload();ready(p);check(saved(p)['unlockedAchievements']==unlocked,'album selection never changes historical unlock IDs')
  c.close()
  # Explicit opt-in; no login/reload automation; actual hatch and fuse commit together.
  c,p=open_game(b,copies());panel(p,'inventory');check(not p.locator('#autoFusionToggle').is_checked(),'auto-fusion starts OFF')
  optin(p,False);check(not saved(p)['pets']['autoFusionEnabled'],'cancel opt-in preserves OFF and copies')
  optin(p);check(saved(p)['pets']['autoFusionEnabled'],'confirmed opt-in persists')
  p.reload();ready(p);check(len(saved(p)['pets']['inventory'])==4 and saved(p)['pets']['stats']['fused']==0,'enabled reload never fuses anything')
  fusion_ready(p);hatch(p);s=saved(p);check(len(s['pets']['inventory'])==1 and s['pets']['inventory'][0]['stage']==1 and s['pirulitos']==998500,'one real hatch debits 1500 and fuses exactly five atomically; diagnostics='+json.dumps({'pets':s['pets'],'balance':s['pirulitos'],'guard':p.locator('#pwaUpdate').get_attribute('data-ready'),'hidden':p.evaluate('document.hidden'),'online':p.evaluate('navigator.onLine')}))
  check(s['pets']['stats']['hatched']==1 and s['pets']['autoFusionStats']['fusions']==1 and set(s['pets']['discovered'])=={'balinha:0','balinha:1'},'original hatch and evolution discoveries/statistics persist')
  p.reload();ready(p);check(len(saved(p)['pets']['inventory'])==1 and saved(p)['pets']['autoFusionStats']['fusions']==1,'restart cannot replay auto fusion')
  panel(p,'inventory');p.locator('#autoFusionToggle').uncheck();check(not saved(p)['pets']['autoFusionEnabled'],'auto fusion is easy to disable without confirmation')
  c.close()
  # The same real automatic hatcher calls the atomic policy; one timer and no replay.
  auto_seed=copies();auto_seed['pets']['autoFusionEnabled']=True
  c,p=open_game(b,auto_seed);fusion_ready(p);hatch_control(p,'#autoBatch').select_option('3');p.locator('#autoOpenBtn').click()
  p.wait_for_function("JSON.parse(localStorage.lollipopSave).pets.autoFusionStats.fusions>=2")
  p.locator('#stopAutoBtn').click();auto_saved=saved(p);p.wait_for_timeout(2700)
  check(auto_saved['pets']['stats']['hatched']==6 and auto_saved['pets']['autoFusionStats']['fusions']==2 and saved(p)['pets']==auto_saved['pets'],'auto-hatch and auto-fusion serialize two exact batches and Stop cancels the only timer')
  p.evaluate("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return realSet.call(this,k,v)};true")
  p.locator('#autoOpenBtn').click();check(saved(p)['pets']==auto_saved['pets'] and p.locator('#stopAutoBtn').is_hidden(),'failed auto batch rolls back fusion/debit and stops safely')
  c.close()
  # Quota rolls back debit, all original IDs, fusion output, counters AND option history.
  seed=copies();seed['pets']['autoFusionEnabled']=True
  c,p=open_game(b,seed);fusion_ready(p);before=saved(p)
  p.evaluate("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return realSet.call(this,k,v)};true")
  p.locator('[data-hatch="1"]').click();check(saved(p)['pets']==before['pets'] and saved(p)['pirulitos']==before['pirulitos'] and not p.locator('#hatchDialog').is_visible(),'quota rolls back the combined hatch+fusion with all original IDs')
  p.evaluate('Storage.prototype.setItem=realSet;true');fusion_ready(p);hatch(p);check(saved(p)['pets']['autoFusionStats']['fusions']==1,'storage recovery can retry once without duplicate rewards; diagnostics='+json.dumps({'pets':saved(p)['pets'],'guard':p.locator('#pwaUpdate').get_attribute('data-ready'),'hidden':p.evaluate('document.hidden'),'online':p.evaluate('navigator.onLine')}))
  c.close()
  for guard in ['offline','pending-update','checking-update']:
   c,p=open_game(b,seed)
   if guard=='offline':p.evaluate("Object.defineProperty(navigator,'onLine',{get:()=>false})")
   else:p.evaluate("value=>{let e=document.querySelector('#pwaUpdate');e.dataset.ready=value;e.hidden=true}",'checking' if guard=='checking-update' else 'true')
   hatch(p);check(len(saved(p)['pets']['inventory'])==5 and saved(p)['pets']['stats']['fused']==0,guard+' permits offline gameplay but blocks automatic consumption')
   c.close()
  # One-shot preview is separate from opt-in, protected presets included.
  seed=copies(11);seed['pets']['presets']['production']=['pet-1'];seed['pets']['inventory'][1]['favorite']=True;seed['pets']['inventory'][2]['locked']=True;seed['pets']['equipped']=['pet-4'];seed['pets']['reserveNormals']=1
  c,p=open_game(b,seed);panel(p,'inventory');inventory_control(p,'#reviewSafeFusion').click();expect(p.locator('#safeFusionDialog')).to_be_visible()
  check('1 fusões' in p.locator('#safeFusionPreview').inner_text() and len(saved(p)['pets']['inventory'])==11,'dry run shows exact groups without consuming')
  p.locator('#cancelSafeFusion').click();check(not saved(p)['pets']['autoFusionEnabled'] and len(saved(p)['pets']['inventory'])==11,'cancel does not enable automation or consume copies')
  p.locator('#reviewSafeFusion').click();p.locator('#confirmSafeFusion').click();s=saved(p)
  check(all(any(p['id']==id for p in s['pets']['inventory']) for id in ['pet-1','pet-2','pet-3','pet-4']) and len(s['pets']['inventory'])==7 and not s['pets']['autoFusionEnabled'],'one-shot commits once preserving presets/favorite/lock/equipment/reserve and OFF')
  c.close()
  # Background/native pause/second tab can never hatch or change opt-in.
  c,p=open_game(b,seed);other=c.new_page();other.goto(BASE+'pages/pets.html');other.wait_for_function("document.body.dataset.readonly==='true'");panel(other,'inventory')
  check(other.locator('#autoFusionToggle').is_disabled() and other.locator('#reviewSafeFusion').is_disabled(),'second readonly tab cannot enable or execute safe fusion')
  other.close();p.bring_to_front();p.evaluate("document.dispatchEvent(new Event('lollipop:native-pause'))")
  paused=saved(p);p.locator('[data-hatch="1"]').click()
  check(saved(p)['pets']==paused['pets'] and saved(p)['pirulitos']==paused['pirulitos'] and not p.locator('#hatchDialog').is_visible(),'native backgrounding prevents new hatch/fusion transactions')
  c.close()
  # Prestige purchases survive navigation, expanded presets, rebirth and real quota rollback.
  seed=copy.deepcopy(fixtures['late']);seed['prestigePoints']=100;seed['totalEarned']=(1010**3)*1000000
  c,p=open_game(b,seed,route='prestige');p.locator('[data-node=pets]').click();before=saved(p)
  p.evaluate("window.realSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return realSet.call(this,k,v)};true")
  p.locator('#buyPetSlotBtn').click();check(saved(p)['petSlotUpgradeLevel']==0 and saved(p)['prestigePoints']==100,'quota prevents slot purchase and PP debit together')
  p.evaluate('Storage.prototype.setItem=realSet;true');p.locator('#buyPetSlotBtn').click();check(saved(p)['petSlotUpgradeLevel']==1 and saved(p)['prestigePoints']==75,'first permanent slot costs exactly 25 PP')
  p.locator('#buyPetSlotBtn').click();check(saved(p)['petSlotUpgradeLevel']==2 and saved(p)['prestigePoints']==0 and p.locator('#buyPetSlotBtn').is_disabled(),'second slot costs 75 PP and max prevents more')
  p.goto(BASE+'pages/pets.html');ready(p);panel(p,'team');p.locator('#teamTools>summary').click();p.locator('#equipBestBtn').click()
  check(len(saved(p)['pets']['equipped'])==5 and '5 / 5' in p.locator('#teamCount').inner_text(),'Equip Best/UI uses five real owned IDs')
  p.evaluate('scrollTo(0,0)')
  check(p.evaluate('document.documentElement.scrollWidth<=innerWidth') and p.locator('.active-team-portraits button').evaluate_all('(xs)=>xs.every(e=>{let r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))})'),'five equipped portraits remain separate, reachable and >=44px on mobile')
  p.locator('#teamTools>summary').click();p.screenshot(path=str(ROOT/'docs/screenshots/cartoon/after/390x844-late-five-slots.png'));p.locator('#teamTools>summary').click()
  p.locator('#savePetPreset').click();team=saved(p)['pets']['equipped'];p.locator('#teamStrategy').select_option('clicks');p.locator('#equipBestBtn').click();p.locator('#loadPetPreset').click()
  check(saved(p)['pets']['equipped']==team and len(saved(p)['pets']['presets']['production'])==5,'expanded named preset saves/restores all five IDs')
  p.reload();ready(p);check(saved(p)['pets']['equipped']==team and saved(p)['petSlotUpgradeLevel']==2,'expanded team and purchase survive restart')
  p.goto(BASE+'pages/prestige.html');ready(p);p.once('dialog',lambda d:d.accept());p.locator('#prestigeBtn').click();check(saved(p)['petSlotUpgradeLevel']==2 and saved(p)['pets']['equipped']==team,'rebirth retains permanent slots and exact equipped IDs')
  # Export/import carries five slots, presets, opt-in and actual instance IDs.
  p.goto(BASE+'pages/pets.html');ready(p);panel(p,'inventory');optin(p)
  p.goto(BASE+'pages/settings.html');ready(p)
  with p.expect_download() as download:p.locator('#exportSaveBtn').click()
  payload=Path(download.value.path()).read_bytes();original=json.loads(payload)
  c.close();c,p=open_game(b,route='settings');p.once('dialog',lambda d:d.accept())
  p.locator('#importSaveInput').set_input_files({'name':'own-backup.json','mimeType':'application/json','buffer':payload})
  p.wait_for_function("JSON.parse(localStorage.lollipopSave).petSlotUpgradeLevel===2")
  check(saved(p)['pets']==original['pets'] and saved(p)['petSlotUpgradeLevel']==2,'real exported backup imports all pet IDs, flags, presets, auto option/history and slot upgrade without loss')
  check(p.evaluate("!!localStorage.getItem('lollipopSave.recovery')"),'import preserves the replaced save as a recovery backup')
  c.close()
  # Representative 500-instance, five-slot UI benchmark under 4x CPU throttling.
  seed=copy.deepcopy(fixtures['late']);original=seed['pets']['inventory'];seed['petSlotUpgradeLevel']=2;seed['prestigePoints']=900
  seed['pets']['inventory']=[dict(copy.deepcopy(original[i%len(original)]),id=f'pet-{i+1}',acquiredAt=1700000000000+i) for i in range(500)];seed['pets']['nextId']=501
  c,p=open_game(b,seed);panel(p,'team');p.locator('#teamTools>summary').click();cdp=c.new_cdp_session(p);cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
  timings=[]
  for strategy in ['balanced','production','clicks','combat','prestige','capacity']:
   p.locator('#teamStrategy').select_option(strategy)
   elapsed=p.locator('#equipBestBtn').evaluate('(button)=>{let t=performance.now();button.click();return performance.now()-t}')
   timings.append({'strategy':strategy,'milliseconds':elapsed})
   check(len(set(saved(p)['pets']['equipped']))==5 and elapsed<5000,'500-instance five-slot '+strategy+' completes with distinct owned IDs under 4x CPU throttling')
  results=ROOT/'test-results/cartoon';results.mkdir(parents=True,exist_ok=True);(results/'browser-performance.json').write_text(json.dumps({'cpuThrottlingRate':4,'results':timings},indent=2))
  c.close()
  # Large inventory stays bounded; ordinary clock ticks preserve existing DOM.
  seed=copies(500);c,p=open_game(b,seed);panel(p,'inventory');nodes=p.locator('#petInventory *').count();p.evaluate('window.firstPet=document.querySelector("[data-pet]")');p.wait_for_timeout(1200)
  check(nodes<4500 and p.evaluate('firstPet===document.querySelector("[data-pet]")'),'500 pets keep only 48 tiles; ticks preserve DOM')
  for _ in range(8):panel(p,'catalog');panel(p,'inventory')
  check(p.locator('#petInventory *').count()==nodes,'repeated local navigation does not accumulate pet DOM')
  inventory_control(p,'#petSearch').fill('balinha');check(p.locator('[data-pet]').count()==48,'advanced search still works through real disclosure')
  c.close();check(not errors,'no unexpected Chromium application errors: '+repr(errors));b.close()
finally:server.shutdown()
print(f'Completed {checks} cartoon integration checks.')
