"""Integration checks against a local static server; Python Playwright + Chromium required.
Run: npm run serve (another terminal), then npm run test:browser.
Optional: LOLLIPOP_BASE_URL, CHROMIUM_PATH. Screenshots go to ignored test-results/.
"""
import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('LOLLIPOP_BASE_URL', 'http://127.0.0.1:8000')
RESULTS = Path('test-results')
RESULTS.mkdir(exist_ok=True)
errors = []
checks = 0


def check(condition, description):
    global checks
    assert condition, description
    checks += 1
    print('PASS', description, flush=True)


def open_game(browser, seed=None, viewport=None, reduced_motion=None):
    context = browser.new_context(viewport=viewport or {'width': 1440, 'height': 1000},
                                  reduced_motion=reduced_motion or 'no-preference')
    if seed is not None:
        context.add_init_script('''if (!localStorage.getItem('lollipopSave')) localStorage.setItem('lollipopSave', %s);''' % json.dumps(json.dumps(seed)))
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: errors.append(f'HTTP {response.status}: {response.url}') if response.status >= 400 else None)
    page.goto(BASE, wait_until='networkidle')
    expect(page.locator('#saveStatus')).not_to_have_text('Salvamento automático')
    return context, page


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")


def tab(page, name):
    page.locator(f'.tab-btn[data-tab="{name}"]').click()
    expect(page.locator(f'#tab-{name}')).to_be_visible()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
                                headless=True, args=['--no-sandbox'])
    context, page = open_game(browser)
    check(page.locator('#scoreDisplay').inner_text() == '0', 'fresh game starts at zero')
    for _ in range(10):
        page.locator('#lollipop').click()
    check(page.locator('#scoreDisplay').inner_text() == '20', 'clicking applies original strawberry bonus')
    expect(page.locator('#toast')).to_be_visible()
    page.locator('#upg-maquina').click()
    check(saved(page)['upgrades']['maquina'] == 1, 'shop buys an affordable upgrade once')
    check(saved(page)['pirulitos'] < 6, 'purchase deducts geometric price')
    page.wait_for_timeout(1200)
    check('0,5' in page.locator('#ppsDisplay').inner_text(), 'fractional automatic production is visible')
    for name in ['flavors', 'skins', 'roulette', 'prestige', 'achievements', 'stats', 'settings', 'upgrades']:
        tab(page, name)
        check(page.locator('.tab-pane:visible').count() == 1, f'{name} navigation selects exactly one panel')
    page.locator('[data-open-tab="flavors"]').click()
    expect(page.locator('#tab-flavors')).to_be_visible()
    page.locator('[data-flavor="blueberry"]').click()
    expect(page.locator('#clickPowerDisplay')).to_have_text('+4')
    tab(page, 'upgrades')
    page.locator('#adBoostBtn').click()
    expect(page.locator('#clickPowerDisplay')).to_have_text('+8')
    check(page.locator('#adBoostBtn').is_disabled(), 'free boost cannot be repeatedly granted')
    page.reload(wait_until='networkidle')
    check(saved(page)['activeFlavor'] == 'blueberry' and saved(page)['upgrades']['maquina'] == 1, 'save survives a refresh')
    page.screenshot(path=str(RESULTS / 'desktop.png'), full_page=True)
    check(page.request.get(BASE + '/assets/audio/bmg1.ogg').status == 200, 'original soundtrack URL resolves')
    check(page.request.get(BASE + '/assets/images/bg-purple.png').status == 200, 'existing background asset resolves')
    context.close()

    rich = {'pirulitos': 2_000_000_000, 'totalEarned': 2_000_000_000, 'upgrades': {'maquina': 10},
            'settings': {'music': False, 'sfx': False}}
    context, page = open_game(browser, rich)
    check(page.evaluate("localStorage.getItem('lollipopSave.legacy-v1') !== null"), 'legacy migration preserves original raw backup')
    tab(page, 'flavors')
    page.locator('[data-flavor="uva"]').click()
    check('uva' in saved(page)['unlockedFlavors'], 'premium flavor purchase unlocks its content')
    tab(page, 'skins')
    page.locator('[data-skin="neon"]').click()
    check(saved(page)['activeSkin'] == 'neon' and saved(page)['activeTheme'] == 'classic', 'skin selection leaves theme independent')
    page.locator('[data-category="theme"]').click()
    page.locator('[data-skin="gold"]').click()
    check(saved(page)['activeSkin'] == 'neon' and saved(page)['activeTheme'] == 'gold', 'theme selection leaves skin independent')
    page.locator('[data-category="particles"]').click()
    page.locator('[data-skin="ice"]').click()
    check(saved(page)['activeParticles'] == 'ice' and saved(page)['activeTheme'] == 'gold', 'particle selection leaves other categories independent')
    tab(page, 'prestige')
    page.once('dialog', lambda d: d.accept())
    page.locator('#prestigeBtn').click()
    check(saved(page)['prestigeLevel'] > 0 and saved(page)['upgrades']['maquina'] == 0, 'prestige resets production and grants permanent levels')
    check(page.locator('#prestigeBtn').is_disabled(), 'prestige reward cannot be claimed twice')
    check('neon' in saved(page)['unlockedSkins'] and 'uva' in saved(page)['unlockedFlavors'], 'prestige preserves purchased collection')
    page.locator('.area-btn[data-area="boss"]').click()
    page.locator('#startBossBtn').click()
    for _ in range(60):
        if page.locator('#bossAvatar').is_disabled():
            break
        page.locator('#bossAvatar').click()
    check(saved(page)['bossesKilled'] == 1, 'boss pays only after enough valid attacks')
    page.locator('.area-btn[data-area="soon"]').click()
    expect(page.locator('#areaSoon')).to_be_visible()
    page.locator('.area-btn[data-area="clicker"]').click()
    tab(page, 'settings')
    page.locator('#toggleParticlesBtn').click()
    check(not saved(page)['settings']['particles'], 'particle setting persists')
    with page.expect_download() as download:
        page.locator('#exportSaveBtn').click()
    export_path = RESULTS / 'export.json'
    download.value.save_as(export_path)
    check(json.loads(export_path.read_text())['prestigeLevel'] > 0, 'export contains progressed state')
    import_data = json.loads(export_path.read_text())
    import_data['pirulitos'] = 12345
    import_path = RESULTS / 'import.json'
    import_path.write_text(json.dumps(import_data))
    page.once('dialog', lambda d: d.accept())
    page.locator('#importSaveInput').set_input_files(import_path)
    page.wait_for_function("JSON.parse(localStorage.getItem('lollipopSave')).pirulitos === 12345")
    check(saved(page)['pirulitos'] == 12345, 'confirmed import replaces state and keeps backup')
    page.once('dialog', lambda d: d.dismiss())
    page.locator('#resetDataBtn').click()
    check(saved(page)['pirulitos'] == 12345, 'cancelled reset preserves progress')
    context.close()

    # Fixed rare prize: saved before animation, resumed after refresh, granted once.
    context, page = open_game(browser)
    tab(page, 'roulette')
    page.evaluate('Math.random = () => 0.75')
    page.locator('#spinBtn').click()
    check(saved(page)['pendingWheel']['index'] == 4, 'wheel reserves sampled prize before animation')
    page.reload(wait_until='networkidle')
    page.wait_for_function("JSON.parse(localStorage.getItem('lollipopSave')).wheelSpins === 1")
    check(saved(page)['wheelClickBonus'] == 100, 'wheel reload settles the actual rare click reward')
    tab(page, 'roulette')
    expect(page.locator('#wheelResult')).to_be_visible()
    check(page.locator('#spinBtn').is_disabled(), 'wheel cooldown stays enforced after refresh')
    page.reload(wait_until='networkidle')
    check(saved(page)['wheelSpins'] == 1 and saved(page)['wheelClickBonus'] == 100, 'wheel settlement never duplicates on reload')
    context.close()

    # Corrupt saves remain exportable as raw bytes and local recovery is explicit.
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    context.add_init_script('''if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('lollipopSave', '{broken-save');
      localStorage.setItem('lollipopSave.backup', JSON.stringify({pirulitos:321, totalEarned:321, upgrades:{}}));
      sessionStorage.setItem('seeded', '1');
    }''')
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until='networkidle')
    check(page.evaluate("localStorage.getItem('lollipopSave')") == '{broken-save', 'corrupt original is not overwritten by bootstrap')
    tab(page, 'settings')
    with page.expect_download() as download:
        page.locator('#exportSaveBtn').click()
    raw_export = RESULTS / 'recovery-raw.json'
    download.value.save_as(raw_export)
    check(raw_export.read_text() == '{broken-save', 'protected export downloads original raw save')
    page.once('dialog', lambda d: d.accept())
    page.locator('#restoreBackupBtn').click()
    check(saved(page)['pirulitos'] == 321, 'confirmed local backup restoration recovers balance')
    check(page.evaluate("localStorage.getItem('lollipopSave.recovery')") == '{broken-save', 'restoration retains corrupt original separately')
    page.reload(wait_until='networkidle')
    check(saved(page)['pirulitos'] == 321, 'restored save loads normally after refresh')
    context.close()

    # Real keyboard activation must produce the same result as a pointer.
    context, page = open_game(browser)
    page.locator('#lollipop').focus()
    page.keyboard.press('Space')
    expect(page.locator('#scoreDisplay')).to_have_text('2')
    page.locator('.tab-btn[data-tab=upgrades]').focus()
    page.keyboard.press('ArrowDown')
    expect(page.locator('#tab-flavors')).to_be_visible()
    check(True, 'keyboard supports lollipop activation and section navigation')
    context.close()

    # Responsive navigation, no horizontal overflow, low-motion accessibility.
    for width, height in [(360, 800), (390, 844), (768, 1024)]:
        context, page = open_game(browser, viewport={'width': width, 'height': height}, reduced_motion='reduce')
        for name in ['upgrades','flavors','skins','roulette','prestige','achievements','stats','settings']:
            tab(page, name)
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{width}px {name} has no horizontal overflow')
        tab(page, 'upgrades')
        page.locator('#lollipop').click()
        expect(page.locator('#scoreDisplay')).to_have_text('2')
        page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(RESULTS / f'layout-{width}.png'), full_page=True)
        context.close()

    # New tab freezes the stale writer instead of overwriting newer progress.
    context, page = open_game(browser)
    other = context.new_page()
    other.goto(BASE, wait_until='networkidle')
    page.wait_for_function("document.querySelector('#saveStatus').textContent.includes('Outra aba')")
    check(page.locator('#lollipop').is_disabled(), 'stale tab becomes read-only')
    other.locator('#lollipop').click()
    tab(other, 'settings')
    other.locator('#toggleSfxBtn').click()
    page.reload(wait_until='networkidle')
    check(saved(page)['totalClicks'] == 1, 'newer tab progress survives stale tab reload')
    context.close()

    # Cached application can be reopened offline after install has completed.
    context, page = open_game(browser)
    page.evaluate('navigator.serviceWorker.ready.then(() => true)')
    page.reload(wait_until='networkidle')
    context.set_offline(True)
    page.reload(wait_until='networkidle')
    page.locator('#lollipop').click()
    expect(page.locator('#scoreDisplay')).to_have_text('2')
    check(True, 'installed app remains playable offline')
    context.close()
    browser.close()

check(not errors, 'no uncaught JavaScript errors or broken asset requests: ' + repr(errors))
print(f'Completed {checks} browser checks.')
