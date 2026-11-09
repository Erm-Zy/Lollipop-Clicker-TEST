"""Music/collection integration QA. Serve the game; set LOLLIPOP_BASE_URL.
Real-media checks verify Chromium decoding/position, not audible speaker output.
A separate injected Audio mock exercises failure/autoplay and future catalog entries.
"""
from hud_helpers import recipe_filter
import copy
import json
import os
import time
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LOLLIPOP_BASE_URL','http://127.0.0.1:8000/').rstrip('/')+'/'
ROOT = Path(__file__).resolve().parents[1]
FIXTURE = json.loads((ROOT/'tests/fixtures/v2-save.json').read_text())
RESULTS = ROOT/'test-results/music'
RESULTS.mkdir(parents=True, exist_ok=True)
PREF = 'lollipopMusic.preferences.v1'
checks = 0
errors = []

MOCK = """
window.__audio = []; window.__audioReject = null;
window.Audio = class extends EventTarget {
 constructor(){ super(); this.paused=true;this.currentTime=0;this.duration=120;this.volume=1;this.src='';this.loop=false;this.calls=0;this.loads=0;window.__audio.push(this); }
 play(){this.calls++;if(window.__audioReject)return Promise.reject(new DOMException('Test-only audio rejection',window.__audioReject));this.paused=false;this.dispatchEvent(new Event('playing'));return Promise.resolve();}
 pause(){this.paused=true;}
 load(){this.loads++;if(this.src)queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')));}
 removeAttribute(){this.src='';}
};
"""
REAL = """window.__audio=[];const NativeAudio=window.Audio;
window.Audio=function(...args){const audio=new NativeAudio(...args);window.__audio.push(audio);return audio;};
window.Audio.prototype=NativeAudio.prototype;"""
EXTRA = [
    {'id':'test-vale','title':'Teste do Vale','file':'assets/audio/bmg1.ogg','categories':['world'],'worlds':[2],'randomEligible':True,'discovery':{'chapter':2}},
    {'id':'test-boss','title':'Teste de Batalha','file':'assets/audio/bmg1.ogg','categories':['boss'],'bosses':[0],'randomEligible':False},
]


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS',label,flush=True)


def seed(**updates):
    value = copy.deepcopy(FIXTURE)
    value.update(version=3,pirulitos=1e12,totalEarned=1e9,prestigeLevel=0,prestigeClaimed=0,
        activeFlavor='blueberry',upgrades={},boss=None,bossesKilled=0,bossCooldownUntil=0,
        lastTick=int(time.time()*1000),savedAt=int(time.time()*1000),nextEventAt=int(time.time()*1000)+60000,
        settings={'music':True,'sfx':False,'particles':True,'animations':True,'reducedMotion':False})
    value.update(updates)
    return value


def ready(page, writable=True):
    page.wait_for_function("document.querySelector('#saveStatus') && !document.querySelector('#saveStatus').textContent.includes('Preparando')")
    page.wait_for_function(f"document.body.dataset.readonly === '{'false' if writable else 'true'}'")


def open_game(browser, value=None, name='settings', mock=False, extra=False, width=390, pref=None, blocked=False):
    context=browser.new_context(viewport={'width':width,'height':844},has_touch=width<700,is_mobile=width<700,
        reduced_motion='reduce',service_workers='block' if mock else 'allow')
    context.add_init_script(MOCK if mock else REAL)
    value=seed() if value is None else value
    context.add_init_script("if(!localStorage.getItem('lollipopSave'))localStorage.setItem('lollipopSave',%s)"%json.dumps(json.dumps(value)))
    if pref is not None:
        context.add_init_script("if(!localStorage.getItem(%s))localStorage.setItem(%s,%s)"%(json.dumps(PREF),json.dumps(PREF),json.dumps(json.dumps(pref))))
    if blocked:
        context.add_init_script("""const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
        Storage.prototype.getItem=function(k){if(k.startsWith('lollipopMusic.'))throw Error('music storage blocked');return get.call(this,k)};
        Storage.prototype.setItem=function(k,v){if(k.startsWith('lollipopMusic.'))throw Error('music storage blocked');return set.call(this,k,v)};""")
    if extra:
        source=(ROOT/'js/music/catalog.js').read_text().replace('export const MUSIC_TRACKS = [','export const MUSIC_TRACKS = [\n'+','.join(json.dumps(t) for t in EXTRA)+',')
        context.route('**/js/music/catalog.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=source))
    page=context.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(urljoin(BASE,'index.html' if name=='home' else f'pages/{name}.html'),wait_until='networkidle')
    ready(page)
    return context,page


def goto(page,name):
    page.goto(urljoin(BASE,'index.html' if name=='home' else f'pages/{name}.html'),wait_until='networkidle')
    ready(page)


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")


def preferences(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))',PREF)


