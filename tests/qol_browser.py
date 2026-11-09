"""Focused QoL UI checks. Serve repository; set LOLLIPOP_BASE_URL for subdirectories.
Requires Python Playwright + Chromium. No dependencies are added to the game.
"""
import copy
import json
import os
import time
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LOLLIPOP_BASE_URL', 'http://127.0.0.1:8000/').rstrip('/') + '/'
FIXTURE = json.loads((Path(__file__).parent / 'fixtures/v2-save.json').read_text())
RESULTS = Path('test-results/qol')
RESULTS.mkdir(parents=True, exist_ok=True)
checks = 0
errors = []


def check(condition, label):
    global checks
    assert condition, label
    checks += 1
    print('PASS', label, flush=True)


def seed(**changes):
    value = copy.deepcopy(FIXTURE)
    value.update(version=3, lastTick=int(time.time()*1000), savedAt=int(time.time()*1000),
                 nextEventAt=int(time.time()*1000)+60000, prestigeLevel=0, prestigeClaimed=0,
                 activeFlavor='morango', boss=None, bossesKilled=0, bossCooldownUntil=0,
                 totalEarned=1e9, pirulitos=1e6, boostEndTime=0, upgrades={})
    value.update(changes)
    return value


def ready(page):
    page.wait_for_function("document.body.dataset.readonly === 'false'")


def open_game(browser, value, name='shop', width=390, touch=True, blocked_pref=False):
    context = browser.new_context(viewport={'width':width,'height':844}, has_touch=touch, is_mobile=touch, reduced_motion='reduce')
    context.add_init_script("if (!localStorage.getItem('lollipopSave')) localStorage.setItem('lollipopSave', %s);" % json.dumps(json.dumps(value)))
    # A short absolute boss deadline can expire during goto(networkidle).
    # Observe from document startup, not after the already emitted notification.
    context.add_init_script("window.battleToasts=[];document.addEventListener('lollipop:toast', e=>battleToasts.push(e.detail.message))")
    if blocked_pref:
        context.add_init_script("""const originalGet = Storage.prototype.getItem, originalSet = Storage.prototype.setItem;
        Storage.prototype.getItem = function(k) { if(k === 'lollipopUI.shopView') throw Error('blocked preference'); return originalGet.call(this,k); };
        Storage.prototype.setItem = function(k,v) { if(k === 'lollipopUI.shopView') throw Error('blocked preference'); return originalSet.call(this,k,v); };""")
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(urljoin(BASE, f'pages/{name}.html'), wait_until='networkidle')
    ready(page)
    return context, page


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")


