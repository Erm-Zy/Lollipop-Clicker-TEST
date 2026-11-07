"""Real-document integration QA for Lollipop Clicker 3.0.

Serve the generated dist artifact (npm run serve), then npm run test:browser.
To exercise GitHub Pages paths, build into an empty parent/Lollipop-Clicker-TEST
directory, serve that parent and set LOLLIPOP_BASE_URL to the complete subpath.
Requires Python Playwright and Chromium; no browser dependency is shipped in-game.
"""
import copy
import json
import math
import os
import time
from pathlib import Path
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("LOLLIPOP_BASE_URL", "http://127.0.0.1:8000/").rstrip("/") + "/"
RESULTS = Path("test-results/v3")
RESULTS.mkdir(parents=True, exist_ok=True)
FIXTURE = json.loads((Path(__file__).parent / "fixtures/v2-save.json").read_text())
PAGES = ["home", "shop", "collection", "pets", "arena", "prestige", "achievements", "statistics", "rewards", "settings"]
errors = []
checks = 0


def check(condition, description):
    global checks
    assert condition, description
    checks += 1
    print("PASS", description, flush=True)


def route(name):
    return urljoin(BASE, "index.html" if name == "home" else f"pages/{name}.html")


def fixture(**updates):
    value = copy.deepcopy(FIXTURE)
    value.update(lastTick=int(time.time() * 1000), savedAt=int(time.time() * 1000))
    value.update(updates)
    return value


def attach(page):
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("response", lambda response: errors.append(f"HTTP {response.status}: {response.url}") if response.status >= 400 else None)
    return page


def ready(page, writable=True):
    page.wait_for_function("document.querySelector('#saveStatus') && !document.querySelector('#saveStatus').textContent.includes('Preparando')")
    if writable:
        page.wait_for_function("document.body.dataset.readonly === 'false'")
    return page


def open_game(browser, seed=None, width=1440, height=900, name="home", motion="no-preference", touch=False):
    context = browser.new_context(viewport={"width": width, "height": height}, reduced_motion=motion, has_touch=touch, is_mobile=touch)
    if seed is not None:
        context.add_init_script("if (!localStorage.getItem('lollipopSave')) localStorage.setItem('lollipopSave', %s);" % json.dumps(json.dumps(seed)))
    page = attach(context.new_page())
    page.goto(route(name), wait_until="networkidle")
    ready(page)
    return context, page


def saved(page):
    return page.evaluate("JSON.parse(localStorage.getItem('lollipopSave'))")


def navigate(page, name):
    # Use actual anchors and browser navigation, including the mobile More drawer.
    destination = "index.html" if name == "home" else f"{name}.html"
    candidates = page.locator(f'a[href$="{destination}"]:visible')
    if candidates.count() == 0:
        summary = page.locator("#bottomNav .more-menu summary")
        if summary.is_visible():
            summary.click()
        candidates = page.locator(f'a[href$="{destination}"]:visible')
    assert candidates.count(), f"No usable navigation link to {name}"
    candidates.first.click()
    page.wait_for_url(route(name))
    ready(page)
    assert page.locator("body").get_attribute("data-page") == name
    assert page.locator('a[aria-current="page"]').count() >= 1


def capture(page, name):
    page.evaluate("window.scrollTo(0, 0)")
    page.locator("#toast").evaluate("el => el.hidden = true")
    page.screenshot(path=str(RESULTS / name), full_page=True)


