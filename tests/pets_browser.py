"""Self-contained Pets integration QA: real SWs, subpath, offline and APK web bundle.
Requires npm dependencies, Python Playwright and Chromium. No production publishing.
"""
import copy
import json
import os
import shutil
import subprocess
import tempfile
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse, urljoin
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parent.parent
WORKSPACE=tempfile.TemporaryDirectory(prefix='lollipop-pets-')
WORK=Path(WORKSPACE.name)
SOURCE=WORK/'source';SOURCE.mkdir()
for name in ['index.html','pages','css','js','assets','sw.js','manifest.json','icon-192.png','icon-512.png','.nojekyll']:
    source=ROOT/name
    if source.is_dir():shutil.copytree(source,SOURCE/name)
    else:shutil.copy2(source,SOURCE/name)

def build(name):
    subprocess.run(['node','--input-type=module','-e',"import {buildPwa} from './scripts/build-pwa.mjs';buildPwa({root:process.argv[1],out:process.argv[2]})",str(SOURCE),str(WORK/name)],cwd=ROOT,check=True)
    return json.loads((WORK/name/'pwa-release.json').read_text())['id']
RELEASE_A=build('A')
with (SOURCE/'css/pets.css').open('a') as file:file.write('\n/* OTA test release B */\n')
RELEASE_B=build('B')
subprocess.run(['npm','run','android:prepare'],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
shutil.copytree(ROOT/'www',WORK/'native')
CURRENT='A'
class Server(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(WORK),**kwargs)
    def log_message(self,*args):pass
    def do_GET(self):
        if 'If-Modified-Since' in self.headers:del self.headers['If-Modified-Since']
        path=urlparse(self.path).path
        if path.startswith('/native/'):self.path=path
        else:self.path='/'+CURRENT+'/'+path.removeprefix('/Lollipop-Clicker-TEST/').lstrip('/')
        super().do_GET()
    def end_headers(self):self.send_header('Cache-Control','max-age=600');super().end_headers()
server=ThreadingHTTPServer(('127.0.0.1',0),Server)
Thread(target=server.serve_forever,daemon=True).start()
ORIGIN=f'http://127.0.0.1:{server.server_port}'
BASE=ORIGIN+'/Lollipop-Clicker-TEST/'
RESULTS=ROOT/'test-results/pets';RESULTS.mkdir(parents=True,exist_ok=True)
checks=0;errors=[]

def check(value,label):
    global checks
    assert value,label
    checks+=1;print('PASS',label,flush=True)

def seed(**updates):
    now=int(time.time()*1000)
    result={'version':5,'pirulitos':1000000,'totalEarned':1000000,'prestigeLevel':0,'prestigeClaimed':0,'prestigePoints':0,'upgrades':{},'lastTick':now,'savedAt':now,'settings':{'music':False,'sfx':False,'animations':True,'particles':False}}
    result.update(updates);return result

def pets(entries,equipped=None):
    return {'inventory':[{'id':f'pet-{i+1}','speciesId':species,'stage':stage,'acquiredAt':1700000000000+i,'favorite':False,'locked':False} for i,(species,stage) in enumerate(entries)],'equipped':equipped or [],'nextId':len(entries)+1,'stats':{'hatched':len(entries),'fused':0,'spent':1500*len(entries)},'strategy':'balanced'}

def stored(page):return page.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")
def ready(page):
    page.wait_for_function("document.body.dataset.readonly==='false'")
    page.wait_for_function("document.querySelector('#capacityCount')?.textContent.includes('/')")

def open_game(browser,value=None,width=1440,base=BASE):
    context=browser.new_context(viewport={'width':width,'height':900 if width>700 else 844},has_touch=width<700,is_mobile=width<700,reduced_motion='reduce',accept_downloads=True)
    value=seed() if value is None else value
    context.add_init_script("if(location.protocol==='http:'){Math.random=()=>0;if(!localStorage.getItem('lollipopSave'))localStorage.setItem('lollipopSave',%s)}"%json.dumps(json.dumps(value)))
    context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(str(error))))
    page=context.new_page();page.goto(urljoin(base,'pages/pets.html'),wait_until='networkidle');page.bring_to_front();ready(page)
    return context,page