def quote(page, quantity):
    return page.evaluate("""async ({base, quantity}) => {
      const {getBulkQuote} = await import(base+'js/gameplay.js');
      return getBulkQuote(JSON.parse(localStorage.getItem('lollipopSave')), 'maquina', quantity);
    }""", {'base':BASE, 'quantity':quantity})


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
    for view in ['normal','compact']:
        for quantity in [1,10,100,'max']:
            context, page = open_game(browser, seed(version=4,pirulitos=1e12,totalEarned=1e15,prestigeLevel=110,prestigeClaimed=110,factoryExpansions={"maquina":10}))
            page.locator(f'button[data-shop-view="{view}"]').click()
            page.locator(f'[data-buy="{quantity}"]').click()
            offer = quote(page, quantity)
            row = page.locator('[data-upgrade="maquina"]')
            check(not row.is_disabled() and offer['quantity'] > 0, f'{view} ×{quantity}: affordable quote enables purchase')
            if quantity == 'max':
                check(f"MAX: {offer['quantity']} unidades" in row.inner_text(), f'{view}: displayed MAX count is actual quote')
            else:
                check(f'Comprar ×{quantity}' in row.inner_text(), f'{view}: fixed lot action label')
            row.focus()
            page.keyboard.press('Enter')
            state = saved(page)
            check(state['upgrades']['maquina'] == offer['quantity'] and state['pirulitos'] == 1e12-offer['cost'], f'{view} ×{quantity}: exact atomic debit and unit count via keyboard')
            check(page.locator('#toast').is_visible(), f'{view} ×{quantity}: purchase feedback visible')
            if view == 'compact' and quantity == 10:
                page.reload(wait_until='networkidle')
                ready(page)
                check(page.locator('#upgradesList').get_attribute('data-shop-view') == 'compact', 'compact preference persists on reload')
                check(saved(page)['upgrades']['maquina'] == 10, 'game progress survives reload independently of view preference')
            context.close()

    context, page = open_game(browser, seed(pirulitos=0))
    row = page.locator('[data-upgrade="maquina"]')
    check(row.is_disabled() and 'Faltam 15 doces' in row.inner_text(), 'unaffordable fixed unit has clear shortfall')
    check(row.locator('.purchase-estimate').inner_text() == '', 'zero PPS has no misleading countdown')
    page.locator('[data-buy="max"]').click()
    check('MAX: 0 unidades' in row.inner_text() and '15 doces · próxima unidade' in row.inner_text(), 'empty MAX shows next unit price instead of zero/free purchase')
    check('MAX: 0 unidades' in row.get_attribute('aria-label'), 'accessible MAX label includes actual quantity')
    context.close()

    context, page = open_game(browser, seed(pirulitos=0, upgrades={'maquina':1}, boostEndTime=int(time.time()*1000)+10000))
    page.locator('[data-buy="10"]').click()
    check('só com produção' in page.locator('[data-upgrade="maquina"]').inner_text(), 'passive ETA appears when predictable and finite')
    context.close()

    context, page = open_game(browser, seed(), blocked_pref=True)
    page.locator('button[data-shop-view="compact"]').click()
    page.locator('[data-upgrade="maquina"]').click()
    check(saved(page)['upgrades']['maquina'] == 1, 'blocked UI preference storage does not break purchases or saves')
    context.close()

    # Low balance allows previews of paid flavors without granting purchase permission.
    context, page = open_game(browser, seed(pirulitos=0, activeFlavor='blueberry', upgrades={'fabrica':1}, unlockedFlavors=['morango','limao','blueberry']), name='collection')
    check('+20 / toque' in page.locator('[data-card="algodao"]').inner_text(), 'Cotton Candy shows click bonus missing in old description')
    check('+50 / toque' in page.locator('[data-card="arcoiris"]').inner_text(), 'Rainbow shows its actual click bonus')
    page.locator('[data-card=abacaxi] .item-desc summary').click()
    check('Produção: +10%' in page.locator('[data-card="abacaxi"]').inner_text(), 'Pineapple shows its actual passive bonus')
    page.locator('[data-card=uva] .item-desc summary').click()
    check('Foco em produção passiva' in page.locator('[data-card="uva"]').inner_text(), 'Grape describes passive play style')
    check(page.locator('[data-item="uva"]').is_disabled(), 'insufficient balance still prevents paid flavor purchase')
    before = saved(page)
    page.evaluate("window.previewActions=0;document.addEventListener('lollipop:state',e=>{if(e.detail.type.startsWith('action')) previewActions++})")
    for flavor in ['uva','lendario','blueberry']:
        page.locator(f'[data-preview="{flavor}"]').click()
        expect(page.locator('#flavorComparison')).to_be_visible()
        check(page.locator('#comparisonTitle').inner_text().startswith('Comparar:'), f'{flavor}: preview available without owning flavor')
        expected = page.evaluate("""async ({base,id}) => {
          const {previewFlavor} = await import(base+'js/ui/qol.js');
          const {format} = await import(base+'js/ui/shared.js');
          const s=JSON.parse(localStorage.getItem('lollipopSave'));
          const v=previewFlavor(s,id);
          return {click:format(v.preview.click)+' / toque',pps:format(v.preview.pps)+' /s'};
        }""", {'base':BASE,'id':flavor})
        check(page.locator('#previewClick').inner_text() == expected['click'] and page.locator('#previewPps').inner_text() == expected['pps'], f'{flavor}: displayed comparison matches gameplay projection')
        check(page.evaluate("document.activeElement.id") == 'flavorComparison', 'comparison receives accessible focus')
        page.locator('#closeComparison').click()
    after = saved(page)
    fields = ['activeFlavor','activeSkin','activeTheme','activeParticles','unlockedFlavors','unlockedSkins','upgrades','prestigeLevel']
    check(all(before[k] == after[k] for k in fields), 'preview does not equip, unlock, change cosmetics, buildings or prestige')
    # Live currency production is independent; only preview clicks have occurred.
    check(page.evaluate('previewActions') == 0 and after['pirulitos'] >= before['pirulitos'], 'preview performs no gameplay action or currency debit')
    page.locator('[data-item="limao"]').click()
    state = saved(page)
    check(state['activeFlavor'] == 'limao' and all(state[k] == before[k] for k in ['activeSkin','activeTheme','activeParticles']), 'equipping a flavor preserves all three independent cosmetics')
    check('✓ Equipado' in page.locator('[data-card="limao"] .item-state').inner_text(), 'equipped status remains distinct from unlocked')
    check(page.locator('[data-item="limao"]').is_disabled(), 'equipped action is disabled')
    context.close()

    # Preview update reflects boost expiry without rebuilding collection cards.
    now = int(time.time()*1000)
    context, page = open_game(browser, seed(activeFlavor='blueberry', upgrades={'fabrica':1}, boostEndTime=now+3500), name='collection')
    page.locator('[data-preview="uva"]').click()
    check(page.locator('#previewPps').inner_text() == '80 /s', 'flavor preview includes live temporary boost')
    page.evaluate("window.cardReference=document.querySelector('[data-card=uva]')")
    expect(page.locator('#previewPps')).to_have_text('40 /s', timeout=6000)
    check(page.evaluate("window.cardReference===document.querySelector('[data-card=uva]')"), 'boost expiry updates numbers without rebuilding collection cards')
    context.close()

    context, page = open_game(browser, seed(pirulitos=0, activeFlavor='blueberry', totalEarned=1000), name='arena')
    check(page.locator('#bossReward').inner_text() == 'Vitória: 1,5 mil doces', 'first boss reward visible before starting')
    check('30 segundos' in page.locator('#bossTimer').inner_text(), 'battle duration visible before starting')
    page.locator('#startBossBtn').click()
    for _ in range(25):
        page.locator('#bossAvatar').click()
    check(saved(page)['bossesKilled'] == 1 and saved(page)['pirulitos'] == 1500, 'first boss balance/reward unchanged')
    check('Vitória!' in page.locator('#battleResult').inner_text(), 'persistent victory feedback')
    check(page.locator('#battleResult').get_attribute('aria-live') is None, 'victory is announced only by the shared toast live region')
    check('Descanso' in page.locator('#startBossBtn').inner_text() and page.locator('#startBossBtn').is_disabled(), 'cooldown clearly prevents immediate second fight')
    page.wait_for_timeout(400)
    check('tempo acabou' not in page.locator('#battleResult').inner_text().lower(), 'victory is not replaced by a false timeout')
    context.close()

    now = int(time.time()*1000)
    context, page = open_game(browser, seed(pirulitos=0, boss={'maxHp':100,'hp':100,'endsAt':now+1600}), name='arena')
    expect(page.locator('#battleResult')).to_be_visible(timeout=5000)
    check('tempo acabou' in page.locator('#battleResult').inner_text().lower(), 'defeat remains readable after deadline')
    check(page.locator('#bossAvatar').is_disabled() and saved(page)['pirulitos'] == 0, 'defeat disables attacks and grants no reward')
    check(page.evaluate("battleToasts.filter(t=>t.includes('tempo acabou')).length") == 1, 'timeout generates a single notification')
    context.close()

    # Inspect actual card geometry, accessible navigation and long amounts at small widths.
    for width in [280,320,390,640,768,1440]:
        for name in ['shop','collection','arena']:
            context, page = open_game(browser, seed(pirulitos=1e25, upgrades={'maquina':40}), name=name, width=width, touch=width<700)
            if name == 'shop':
                for view in ['normal','compact']:
                    page.locator(f'button[data-shop-view="{view}"]').click()
                    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}px {name}/{view}: no horizontal overflow')
            else:
                check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}px {name}: no horizontal overflow')
            if width<=640:
                check(page.locator('#bottomNav a').first.is_visible(), f'{width}px {name}: mobile navigation visible')
                page.evaluate('window.scrollTo(0,document.body.scrollHeight)')
                target = page.locator('#upgradesList .upgrade-row').last if name=='shop' else page.locator('.inventory-footnote') if name=='collection' else page.locator('.arena-footer')
                target_box = target.bounding_box()
                nav_box = page.locator('.bottom-nav').bounding_box()
                check(target_box['y']+target_box['height'] <= nav_box['y'], f'{width}px {name}: final content clears bottom navigation')
            context.close()

    # New module is part of the release shell; real pages remain usable fully offline.
    context, page = open_game(browser, seed())
    page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
    page.reload(wait_until='networkidle')
    ready(page)
    check(page.evaluate("async () => !!(await caches.match(new URL('../js/ui/qol.js',location.href)))"), 'QoL module is included in the PWA cache')
    context.set_offline(True)
    page.locator('button[data-shop-view="compact"]').click()
    page.locator('[data-upgrade="maquina"]').click()
    page.goto(urljoin(BASE,'pages/collection.html'),wait_until='load')
    ready(page)
    page.locator('[data-preview="uva"]').click()
    check(page.locator('#flavorComparison').is_visible(), 'offline PWA supports compact purchase and flavor comparison')
    context.close()

    # Updated screenshots use the same migrated artist-friendly fixture as earlier images.
    for name in ['shop','collection']:
        for width in [390,1440]:
            context, page = open_game(browser, copy.deepcopy(FIXTURE) | {'lastTick':int(time.time()*1000),'savedAt':int(time.time()*1000)}, name=name, width=width, touch=width==390)
            modes = ['normal','compact'] if name=='shop' else ['comparison']
            for mode in modes:
                if name=='shop': page.locator(f'button[data-shop-view="{mode}"]').click()
                else: page.locator('[data-preview="blueberry"]').click()
                page.evaluate('window.scrollTo(0,0)')
                page.locator('#toast').evaluate('el=>el.hidden=true')
                page.screenshot(path=str(RESULTS/f'{"mobile" if width==390 else "desktop"}-{name}-{mode}.png'), full_page=True)
            context.close()
    check(not errors, f'no uncaught JavaScript errors: {errors}')
    browser.close()
print(f'Completed {checks} QoL browser checks.')