def production_rate(state):
    bases = {"maquina": .5, "calda": 4, "fabrica": 32, "misturador": 260, "embaladora": 1400, "laboratorio": 7800, "linha": 44000, "superfabrica": 260000}
    multipliers = {"morango": 1, "limao": 1.2, "blueberry": 1.1, "uva": 1.25, "laranja": 1.15, "melancia": 1.4, "abacaxi": 1.1, "chocolate": 1.6, "algodao": 2, "arcoiris": 2.5, "lendario": 4}
    return sum(state["upgrades"][key] * value for key, value in bases.items()) * multipliers[state["activeFlavor"]] * (1 + .15 * state["prestigeLevel"])


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"), headless=True, args=["--no-sandbox"])

    context, page = open_game(browser)
    check(page.locator("#scoreDisplay").inner_text() == "0", "new world starts with zero candy")
    page.locator("#lollipop").focus()
    page.keyboard.press("Space")
    for _ in range(9):
        page.locator("#lollipop").click()
    check(page.locator("#scoreDisplay").inner_text() == "20", "keyboard and rapid pointer clicks preserve flavor power")
    page.locator('[data-upgrade="maquina"]').click()
    check(saved(page)["upgrades"]["maquina"] == 1, "world quick shop buys an affordable building")
    navigate(page, "shop")
    first = saved(page)
    page.wait_for_timeout(1200)
    navigate(page, "home")
    second = saved(page)
    expected_gain = production_rate(first) * (second["lastTick"] - first["lastTick"]) / 1000
    check(abs(second["pirulitos"] - first["pirulitos"] - expected_gain) < .01, "production across HTML navigation counts elapsed time exactly once")
    page.go_back(wait_until="networkidle")
    ready(page)
    check(page.url == route("shop") and saved(page)["upgrades"]["maquina"] == 1, "Back restores a real shop document without resetting progress")
    page.go_forward(wait_until="networkidle")
    ready(page)
    check(page.url == route("home") and saved(page)["totalClicks"] == 10, "Forward restores world state and writer ownership")
    check(not page.locator("#toast").is_visible() or "Enquanto você explorava" not in page.locator("#toast").inner_text(), "normal page navigation avoids offline-reward popup spam")
    page.reload(wait_until="networkidle")
    ready(page)
    check(saved(page)["totalClicks"] == 10, "refresh preserves manual progress")
    for name in PAGES:
        navigate(page, name)
        check(page.locator("body").get_attribute("data-page") == name, f"{name} loads its own HTML document")
    check(page.request.get(urljoin(BASE, "assets/audio/bmg1.ogg")).status == 200, "original soundtrack resolves under the application base path")
    context.close()

    context, page = open_game(browser, {"pirulitos": 0, "upgrades": {}, "settings": {"music": False, "sfx": False, "particles": False}}, width=390, height=844, touch=True)
    for _ in range(30):
        page.locator("#lollipop").tap()
    expect(page.locator("#scoreDisplay")).to_have_text("60")
    navigate(page, "shop")
    check(saved(page)["totalClicks"] == 30 and saved(page)["pirulitos"] == 60, "thirty rapid real touchscreen taps award exactly thirty clicks")
    context.close()

    event_now = int(time.time() * 1000)
    context, page = open_game(browser, fixture(version=3, pirulitos=0, totalEarned=0, prestigeLevel=0, prestigeClaimed=0,
                        activeFlavor="morango", upgrades={}, nextEventAt=event_now + 60000,
                        sugarEvent={"id": event_now, "endsAt": event_now + 12000}))
    page.locator("#sugarEvent").click()
    check(saved(page)["sugarEventsClaimed"] == 1 and saved(page)["pirulitos"] == 25, "live golden sugar is paid exactly once by an explicit touch")
    check(page.locator("#sugarEvent").is_hidden(), "collected world event immediately disappears")
    page.locator("#adBoostBtn").click()
    check(saved(page)["boostsObtained"] == 4 and page.locator("#adBoostBtn").is_disabled(), "free temporary boost grants once and then enforces cooldown")
    navigate(page, "collection")
    check(saved(page)["boostEndTime"] > int(time.time() * 1000), "temporary boost deadline survives page navigation")
    context.close()

    migrated_fixture = fixture()
    context, page = open_game(browser, migrated_fixture)
    state = saved(page)
    check(state["version"] == 5, "actual v2 save migrates to schema 5")
    check(state["activeSkin"] == "neon" and state["activeTheme"] == "gold" and state["activeParticles"] == "ice", "migration preserves all three independent cosmetic selections")
    check(state["prestigeLevel"] == 12 and state["prestigeClaimed"] == 12, "migration preserves existing prestige and consumed claims")
    backup = page.evaluate("JSON.parse(localStorage.getItem('lollipopSave.legacy-v2'))")
    check(backup == migrated_fixture, "immutable version 2 backup preserves the actual original save")
    navigate(page, "collection")
    page.locator('[data-category="flavors"]').click()
    page.locator('[data-item="blueberry"]').click()
    check(saved(page)["activeFlavor"] == "blueberry", "inventory equips a free flavor bonus")
    page.locator('[data-item="laranja"]').click()
    check("laranja" in saved(page)["unlockedFlavors"], "inventory purchases and unlocks a premium flavor")
    page.locator('[data-category="skin"]').click()
    page.locator('[data-item="classic"]').click()
    check(saved(page)["activeSkin"] == "classic" and saved(page)["activeTheme"] == "gold", "skin equipment leaves environment independent")
    page.locator('[data-category="theme"]').click()
    page.locator('[data-item="neon"]').click()
    check(saved(page)["activeTheme"] == "neon" and saved(page)["activeParticles"] == "ice", "environment equipment leaves particles independent")
    page.locator('[data-category="particles"]').click()
    page.locator('[data-item="classic"]').click()
    check(saved(page)["activeParticles"] == "classic" and saved(page)["activeSkin"] == "classic", "particle equipment is a distinct saved category")
    navigate(page, "prestige")
    check(page.locator("#prestigeBtn").is_disabled(), "migrated lifetime prestige cannot be resold")
    context.close()

    context, page = open_game(browser, fixture(version=4, pirulitos=1e15, totalEarned=1e15, prestigeLevel=110, prestigeClaimed=110, factoryExpansions={"maquina":10}, activeFlavor="morango", upgrades={}), name="shop")
    page.locator('[data-buy="10"]').click()
    page.locator('[data-upgrade="maquina"]').click()
    check(saved(page)["upgrades"]["maquina"] == 10, "shop buys a fixed lot of ten in one action")
    page.locator('[data-buy="100"]').click()
    page.locator('[data-upgrade="maquina"]').click()
    check(saved(page)["upgrades"]["maquina"] == 110, "shop buys a fixed lot of one hundred")
    page.locator('[data-buy="max"]').click()
    page.locator('[data-upgrade="maquina"]').click()
    state = saved(page)
    next_price = math.floor(15 * 1.15 ** state["upgrades"]["maquina"])
    check(state["upgrades"]["maquina"] == 140 and state["pirulitos"] >= 0, "MAX respects the expanded capacity as well as affordability")
    context.close()

    context, page = open_game(browser, fixture(pirulitos=1000, totalEarned=8_000_000, prestigeLevel=0, prestigeClaimed=0, upgrades={}), name="prestige")
    page.once("dialog", lambda d: d.dismiss())
    page.locator("#prestigeBtn").click()
    check(saved(page)["prestigeLevel"] == 0, "cancelled prestige leaves progression intact")
    page.once("dialog", lambda d: d.accept())
    page.locator("#prestigeBtn").click()
    check(saved(page)["prestigeLevel"] == 2 and saved(page)["pirulitos"] == 0, "confirmed prestige grants only eligible permanent levels")
    check(page.locator("#prestigeBtn").is_disabled(), "prestige cannot grant the same reward twice")
    check("neon" in saved(page)["unlockedSkins"], "prestige preserves owned cosmetic inventory")
    context.close()

    context, page = open_game(browser, fixture(bossesKilled=0, activeFlavor="blueberry", prestigeLevel=0, prestigeClaimed=0, totalEarned=1000, pirulitos=0, upgrades={}), name="arena")
    fill = page.locator("#bossHpBar").bounding_box()
    track = page.locator(".boss-hp-track").bounding_box()
    check(fill is not None and fill["height"] > 0 and fill["width"] / track["width"] > .9, "full boss health is drawn as a visible filled bar")
    page.locator("#startBossBtn").click()
    for _ in range(30):
        if page.locator("#bossAvatar").is_disabled():
            break
        page.locator("#bossAvatar").click()
    check(saved(page)["bossesKilled"] == 1 and saved(page)["pirulitos"] == 1500, "arena grants the boss reward only after enough live attacks")
    check(page.locator("#startBossBtn").is_disabled(), "arena cooldown prevents immediate repeated challenges")
    context.close()

    # The deadline is absolute even when a suspended document has no timer callback.
    now = int(time.time() * 1000)
    expired_battle = fixture(version=3, bossesKilled=0, totalEarned=0, pirulitos=0, upgrades={},
                             boss={"maxHp": 100, "hp": 1, "endsAt": now + 1600})
    context, page = open_game(browser, expired_battle, name="arena")
    page.wait_for_timeout(1800)
    check(page.locator("#bossAvatar").is_disabled(), "expired absolute boss deadline disables attacks")
    navigate(page, "statistics")
    state = saved(page)
    check(state["bossesKilled"] == 0 and state["pirulitos"] == 0 and state["boss"] is None,
          "expired boss never grants a late victory or currency reward")
    context.close()

    context, page = open_game(browser, name="rewards")
    page.evaluate("Math.random = () => 0.75")
    page.locator("#spinBtn").click()
    check(saved(page)["pendingWheel"]["index"] == 4, "wheel reserves the actual rare prize before animation")
    navigate(page, "collection")
    page.wait_for_timeout(3500)
    navigate(page, "rewards")
    state = saved(page)
    check(state["pendingWheel"] is None and state["wheelSpins"] == 1 and state["wheelClickBonus"] == 100, "wheel settles exactly once across different HTML documents")
    check(page.locator("#spinBtn").is_disabled(), "wheel cooldown survives document navigation")
    page.reload(wait_until="networkidle")
    ready(page)
    check(saved(page)["wheelSpins"] == 1 and saved(page)["wheelClickBonus"] == 100, "reloading cannot duplicate the wheel payout")
    context.close()

    pending_now = int(time.time() * 1000)
    context, page = open_game(browser, fixture(version=3, pendingWheel={"index":4,"startedAt":pending_now,
                        "endsAt":pending_now+3200,"amount":0}, lastWheelTime=pending_now), name="rewards", motion="reduce")
    check(page.evaluate("document.querySelector('#wheelCanvas').getContext('2d').getImageData(180,180,1,1).data[3] > 0"),
          "reduced-motion pending wheel paints a static illustration instead of an empty canvas")
    context.close()

    context, page = open_game(browser, fixture(), name="settings")
    page.locator("#toggleParticlesBtn").click()
    check(not saved(page)["settings"]["particles"], "particle preference is persisted independently")
    page.locator("#toggleAnimationsBtn").click()
    check(not saved(page)["settings"]["animations"] and page.locator("body").get_attribute("data-motion") == "off", "world animation preference persists independently from particles")
    with page.expect_download() as download:
        page.locator("#exportSaveBtn").click()
    export_path = RESULTS / "export.json"
    download.value.save_as(export_path)
    check(json.loads(export_path.read_text())["prestigeLevel"] == 12, "export retains migrated player progression")
    imported = json.loads(export_path.read_text())
    imported["upgrades"] = {}
    imported["pirulitos"] = 12345
    import_path = RESULTS / "import.json"
    import_path.write_text(json.dumps(imported))
    page.once("dialog", lambda d: d.accept())
    page.locator("#importSaveInput").set_input_files(import_path)
    page.wait_for_function("JSON.parse(localStorage.getItem('lollipopSave')).pirulitos === 12345")
    check(saved(page)["pirulitos"] == 12345, "confirmed import safely replaces progress")
    page.once("dialog", lambda d: d.dismiss())
    page.locator("#resetDataBtn").click()
    check(saved(page)["pirulitos"] == 12345, "cancelled reset preserves the imported save")
    context.close()

    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("""if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('lollipopSave', '{broken-save');
      localStorage.setItem('lollipopSave.backup', JSON.stringify({pirulitos:321,totalEarned:321,upgrades:{}}));
      sessionStorage.setItem('seeded','1');
    }""")
    page = attach(context.new_page())
    page.goto(route("settings"), wait_until="networkidle")
    ready(page)
    check(page.evaluate("localStorage.getItem('lollipopSave')") == "{broken-save", "corrupt original survives multipage bootstrap")
    with page.expect_download() as download:
        page.locator("#exportSaveBtn").click()
    raw_path = RESULTS / "recovery-raw.json"
    download.value.save_as(raw_path)
    check(raw_path.read_text() == "{broken-save", "protected export preserves recoverable raw bytes")
    page.once("dialog", lambda d: d.accept())
    page.locator("#restoreBackupBtn").click()
    check(saved(page)["pirulitos"] == 321, "explicit local-backup restoration recovers player balance")
    check(page.evaluate("localStorage.getItem('lollipopSave.recovery')") == "{broken-save", "restoration retains corrupt source separately")
    context.close()

    context, page = open_game(browser)
    other = attach(context.new_page())
    other.goto(route("home"), wait_until="networkidle")
    ready(other, writable=False)
    other.wait_for_function("document.body.dataset.readonly === 'true'")
    check(other.locator("#lollipop").is_disabled(), "second tab is read-only while the first owns the production clock")
    page.locator("#lollipop").click()
    navigate(page, "settings")
    check(saved(page)["totalClicks"] == 1, "owning tab saves changes without interference from read-only tab")
    page.close()
    other.reload(wait_until="networkidle")
    ready(other)
    check(saved(other)["totalClicks"] == 1 and other.locator("#lollipop").is_enabled(), "remaining tab acquires ownership after the old document closes")
    context.close()

    for width, height in [(1440, 900), (390, 844), (360, 800), (768, 1024)]:
        context, page = open_game(browser, fixture(activeSkin="classic", activeTheme="classic", activeParticles="classic"), width=width, height=height, motion="reduce")
        for name in PAGES:
            navigate(page, name)
            check(page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"{width}px {name} has no horizontal overflow")
            if width in [1440, 390] and name in ["home", "shop", "arena"]:
                capture(page, f"{'desktop' if width == 1440 else 'mobile'}-{name}.png")
        context.close()

    # Even a privacy mode that refuses localStorage must keep temporary progress exportable.
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});")
    page = attach(context.new_page())
    page.goto(route("home"), wait_until="networkidle")
    ready(page)
    page.locator("#lollipop").click()
    page.locator("#lollipop").click()
    with page.expect_download() as download:
        page.locator("#exportSessionBtn").click()
    session_export = RESULTS / "blocked-session.json"
    download.value.save_as(session_export)
    session = json.loads(session_export.read_text())
    check(session["totalClicks"] == 2 and session["pirulitos"] == 4, "blocked storage still allows exporting earned in-memory progress before navigation")
    context.close()

    away_now = int(time.time() * 1000)
    context, page = open_game(browser, {"version":3,"pirulitos":0,"upgrades":{"maquina":1},"lastTick":away_now-120000,"savedAt":away_now-120000,"settings":{"music":False,"sfx":False}})
    check(page.locator("#toast").is_visible() and "Enquanto você explorava" in page.locator("#toast").inner_text(),
          "a genuine offline absence announces production earned while away")
    context.close()

    # Selective lease-write denial must never allow an unlocked persistent writer.
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("""if (!localStorage.getItem('lollipopSave'))
      localStorage.setItem('lollipopSave', JSON.stringify({version:3,pirulitos:10,totalEarned:10,upgrades:{}}));
      Object.defineProperty(navigator, 'locks', {value:undefined});
      const originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key,value) {
        if (key === 'lollipopSave.writer-v3') throw new DOMException('lease denied','QuotaExceededError');
        return originalSet.call(this,key,value);
      };""")
    page = attach(context.new_page())
    page.goto(route("home"), wait_until="networkidle")
    ready(page)
    raw_before = page.evaluate("localStorage.getItem('lollipopSave')")
    page.locator("#lollipop").click()
    expect(page.locator("#scoreDisplay")).to_have_text("12")
    check(page.locator("#exportSessionBtn").is_visible() and page.evaluate("localStorage.getItem('lollipopSave')") == raw_before,
          "failed lease reservation preserves the primary save and offers temporary-session export")
    other = attach(context.new_page())
    other.goto(route("home"), wait_until="networkidle")
    ready(other)
    other.locator("#lollipop").click()
    check(other.evaluate("localStorage.getItem('lollipopSave')") == raw_before,
          "competing memory-only tabs cannot persist without an ownership lease")
    context.close()

    # Exercise the compatibility path without Web Locks through actual documents.
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script("Object.defineProperty(navigator, 'locks', {value: undefined});")
    page = attach(context.new_page())
    page.goto(route("home"), wait_until="networkidle")
    ready(page)
    page.locator("#lollipop").click()
    navigate(page, "shop")
    check(saved(page)["totalClicks"] == 1, "lease fallback persists progress across normal document navigation")
    other = attach(context.new_page())
    other.goto(route("home"), wait_until="networkidle")
    ready(other, writable=False)
    other.wait_for_function("document.body.dataset.readonly === 'true'")
    check(other.locator("#lollipop").is_disabled(), "lease fallback keeps a competing tab read-only")
    page.close()
    other.reload(wait_until="networkidle")
    ready(other)
    check(other.locator("#lollipop").is_enabled() and saved(other)["totalClicks"] == 1, "lease ownership transfers after the active document closes")
    context.close()

    context, page = open_game(browser)
    page.evaluate("navigator.serviceWorker.ready.then(() => true)")
    page.reload(wait_until="networkidle")
    ready(page)
    context.set_offline(True)
    for name in ["shop", "collection", "arena", "home"]:
        navigate(page, name)
    page.locator("#lollipop").click()
    expect(page.locator("#scoreDisplay")).to_have_text("2")
    check(True, "installed multipage world, shop, collection and arena remain playable offline")
    context.close()
    browser.close()

check(not errors, "no uncaught JavaScript errors or broken asset responses: " + repr(errors))
print(f"Completed {checks} browser checks.")