def panel(page,name):page.locator(f'[data-panel="{name}"]').click()
def hatch(page,count,keyboard=False):
    button=page.locator(f'[data-hatch="{count}"]')
    if keyboard:
        expect(button).to_be_enabled();button.focus();page.keyboard.press('Enter')
    else:button.click()
    expect(page.locator('#hatchDialog')).to_be_visible()

def close_hatch(page):page.locator('#closeHatchBtn').click();expect(page.locator('#hatchDialog')).not_to_be_visible()
def inventory_count(page):return len(stored(page)['pets']['inventory'])
def ids(page):return [pet['id'] for pet in stored(page)['pets']['inventory']]

try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context,page=open_game(browser)
    check(page.locator('[data-egg]').count()==3 and 'Pets' in page.title(),'three egg selectors render in the real Pets document')
    check('1.500' in page.locator('[data-egg="acucarado"]').inner_text() and '1.000.000' in page.locator('[data-egg="cristalizado"]').inner_text(),'actual egg prices are visible')
    page.locator('[data-egg="cristalizado"]').click()
    check('25 fábricas' in page.locator('#eggRequirement').inner_text() and page.locator('[data-hatch="1"]').is_disabled(),'locked crystal egg explains the existing 25-factory requirement')
    page.locator('[data-egg="celestial"]').click()
    check('100 fábricas' in page.locator('#eggRequirement').inner_text(),'celestial egg uses the existing 100-factory milestone')
    page.locator('[data-egg="acucarado"]').click();page.locator('.pet-probabilities summary').click()
    check(page.locator('#speciesOdds tr').count()==5 and page.locator('#speciesOdds').inner_text().count('30%')==3,'individual candy odds match the data, including equally split Common species')
    page.locator('[data-egg="cristalizado"]').click()
    check(page.locator('#speciesOdds tr').count()==6 and '17,5%' in page.locator('#speciesOdds').inner_text(),'crystal probabilities expose the 17.5% Rare split')
    page.locator('[data-egg="celestial"]').click()
    check(page.locator('#speciesOdds tr').count()==7 and '4,5%' in page.locator('#speciesOdds').inner_text(),'celestial probabilities expose all seven species and 4.5% Legendary split')
    page.locator('[data-egg="acucarado"]').click()
    before=stored(page)['pirulitos']
    for count in [1,2,3]:
        hatch(page,count,keyboard=count==1)
        check(page.locator('#hatchResults .pet-card').count()==count,f'×{count} displays every independently owned reward together')
        before-=1500*count
        check(stored(page)['pirulitos']==before and inventory_count(page)==sum(range(1,count+1)),f'×{count} is saved with its exact debit before reveal')
        if count==1:
            page.keyboard.press('Escape')
            expect(page.locator('#hatchDialog')).not_to_be_visible()
            page.wait_for_function("document.activeElement?.dataset.hatch==='1'||document.activeElement?.dataset.egg==='acucarado'")
            check(True,'keyboard Enter opens eggs and Escape restores focus to an available control')
        else:close_hatch(page)
    check(len(set(ids(page)))==6,'all duplicate species retain distinct instance IDs')
    expect(page.locator('[data-hatch="1"]')).to_be_enabled()
    page.locator('[data-hatch="1"]').evaluate('button=>{button.click();button.click()}')
    expect(page.locator('#hatchDialog')).to_be_visible()
    check(inventory_count(page)==7,'rapid duplicate button activation purchases only one batch')
    close_hatch(page)
    panel(page,'inventory')
    check(page.locator('[data-pet]').count()==7,'inventory displays individually owned duplicate pets')
    first_id=ids(page)[0]
    page.locator(f'[data-pet="{first_id}"] [data-action="favorite"]').click()
    check(stored(page)['pets']['inventory'][0]['favorite'],'favorite action persists')
    page.locator(f'[data-pet="{first_id}"] [data-action="locked"]').click()
    check(stored(page)['pets']['inventory'][0]['locked'],'lock action persists independently')
    page.locator(f'[data-pet="{first_id}"] [data-action="equip"]').click()
    check(stored(page)['pets']['equipped']==[first_id] and '+6%' in page.locator('#teamBonus').inner_text(),'manual equip changes the authoritative click bonus')
    page.locator('#teamStrategy').select_option('clicks');page.locator('#equipBestBtn').click()
    check(len(stored(page)['pets']['equipped'])==3 and stored(page)['pets']['strategy']=='clicks','Equip Best equips three distinct owned pets under the selected strategy')
    page.reload(wait_until='networkidle');ready(page)
    check(stored(page)['pets']['inventory'][0]['favorite'] and len(stored(page)['pets']['equipped'])==3,'flags and team survive reload')
    panel(page,'catalog')
    check(page.locator('.pet-catalog-entry').count()==18 and page.locator('.pet-evolutions li').count()==72,'discovery catalog tracks eighteen species and 72 evolution states')
    check('1 de 72' in page.locator('#catalogCompletion').inner_text(),'duplicate hatches do not duplicate discovery progress')
    page.screenshot(path=str(RESULTS/'desktop-pets-catalog.png'),full_page=True)
    context.close()

    # Actual egg motion is optional and never decides the already saved reward.
    context,page=open_game(browser)
    page.emulate_media(reduced_motion='no-preference')
    hatch(page,1)
    check('pet-hatching' in page.locator('#hatchDialog').get_attribute('class') and inventory_count(page)==1,'egg animation starts only after its reward is safely saved')
    page.locator('#skipHatchBtn').click()
    check('pet-hatching' not in page.locator('#hatchDialog').get_attribute('class'),'Pular reveals the complete result without another transaction')
    close_hatch(page);page.locator('#skipHatchAnimation').check();hatch(page,1)
    check('pet-hatching' not in page.locator('#hatchDialog').get_attribute('class'),'persistent short-animation preference disables egg motion')
    close_hatch(page);context.close()

    # Existing factory gameplay settles all production before team changes.
    initial=pets([('balinha',0),('marshmelinho',1),('goma',2),('dragao_galactico',0)])
    context,page=open_game(browser,seed(pets=initial,upgrades={'maquina':2}),width=390)
    for strategy in ['balanced','production','clicks']:
        page.locator('#teamStrategy').select_option(strategy);page.locator('#equipBestBtn').click()
        check(stored(page)['pets']['strategy']==strategy and len(set(stored(page)['pets']['equipped']))==3,f'{strategy} strategy is a working persistent UI action')
    before=stored(page)
    page.goto(BASE+'index.html',wait_until='networkidle');page.locator('#lollipop').click();page.wait_for_timeout(1200)
    page.goto(BASE+'pages/pets.html',wait_until='networkidle');ready(page)
    after=stored(page)
    elapsed=(after['lastTick']-before['lastTick'])/1000
    check(abs((after['pirulitos']-before['pirulitos'])-1.68*elapsed-2.12)<.02,'real home click and passive production include the equipped team exactly once')
    page.screenshot(path=str(RESULTS/'mobile-pets-eggs.png'),full_page=True)
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'mobile egg/team layout has no horizontal overflow')
    # Native lifecycle suspends auto and ownership using the existing runtime.
    page.locator('#autoBatch').select_option('3');page.locator('#autoOpenBtn').click()
    page.wait_for_function("JSON.parse(localStorage.lollipopSave).pets.inventory.length>=10")
    page.locator('#stopAutoBtn').click();count=inventory_count(page);page.wait_for_timeout(2600)
    check(inventory_count(page)==count and page.locator('#stopAutoBtn').is_hidden(),'visible Parar cancels auto with no later batches')
    page.locator('#autoOpenBtn').click();count=inventory_count(page)
    page.evaluate("document.dispatchEvent(new Event('lollipop:native-pause'))")
    page.wait_for_timeout(2600)
    check(inventory_count(page)==count and page.locator('#stopAutoBtn').is_hidden(),'Android pause stops auto instead of opening eggs in the background')
    page.evaluate("document.dispatchEvent(new Event('lollipop:native-resume'))");ready(page)
    check(page.locator('#stopAutoBtn').is_hidden(),'returning to foreground does not restart auto without the player')
    context.close()

    # Real quota failure: required transactions must leave both debit and rewards untouched.
    context,page=open_game(browser)
    before=stored(page)
    page.evaluate("window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw new DOMException('quota','QuotaExceededError');return window.savedSet.call(this,k,v)};true")
    page.locator('[data-hatch="3"]').click()
    expect(page.locator('#ownershipNotice')).to_contain_text('bloqueado')
    check(stored(page)['pirulitos']==before['pirulitos'] and inventory_count(page)==0 and page.locator('#hatchDialog').is_hidden(),'failed hatch save rolls back currency and all three rewards')
    page.evaluate('Storage.prototype.setItem=window.savedSet;true');hatch(page,3);close_hatch(page)
    check(inventory_count(page)==3,'player can retry a completed hatch after storage recovers')
    context.close()

    # Fusion safeguards, explicit equipped consent, rollback and no duplicate submissions.
    initial=pets([('balinha',0)]*5+[('goma',0)])
    initial['inventory'][0]['favorite']=True;initial['inventory'][1]['locked']=True
    context,page=open_game(browser,seed(pets=initial));panel(page,'inventory')
    for number in range(1,6):page.locator(f'[data-select="pet-{number}"]').check()
    page.locator('#fuseSelectedBtn').click()
    check(page.locator('#fusionDialog').is_hidden() and inventory_count(page)==6,'favorites and locks prevent reviewing an unsafe fusion')
    page.locator('[data-pet="pet-1"] [data-action="favorite"]').click();page.locator('[data-pet="pet-2"] [data-action="locked"]').click()
    page.locator('[data-pet="pet-1"] [data-action="equip"]').click()
    page.locator('#fuseSelectedBtn').click()
    check(page.locator('#fusionSources li').count()==5 and 'Médio' in page.locator('#fusionResult').inner_text(),'fusion preview lists exactly five source IDs and the resulting stage/bonus')
    page.locator('#confirmFusionBtn').click()
    expect(page.locator('#fusionError')).to_contain_text('explicitamente')
    check(inventory_count(page)==6,'equipped sources remain intact until explicitly confirmed')
    page.locator('#allowEquippedFusion').check()
    page.evaluate("window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return window.savedSet.call(this,k,v)};true")
    page.locator('#confirmFusionBtn').click()
    expect(page.locator('#fusionError')).to_contain_text('preservadas')
    check(inventory_count(page)==6 and stored(page)['pets']['equipped']==['pet-1'],'failed fusion save preserves all sources and original equipment')
    page.evaluate('Storage.prototype.setItem=window.savedSet;true')
    page.locator('#confirmFusionBtn').evaluate('button=>{button.click();button.click()}')
    expect(page.locator('#fusionDialog')).not_to_be_visible()
    check(inventory_count(page)==2 and stored(page)['pets']['stats']['fused']==1,'confirmed fusion consumes five, creates one, and rejects duplicate submissions')
    check(any(pet['speciesId']=='goma' for pet in stored(page)['pets']['inventory']) and stored(page)['pets']['equipped']==[],'unrelated ownership survives and consumed equipment is removed safely')
    panel(page,'catalog')
    check('Médio: descoberto' in page.locator('[data-species="balinha"]').inner_html() and 'Normal: descoberto' in page.locator('[data-species="balinha"]').inner_html(),'fusion discovery remains alongside the consumed Normal discovery')
    context.close()

    initial=pets([('balinha',stage) for stage in [0,1,2] for _ in range(5)])
    context,page=open_game(browser,seed(pets=initial),width=390);panel(page,'inventory')
    for stage,label in [(0,'Médio'),(1,'Grande'),(2,'Gigante')]:
        page.locator('#stageFilter').select_option(str(stage));page.locator('[data-action="fusion"]').first.click()
        expect(page.locator('#fusionResult')).to_contain_text(label);page.locator('#confirmFusionBtn').click()
        expect(page.locator('#fusionDialog')).not_to_be_visible()
        check(any(pet['stage']==stage+1 for pet in stored(page)['pets']['inventory']),f'UI supports explicit evolution to {label}')
    page.locator('#stageFilter').select_option('3')
    check(page.locator('[data-action="fusion"]').is_disabled(),'Gigante is final in the inventory UI')
    context.close()

    # 500 instances are paginated; unrelated clock ticks preserve existing cards.
    entries=[('balinha',0)]*480+[('raposa_geada',1)]*20
    context,page=open_game(browser,seed(pets=pets(entries)),width=280);panel(page,'inventory')
    check(page.locator('[data-pet]').count()==48 and '500 / 500' in page.locator('#inventoryCapacity').inner_text(),'500-instance inventory renders only the current 48-card page')
    page.evaluate('window.firstPetCard=document.querySelector("[data-pet]")');page.wait_for_timeout(800)
    check(page.evaluate('window.firstPetCard===document.querySelector("[data-pet]")'),'runtime ticks do not reconstruct the inventory DOM')
    page.locator('#petSearch').fill('geada')
    check(page.locator('[data-pet]').count()==20,'case-insensitive pet-name search filters actual instances')
    page.locator('#rarityFilter').select_option('common')
    check(page.locator('#petsEmpty').is_visible(),'combined filters show a clear empty state')
    page.locator('#rarityFilter').select_option('rare');page.locator('#eggFilter').select_option('cristalizado');page.locator('#stageFilter').select_option('1')
    check(page.locator('[data-pet]').count()==20,'rarity, egg and stage filters work together')
    page.locator('#petSearch').fill('');page.locator('#rarityFilter').select_option('all');page.locator('#eggFilter').select_option('all');page.locator('#stageFilter').select_option('all')
    page.locator('#nextPets').click()
    check('Página 2 / 11' in page.locator('#petsPageNumber').inner_text(),'pagination keeps 500 individual instances navigable')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'280px full-inventory layout stays within the viewport')
    page.screenshot(path=str(RESULTS/'small-mobile-inventory.png'),full_page=True)
    panel(page,'eggs');check(page.locator('[data-hatch="1"]').is_disabled() and page.locator('#autoOpenBtn').is_disabled(),'full inventory disables manual and automatic hatching')
    context.close()

    # Migration and prestige preserve the current v4 economy, backups and the new pet team.
    original=seed(version=4,upgrades={'maquina':25},prestigeLevel=3,prestigeClaimed=3,prestigePoints=2,stellarBoostLevel=1,totalEarned=27000000,prestigeBaseline=27000000)
    context,page=open_game(browser,original)
    check(page.evaluate("JSON.parse(localStorage.getItem('lollipopSave.legacy-v4'))")==original and stored(page)['version']==6,'real bootstrap creates the correct original v4 backup before writing schema6')
    hatch(page,3);close_hatch(page);page.locator('#equipBestBtn').click()
    team=copy.deepcopy(stored(page)['pets'])
    # Increase the fixture's historical threshold through the normal confirmed import UI.
    current=stored(page);current.update(totalEarned=64000000,pirulitos=1000000)
    page.goto(BASE+'pages/settings.html',wait_until='networkidle')
    page.once('dialog',lambda dialog:dialog.accept())
    page.locator('#importSaveInput').set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(current).encode()})
    page.wait_for_function("JSON.parse(localStorage.lollipopSave).totalEarned>=64000000")
    page.goto(BASE+'pages/prestige.html',wait_until='networkidle')
    confirmation=[]
    def accept_prestige(dialog):confirmation.append(dialog.message);dialog.accept()
    page.once('dialog',accept_prestige);page.locator('#prestigeBtn').click()
    check('pets' in confirmation[0] and 'ovos' in confirmation[0],'Prestige confirmation explicitly preserves pets, eggs and discoveries')
    check(stored(page)['pets']==team and stored(page)['upgrades']['maquina']==0,'Prestige preserves exact pet IDs/team/stats and permanent egg unlocks')
    page.goto(BASE+'pages/pets.html',wait_until='networkidle');ready(page)
    check('+18%' in page.locator('#teamBonus').inner_text(),'equipped pet bonus is still applied after Prestige')
    page.goto(BASE+'pages/settings.html',wait_until='networkidle')
    with page.expect_download() as download:page.locator('#exportSaveBtn').click()
    exported=RESULTS/'pets-export.json';download.value.save_as(exported)
    check(json.loads(exported.read_text())['pets']==team,'export includes the complete permanent pet system')
    context.close()

    context,page=open_game(browser,seed(pets=pets([('balinha',0)]*5)))
    other=context.new_page();other.goto(BASE+'pages/pets.html',wait_until='networkidle');other.wait_for_function("document.body.dataset.readonly==='true'")
    check(other.locator('[data-hatch="1"]').is_disabled() and other.locator('#equipBestBtn').is_disabled(),'read-only tabs can inspect pets but cannot hatch or change equipment')
    panel(other,'inventory');check(other.locator('[data-action="favorite"]').first.is_disabled(),'read-only tab cannot mutate favorite/lock/evolution controls')
    other.close();page.bring_to_front()
    # The actual PWA update must freeze the runtime and stop an active auto session.
    page.evaluate('navigator.serviceWorker.ready.then(()=>true)');page.wait_for_function('!!navigator.serviceWorker.controller')
    page.locator('#autoOpenBtn').click();expect(page.locator('#stopAutoBtn')).to_be_visible()
    CURRENT='B';page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
    expect(page.locator('#pwaUpdate')).to_be_visible(timeout=15000)
    page.evaluate("document.addEventListener('lollipop:state',event=>{if(event.detail.updating)sessionStorage.setItem('pets.at-update',String(JSON.parse(localStorage.lollipopSave).pets.stats.hatched))})")
    page.locator('#pwaUpdate [data-update]').click()
    page.wait_for_function("id=>document.querySelector('meta[name=lollipop-release]')?.content===id",arg=RELEASE_B);ready(page)
    count=stored(page)['pets']['stats']['hatched'];page.wait_for_timeout(2600)
    check(stored(page)['pets']['stats']['hatched']==count and page.locator('#stopAutoBtn').is_hidden(),'real controller activation stops auto and never resumes it after reload')
    check(int(page.evaluate("sessionStorage.getItem('pets.at-update')"))==count,'PWA update preserves exactly the last safely saved auto batch')
    context.set_offline(True);page.reload(wait_until='networkidle');ready(page)
    hatch(page,2);close_hatch(page)
    check(stored(page)['pets']['stats']['hatched']==count+2,'all Pets modules and transactions remain playable offline in a subpath PWA')
    for name in ['collection','pets']:
        page.goto(BASE+f'pages/{name}.html',wait_until='networkidle')
    check(page.locator('#petTeam').is_visible(),'offline cross-document navigation returns to Pets successfully')
    context.close()

    context,page=open_game(browser,base=ORIGIN+'/native/',width=390)
    remote=[]
    page.on('request',lambda request:remote.append(request.url) if not request.url.startswith(ORIGIN) else None)
    hatch(page,3);close_hatch(page);page.locator('#equipBestBtn').click();native_team=stored(page)['pets']['equipped']
    page.reload(wait_until='networkidle');ready(page)
    check(len(native_team)==3 and stored(page)['pets']['equipped']==native_team,'Android web bundle includes Pets and retains hatches/equipment across restart navigation')
    check(page.locator('#pwaUpdate').count()==0 and not remote,'Android bundle uses its local files and never registers the browser/PWA updater')
    context.close()
    # Balance mechanics through real UI / runtime transactions, on mobile.
    initial=pets([('balinha',0)]*125+[('fenix',0),('coruja_prismatica',3),('guardiao_aurora',3)])
    context,page=open_game(browser,seed(version=5,pets=initial),width=390)
    check(stored(page)['version']==6 and page.evaluate("JSON.parse(localStorage.getItem('lollipopSave.legacy-v5')).version")==5,'v5 migrates to v6 only after preserving the original raw save')
    for mode in ['combat','prestige','capacity']:
        page.locator('#teamStrategy').select_option(mode);page.locator('#equipBestBtn').click()
        check(stored(page)['pets']['strategy']==mode and len(set(stored(page)['pets']['equipped']))==3,mode+' specialization is a working Equip Best action')
    page.locator('#petPreset').select_option('capacity');page.locator('#savePetPreset').click()
    saved_team=stored(page)['pets']['equipped'];check(stored(page)['pets']['presets']['capacity']==saved_team,'equipment preset saves actual instance IDs')
    page.locator('#teamStrategy').select_option('combat');page.locator('#equipBestBtn').click();page.locator('#loadPetPreset').click()
    check(stored(page)['pets']['equipped']==saved_team,'preset restores the team in one persistent action')
    panel(page,'inventory')
    other=next(pet['id'] for pet in stored(page)['pets']['inventory'] if pet['id'] not in saved_team)
    page.locator(f'[data-pet="{other}"] [data-action="equip"]').click()
    expect(page.locator('#replacePetDialog')).to_be_visible();page.locator('[data-replace]').first.click()
    check(other in stored(page)['pets']['equipped'] and len(stored(page)['pets']['equipped'])==3,'Substituir swaps a full team without a manual unequip gap')
    # Leave candy sources unequipped to protect the no-consent default.
    page.locator('#teamStrategy').select_option('capacity');page.locator('#equipBestBtn').click()
    page.locator('.pet-bulk summary').click();page.locator('#petReserve').fill('5');page.locator('#savePetReserve').click()
    check(stored(page)['pets']['reserveNormals']==5,'Normal reserve is persisted explicitly')
    page.locator('#bulkSpecies').select_option('balinha');page.locator('#bulkChain').check();page.locator('#reviewBulkFusion').click()
    expect(page.locator('#fusionDialog')).to_be_visible()
    check('120 cópias' in page.locator('#fusionDescription').inner_text() and page.locator('#fusionSources li').count()==28,'batch preview shows exact sources and intermediate operations while keeping reserve')
    page.evaluate("window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return window.savedSet.call(this,k,v)};true")
    page.locator('#confirmFusionBtn').click();expect(page.locator('#fusionError')).to_contain_text('Nenhuma cópia')
    check(inventory_count(page)==128,'failed bulk save rolls back every source and intermediate ID')
    page.evaluate('Storage.prototype.setItem=window.savedSet;true');page.locator('#confirmFusionBtn').click()
    expect(page.locator('#fusionDialog')).not_to_be_visible()
    check(sum(p['speciesId']=='balinha' and p['stage']==0 for p in stored(page)['pets']['inventory'])==5 and stored(page)['pets']['stats']['fused']==28,'bulk chaining commits once, counts all operations and retains five Normals')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'new fusion and preset controls fit mobile width')
    page.reload(wait_until='networkidle');ready(page)
    check(stored(page)['pets']['reserveNormals']==5 and stored(page)['pets']['presets']['capacity']==saved_team,'reserve and named preset survive restart')
    context.close()

    # Future PP reward is previewed, persisted and remains spendable after reload.
    context,page=open_game(browser,seed(pets=pets([('coruja_prismatica',3)]*3,['pet-1','pet-2','pet-3']),totalEarned=1000000000))
    page.goto(BASE+'pages/prestige.html',wait_until='networkidle')
    check('10 PP base + 2 PP de pets = 12' in page.locator('#prestigeGainText').inner_text(),'Prestige displays base, pet bonus and actual total before confirmation')
    page.evaluate("window.savedSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='lollipopSave')throw Error('quota');return window.savedSet.call(this,k,v)};true")
    page.once('dialog',lambda d:d.accept());page.locator('#prestigeBtn').click()
    check(stored(page)['prestigeLevel']==0 and stored(page)['prestigeBonusEarned']==0 and stored(page)['prestigePoints']==0,'failed Prestige save rolls back historical level, base points and the extra-PP ledger together')
    page.evaluate('Storage.prototype.setItem=window.savedSet;true')
    page.once('dialog',lambda d:d.accept());page.locator('#prestigeBtn').click()
    check(stored(page)['prestigeLevel']==10 and stored(page)['prestigeBonusEarned']==2 and stored(page)['prestigePoints']==12,'successful rebirth records two extra PP without changing historical level semantics')
    page.reload(wait_until='networkidle');page.locator('#buyStellarBtn').click()
    check(stored(page)['prestigePoints']==11 and stored(page)['prestigeBonusEarned']==2,'pet PP survive validation and remain spendable after restart')
    context.close()

    # Purchased capacity never disappears or produces without the equipped specialist.
    initial=pets([('guardiao_aurora',3)],['pet-1'])
    context,page=open_game(browser,seed(version=6,pets=initial,upgrades={'superfabrica':24},totalEarned=1e12,pirulitos=1e12))
    page.locator('[data-unequip]').click();page.goto(BASE+'pages/shop.html',wait_until='networkidle')
    check('20 ativas / 24 possuídas' in page.locator('[data-upgrade="superfabrica"]').inner_text(),'shop distinguishes owned and active units and explains inactive extras')
    page.reload(wait_until='networkidle')
    check(stored(page)['upgrades']['superfabrica']==24 and 'inativas' in page.locator('[data-upgrade="superfabrica"]').inner_text(),'inactive ownership survives reload without becoming permanent free production')
    context.close()

    check(not errors,'no uncaught application JavaScript errors: '+repr(errors))
    browser.close()
finally:
    server.shutdown();WORKSPACE.cleanup()
print(f'Completed {checks} Pets browser checks.')