with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    context,page=open_game(browser,mock=True)
    check(page.locator('#musicMode').input_value()=='original','existing players default to original mode')
    check(page.locator('.jukebox-track').count()==1,'production Jukebox contains only the one real registered song')
    check(page.evaluate('__audio.length===1 && __audio[0].calls===0'),'one idle media element; no autoplay attempt before interaction')
    check('Toque em Reproduzir' in page.locator('#musicStatus').inner_text(),'subtle interaction instruction is visible')
    before=saved(page)
    page.locator('#musicPlayBtn').click()
    expect(page.locator('#musicStatus')).to_contain_text('Em reprodução')
    check(page.evaluate('__audio[0].calls===1 && __audio[0].loop'),'single-track playback loops')
    page.locator('#musicMode').select_option('random')
    page.locator('#musicVolume').fill('42')
    check(preferences(page)['mode']=='random' and preferences(page)['volume']==.42,'mode and volume use independent preferences')
    check(page.evaluate('__audio[0].volume===.42'),'volume changes apply to actual media element')
    check(page.locator('#musicNextBtn').is_disabled(),'next is disabled for a single-track playlist')
    page.wait_for_timeout(700)
    check(page.evaluate('__audio[0].calls===1'),'runtime ticks and mode change do not restart the same song')
    after=saved(page)
    check(all(before[k]==after[k] for k in ['pirulitos','upgrades','activeFlavor','activeSkin','activeTheme','activeParticles']),'Jukebox controls do not spend, equip, or change gameplay')
    page.locator('#toggleMusicBtn').click()
    check(page.evaluate('__audio[0].paused'),'existing music toggle pauses the player')
    page.locator('#musicMode').select_option('world')
    check(saved(page)['settings']['music'] is False,'mode selection does not re-enable disabled music')
    page.locator('#toggleMusicBtn').click()
    page.wait_for_function('!__audio[0].paused')
    page.evaluate("document.dispatchEvent(new CustomEvent('lollipop:native-pause'))")
    page.wait_for_function('__audio[0].paused')
    check(True,'runtime background event suspends music')
    page.evaluate("document.dispatchEvent(new CustomEvent('lollipop:native-resume'))")
    ready(page)
    page.wait_for_function('!__audio[0].paused')
    check(True,'runtime resume reacquires ownership before resuming music')
    context.close()

    context,page=open_game(browser,mock=True)
    page.evaluate("__audioReject='NotAllowedError'")
    page.locator('#musicPlayBtn').click()
    expect(page.locator('#musicStatus')).to_contain_text('Toque em Reproduzir')
    calls=page.evaluate('__audio[0].calls')
    page.wait_for_timeout(1300)
    check(page.evaluate('__audio[0].calls')==calls,'autoplay rejection is not retried by 200ms ticks')
    page.evaluate('__audioReject=null')
    page.locator('#musicPlayBtn').click()
    expect(page.locator('#musicStatus')).to_contain_text('Em reprodução')
    check(True,'explicit gesture retries after autoplay rejection')
    page.evaluate("__audio[0].dispatchEvent(new Event('error'))")
    expect(page.locator('#musicStatus')).to_contain_text('indisponível')
    calls=page.evaluate('__audio[0].calls')
    page.wait_for_timeout(600)
    check(page.evaluate('__audio[0].calls')==calls,'missing audio produces a stable fallback state without retry loop')
    check(page.locator('#toggleSfxBtn').is_enabled(),'audio failure leaves game controls usable')
    context.close()

    context,page=open_game(browser,mock=True,blocked=True)
    page.locator('#musicMode').select_option('manual')
    page.locator('#musicVolume').fill('65')
    check('temporárias' in page.locator('#musicStatus').inner_text(),'blocked preference storage is explained without breaking settings')
    check(saved(page)['version']==7 and page.evaluate('__audio[0].volume===.65'),'blocked music storage preserves main save and in-memory controls')
    context.close()

    # Browser DOM + real storage, mock media and injected future entries.
    context,page=open_game(browser,seed(upgrades={'maquina':24}),mock=True,extra=True)
    check('capítulo 3' in page.locator('[data-track="test-vale"]').inner_text(),'a real catalog entry can have chapter discovery requirements')
    check(page.locator('[data-music-track="test-vale"]').is_disabled(),'undiscovered track cannot be manually selected')
    check(preferences(page)['highestChapter']==1,'initial discovery silently baselines existing progress')
    goto(page,'shop')
    page.evaluate("window.chapterNotices=[];document.addEventListener('lollipop:toast',e=>{if(e.detail.message.includes('Novo capítulo'))chapterNotices.push(e.detail.message)})")
    page.locator('[data-upgrade="maquina"]').click()
    check(page.evaluate('chapterNotices.length')==1,'actual purchase crossing chapter threshold announces once')
    check(preferences(page)['highestChapter']==2 and 'test-vale' in preferences(page)['discovered'],'chapter purchase persists musical discovery independently')
    goto(page,'settings')
    check(page.locator('[data-music-track="test-vale"]').is_enabled(),'discovered track becomes selectable in Jukebox')
    page.locator('#musicMode').select_option('world')
    expect(page.locator('#nowPlaying')).to_contain_text('Teste do Vale')
    check(True,'dynamic mode selects the assigned chapter track')
    page.locator('#musicMode').select_option('random')
    check(page.locator('#musicNextBtn').is_enabled(),'random mode sees multiple eligible discovered tracks')
    initial=page.locator('#nowPlaying').inner_text()
    page.locator('#musicNextBtn').click()
    check(page.locator('#nowPlaying').inner_text()!=initial,'next random track avoids the previous track')
    page.locator('#musicMode').select_option('world')
    goto(page,'arena')
    page.locator('#startBossBtn').click()
    page.wait_for_function("JSON.parse(sessionStorage.getItem('lollipopMusic.session.v1'))?.trackId==='test-boss'")
    check(True,'dynamic mode selects the actual first boss assignment')
    loads=page.evaluate('__audio[0].loads')
    for _ in range(20):page.locator('#bossAvatar').click()
    check(page.evaluate('__audio[0].loads')==loads,'boss attacks never restart the battle song')
    for _ in range(5):page.locator('#bossAvatar').click()
    page.wait_for_function("JSON.parse(sessionStorage.getItem('lollipopMusic.session.v1'))?.trackId==='test-vale'")
    check(True,'victory immediately returns to world playlist')
    goto(page,'settings')
    expect(page.locator('#nowPlaying')).to_contain_text('Teste do Vale')
    page.locator('[data-music-track="original"]').click()
    goto(page,'arena')
    # The first victory has a cooldown: mock browser time forward, not game formulas.
    page.clock.install()
    page.clock.fast_forward(31000)
    expect(page.locator('#startBossBtn')).to_be_enabled()
    page.locator('#startBossBtn').click()
    goto(page,'settings')
    check(preferences(page)['mode']=='manual' and preferences(page)['manualTrackId']=='original','manual choice persists across page navigation and battle')
    goto(page,'prestige')
    page.once('dialog',lambda dialog:dialog.accept())
    page.locator('#prestigeBtn').click()
    check(saved(page)['upgrades']['maquina']==0 and 'test-vale' in preferences(page)['discovered'],'prestige resets machines while preserving discovered music')
    context.close()

    context,page=open_game(browser,seed(upgrades={'maquina':25}),mock=True,extra=True)
    page.bring_to_front()
    page.wait_for_function('!document.hidden')
    # Settle the first-gesture status/layout before selecting a track by pointer.
    # This case tests Manual continuity; autoplay gestures are covered above.
    page.locator('#musicPlayBtn').click()
    page.wait_for_function('__audio[0].paused===false')
    page.locator('[data-music-track="test-vale"]').click()
    # Selecting a track fades out asynchronously; navigation must wait for the
    # actual source/session, not merely the immediately updated target label.
    try:
        page.wait_for_function("JSON.parse(sessionStorage.getItem('lollipopMusic.session.v1'))?.trackId==='test-vale'")
    except Exception:
        print('Manual music setup:',page.evaluate("({hidden:document.hidden,prefs:localStorage.getItem('lollipopMusic.preferences.v1'),session:sessionStorage.getItem('lollipopMusic.session.v1'),audio:__audio.map(a=>({calls:a.calls,loads:a.loads,paused:a.paused,volume:a.volume})),status:document.getElementById('musicStatus').textContent})"),flush=True)
        raise
    goto(page,'arena');page.locator('#startBossBtn').click()
    # Observe the battle transition window to detect an unwanted source switch.
    page.wait_for_timeout(250)
    check(preferences(page)['mode']=='manual' and page.evaluate("JSON.parse(sessionStorage.getItem('lollipopMusic.session.v1')).trackId==='test-vale'"),'Manual mode is preserved even when this boss has a soundtrack')
    goto(page,'settings');page.locator('#musicBattleOverrides').check()
    goto(page,'arena')
    page.wait_for_function("JSON.parse(sessionStorage.getItem('lollipopMusic.session.v1'))?.trackId==='test-boss'")
    check(True,'Manual battle override is applied only after explicit opt-in')
    context.close()

    context,page=open_game(browser,mock=True)
    page.locator('#musicPlayBtn').click()
    other=context.new_page();other.on('pageerror',lambda error:errors.append(str(error)))
    other.goto(urljoin(BASE,'pages/settings.html'),wait_until='networkidle');ready(other,False)
    check(other.locator('#musicMode').is_disabled() and other.evaluate('__audio[0].calls===0'),'read-only second tab cannot play or configure music')
    check(page.evaluate('__audio.length===1') and other.evaluate('__audio.length===1'),'each document owns only one audio element')
    page.close();other.reload(wait_until='networkidle');ready(other)
    other.locator('#musicPlayBtn').click()
    check(other.evaluate('__audio[0].calls===1'),'new writer can resume audio after old writer closes')
    context.close()

    context,page=open_game(browser,name='collection')
    recipe_filter(page,'unlocked').click()
    check(page.locator('[data-card]:visible').count()==4,'unlocked flavor filter uses actual ownership')
    recipe_filter(page,'locked').click()
    check(page.locator('[data-card]:visible').count()==7,'locked flavor filter uses actual ownership')
    page.evaluate("window.preservedCard=document.querySelector('[data-card=laranja]')")
    recipe_filter(page,'affordable').click()
    check(page.locator('[data-card]:visible').count()==7,'affordable filter excludes already unlocked items')
    check(page.evaluate("preservedCard===document.querySelector('[data-card=laranja]')"),'filter changes preserve existing card DOM')
    page.locator('[data-category="theme"]').click()
    check(page.locator('[data-card]:visible').count()==3,'same filter applies to independently equipped worlds')
    check(recipe_filter(page,'affordable').get_attribute('aria-pressed')=='true','category change preserves selected filter')
    page.locator('[data-category="flavors"]').click();recipe_filter(page,'all').click()
    target=page.locator('[data-preview="lendario"]');target.scroll_into_view_if_needed()
    before_scroll=page.evaluate('scrollY');before=saved(page)
    target.click()
    expect(page.locator('#flavorComparison')).to_be_visible()
    check(abs(page.evaluate('scrollY')-before_scroll)<2,'bottom flavor comparison does not jump to page top')
    check(page.locator('#comparisonPreview').inner_text()=='Prévia · Sabor Lendário','sheet identifies previewed flavor')
    page.keyboard.press('Escape')
    expect(page.locator('#flavorComparison')).not_to_be_visible()
    check(page.evaluate("document.activeElement.dataset.preview==='lendario'"),'Escape closes sheet and restores focus to triggering card')
    check(abs(page.evaluate('scrollY')-before_scroll)<2,'closing comparison preserves scroll position')
    check(saved(page)['activeFlavor']==before['activeFlavor'],'sheet never equips a previewed flavor')
    context.close()
    context,page=open_game(browser,seed(pirulitos=0),name='collection')
    recipe_filter(page,'affordable').click()
    check(page.locator('#inventoryEmpty').is_visible(),'empty filters have a friendly message')
    context.close()

    context,page=open_game(browser,name='shop')
    normal=page.locator('#upgradesList').bounding_box()['height']
    intro=page.locator('#upgradesList').bounding_box()['y']
    page.locator('button[data-shop-view="compact"]').click()
    compact=page.locator('#upgradesList').bounding_box()['height']
    reduction=1-compact/normal
    check(reduction>=.2,f'compact rows meaningfully reduce list height: {reduction:.1%}')
    check(page.locator('#upgradesList').bounding_box()['y']<intro,'compact view also shortens decorative intro')
    check(page.locator('[data-upgrade="maquina"]').bounding_box()['height']>=44,'compact purchase rows retain comfortable touch target')
    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'compact price and production layout has no horizontal overflow')
    context.close()

    # Native media in Chromium: decode original OGG, restore position, and play offline.
    context,page=open_game(browser)
    page.locator('#musicPlayBtn').click()
    page.wait_for_function('__audio[0].currentTime>0.05 && !__audio[0].paused && __audio[0].readyState>=2')
    check(True,'real Chromium decodes and advances original OGG after user interaction')
    page.evaluate('__audio[0].currentTime=12')
    page.locator('#bottomNav a[href$="shop.html"]').click()
    page.wait_for_url(urljoin(BASE,'pages/shop.html'));ready(page)
    page.wait_for_function('__audio[0].currentTime>=11.5')
    check(True,'real media approximately restores playback position across HTML navigation')
    page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
    page.reload(wait_until='networkidle');ready(page)
    page.wait_for_function('navigator.serviceWorker.controller!==null')
    context.set_offline(True)
    range_result=page.evaluate("""async base=>{const r=await fetch(base+'assets/audio/bmg1.ogg',{headers:{Range:'bytes=0-31'}});return {status:r.status,length:(await r.arrayBuffer()).byteLength,range:r.headers.get('content-range')}}""",BASE)
    check(range_result['status']==206 and range_result['length']==32 and range_result['range'].startswith('bytes 0-31/'),'offline PWA serves correct audio byte ranges')
    suffix=page.evaluate("""async base=>{const r=await fetch(base+'assets/audio/bmg1.ogg',{headers:{Range:'bytes=-8'}});return {status:r.status,bytes:Array.from(new Uint8Array(await r.arrayBuffer()))}}""",BASE)
    check(suffix['status']==206 and suffix['bytes']==list((ROOT/'assets/audio/bmg1.ogg').read_bytes()[-8:]),'offline suffix range contains the correct cached bytes')
    invalid=page.evaluate("""async base=>(await fetch(base+'assets/audio/bmg1.ogg',{headers:{Range:'bytes=99999999-'}})).status""",BASE)
    check(invalid==416,'unsatisfiable audio range returns HTTP 416')
    goto(page,'settings');page.locator('#musicPlayBtn').click()
    page.wait_for_function('__audio[0].currentTime>0 && !__audio[0].paused && __audio[0].readyState>=2')
    expect(page.locator('#musicStatus')).to_contain_text('Em reprodução',timeout=10000)
    check(True,'original track decodes in offline PWA')
    context.close()

    # Screenshots of production catalog only: no simulated tracks in delivery images.
    for name in ['settings','shop','collection']:
        context,page=open_game(browser,seed(pirulitos=100000,upgrades={'maquina':24}),name=name)
        if name=='settings':page.locator('#candyJukebox').scroll_into_view_if_needed()
        elif name=='shop':page.locator('button[data-shop-view="compact"]').click()
        else:recipe_filter(page,'affordable').click()
        page.locator('#toast').evaluate('el=>el.hidden=true')
        page.screenshot(path=str(RESULTS/f'mobile-{name}.png'),full_page=name!='settings')
        if name=='collection':
            page.locator('[data-preview="laranja"]').click()
            page.screenshot(path=str(RESULTS/'mobile-comparison.png'))
        context.close()
    check(not errors,f'no uncaught JavaScript errors: {errors}')
    browser.close()
print(f'Completed {checks} music/mobile browser checks.')
