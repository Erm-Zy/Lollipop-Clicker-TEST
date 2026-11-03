import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  SKINS_DATA,
  ACHIEVEMENTS_DATA,
  WHEEL_REWARDS,
  WHEEL_COOLDOWN_MS,
} from "./data.js";
import * as game from "./gameplay.js";
import { loadGame, saveGame, validateState } from "./storage.js";
import { createAudio } from "./audio.js";
import { createEffects } from "./effects.js";

let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error("Armazenamento indisponível");
    },
    setItem() {
      throw new Error("Armazenamento indisponível");
    },
  };
}
const loaded = loadGame(storage, Date.now());
let state = loaded.state;
let canSave = loaded.canSave;
let locked = false;
let currentTab = "upgrades";
let currentArea = "clicker";
let category = "skin";
let toastTimeout;
let wheelFrame;
let observedWheelReward = state.lastWheelReward?.at || 0;
let dirtyCollection = true;
let achievementSignature = "";
const $ = (id) => document.getElementById(id);
const text = (id, value) => {
  const el = $(id);
  if (el && el.textContent !== String(value)) el.textContent = value;
};
const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
});
function format(value) {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return numberFormat.format(value);
  const units = ["", "mil", "mi", "bi", "tri", "qua", "qui"];
  const i = Math.floor(Math.log10(value) / 3);
  return i < units.length
    ? `${numberFormat.format(value / 1000 ** i)} ${units[i]}`
    : value.toExponential(2);
}
function duration(ms) {
  const secs = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}
function toast(message) {
  text("toast", message);
  $("toast").hidden = false;
  $("toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $("toast").classList.remove("visible"), 4800);
}
const audio = createAudio(() => state.settings);
const effects = createEffects($("fxCanvas"), () => state);
function persist() {
  if (locked) return false;
  if (!canSave) {
    text("saveStatus", "Save protegido • exporte seu progresso");
    return false;
  }
  const result = saveGame(storage, state);
  text(
    "saveStatus",
    result.ok
      ? "Progresso salvo neste navegador"
      : "Falha ao salvar • exporte seu progresso",
  );
  return result.ok;
}
function afterAction(sound = "buy") {
  dirtyCollection = true;
  audio.play(sound);
  update();
  persist();
}
function applyAppearance() {
  document.body.dataset.theme = state.activeTheme;
  const classic = state.activeSkin === "classic";
  $("lollipopArt").hidden = !classic;
  $("skinEmoji").hidden = classic;
  text("skinEmoji", SKINS_DATA[state.activeSkin].emoji);
  $("lollipop").style.setProperty(
    "--candy-color",
    SKINS_DATA[state.activeSkin].color,
  );
  text(
    "flavorSummary",
    `${FLAVORS_DATA[state.activeFlavor].icon} ${FLAVORS_DATA[state.activeFlavor].name}`,
  );
  text("flavorBonus", FLAVORS_DATA[state.activeFlavor].desc);
}
function setupShop() {
  $("upgradesList").innerHTML = Object.entries(UPGRADES_DATA)
    .map(
      ([key, data]) => `
    <button type="button" class="upgrade-card" id="upg-${key}" data-upgrade="${key}">
      <span class="upgrade-icon">${data.icon}</span>
      <span class="upgrade-details"><span class="upgrade-title">${data.name}</span><span class="upgrade-sub"></span></span>
      <span class="upgrade-cost-tag"></span>
    </button>`,
    )
    .join("");
  $("upgradesList").addEventListener("click", (e) => {
    const key = e.target.closest("[data-upgrade]")?.dataset.upgrade;
    if (key && game.buyUpgrade(state, key, Date.now())) afterAction();
  });
}
function updateShop(now) {
  for (const [key, data] of Object.entries(UPGRADES_DATA)) {
    const card = $(`upg-${key}`);
    const cost = game.getUpgradeCost(state, key);
    const sub = `Nível ${state.upgrades[key]} · +${format(data.basePps)} /s base`;
    if (card.querySelector(".upgrade-sub").textContent !== sub)
      card.querySelector(".upgrade-sub").textContent = sub;
    const label = `${format(cost)} 🍭`;
    if (card.querySelector(".upgrade-cost-tag").textContent !== label)
      card.querySelector(".upgrade-cost-tag").textContent = label;
    card.disabled = !Number.isFinite(cost) || state.pirulitos < cost;
  }
}
function collectionCard(key, data, unlocked, active, kind) {
  return `<button type="button" class="collection-card ${kind}-card ${active ? "active" : ""}" data-${kind}="${key}" aria-pressed="${active}" ${!unlocked && state.pirulitos < data.cost ? "disabled" : ""}>
    <span class="collection-icon">${data.icon || data.emoji}</span><span class="collection-name">${data.name}</span>
    ${data.desc ? `<span class="collection-desc">${data.desc}</span>` : ""}
    <span class="collection-status">${active ? "✓ Equipado" : unlocked ? "Selecionar" : `${format(data.cost)} 🍭`}</span></button>`;
}
function renderFlavors() {
  for (const [id, free] of [
    ["freeFlavorGrid", true],
    ["premiumFlavorGrid", false],
  ]) {
    $(id).innerHTML = Object.entries(FLAVORS_DATA)
      .filter(([, d]) => d.isFree === free)
      .map(([key, data]) =>
        collectionCard(
          key,
          data,
          state.unlockedFlavors.includes(key),
          state.activeFlavor === key,
          "flavor",
        ),
      )
      .join("");
  }
}
function renderSkins() {
  const field = {
    skin: "activeSkin",
    theme: "activeTheme",
    particles: "activeParticles",
  }[category];
  $("skinGrid").innerHTML = Object.entries(SKINS_DATA)
    .map(([key, data]) =>
      collectionCard(
        key,
        data,
        state.unlockedSkins.includes(key),
        state[field] === key,
        "skin",
      ),
    )
    .join("");
}
function renderAchievements() {
  $("achievementsList").innerHTML = ACHIEVEMENTS_DATA.map((ach) => {
    const unlocked = state.unlockedAchievements.includes(ach.id);
    return `<div class="achievement-card ${unlocked ? "unlocked" : ""}"><span class="achievement-icon">${ach.icon}</span><div class="achievement-details"><div class="achievement-title">${ach.title}</div><div class="achievement-sub">${ach.desc}</div></div><span class="achievement-status" aria-label="${unlocked ? "Desbloqueada" : "Bloqueada"}">${unlocked ? "✓" : "○"}</span></div>`;
  }).join("");
}
function update(now = Date.now()) {
  if (locked) return;
  if (
    state.lastWheelReward &&
    state.lastWheelReward.at !== observedWheelReward
  ) {
    observedWheelReward = state.lastWheelReward.at;
    cancelAnimationFrame(wheelFrame);
    drawWheel(wheelAngle(state.lastWheelReward.index));
    const reward = state.lastWheelReward;
    const message =
      reward.type === "pct"
        ? `+${format(reward.amount)} pirulitos!`
        : reward.label;
    text("wheelResult", `Você ganhou: ${message}`);
    $("wheelResult").hidden = false;
    toast(`🎁 Você ganhou: ${message}`);
    audio.play("win");
    persist();
  }
  const pps = game.getPps(state, now);
  text("scoreDisplay", format(state.pirulitos));
  text("ppsDisplay", `${format(pps)} / seg`);
  text("clickPowerDisplay", `+${format(game.getClickPower(state, now))}`);
  text(
    "totalEarnedDisplay",
    `${format(state.totalEarned)} pirulitos produzidos no total`,
  );
  text(
    "prestigeSummary",
    `Nível ${state.prestigeLevel} · +${format(state.prestigeLevel * 15)}%`,
  );
  const boostLeft = state.boostEndTime - now;
  text(
    "boostStatus",
    boostLeft > 0
      ? `⚡ Produção e cliques 2× · ${duration(boostLeft)}`
      : "Cada clique deixa o mundo mais doce.",
  );
  const oldAchievements = state.unlockedAchievements.length;
  game.checkAchievements(state, now);
  if (state.unlockedAchievements.length > oldAchievements) {
    const latest = ACHIEVEMENTS_DATA.find(
      (a) => a.id === state.unlockedAchievements.at(-1),
    );
    toast(`🏆 Conquista desbloqueada: ${latest.title}`);
    audio.play("win");
  }
  const signature = state.unlockedAchievements.join(",");
  if (signature !== achievementSignature) {
    achievementSignature = signature;
    renderAchievements();
  }
  const next = ACHIEVEMENTS_DATA.find(
    (a) => !state.unlockedAchievements.includes(a.id),
  );
  text(
    "nextAchievement",
    next ? `${next.icon} ${next.title}` : "🏆 Coleção completa!",
  );
  text(
    "achievementCount",
    `${state.unlockedAchievements.length} / ${ACHIEVEMENTS_DATA.length}`,
  );
  text(
    "achievementProgress",
    `${state.unlockedAchievements.length} de ${ACHIEVEMENTS_DATA.length} conquistas`,
  );
  if (currentTab === "upgrades") updateShop(now);
  if (currentTab === "flavors" || currentTab === "skins") {
    // Affordability changes without rebuilding focused buttons on every frame.
    if (dirtyCollection) {
      currentTab === "flavors" ? renderFlavors() : renderSkins();
      dirtyCollection = false;
    }
    document
      .querySelectorAll(
        `#tab-${currentTab} [data-${currentTab === "flavors" ? "flavor" : "skin"}]`,
      )
      .forEach((card) => {
        const flavor = currentTab === "flavors";
        const key = card.dataset[flavor ? "flavor" : "skin"];
        const data = (flavor ? FLAVORS_DATA : SKINS_DATA)[key];
        card.disabled =
          !(flavor ? state.unlockedFlavors : state.unlockedSkins).includes(
            key,
          ) && state.pirulitos < data.cost;
      });
  }
  const wheelLeft = state.lastWheelTime
    ? Math.max(0, state.lastWheelTime + WHEEL_COOLDOWN_MS - now)
    : 0;
  $("spinBtn").disabled = !!state.pendingWheel || wheelLeft > 0 || !canSave;
  text(
    "wheelTimer",
    state.pendingWheel
      ? "Girando… prêmio reservado com segurança"
      : wheelLeft
        ? `Próximo giro em ${duration(wheelLeft)}`
        : "Um giro grátis disponível!",
  );
  text("wheelStatus", wheelLeft > 0 ? duration(wheelLeft) : "Giro grátis");
  const boostCooldown = state.lastBoostTime
    ? Math.max(0, state.lastBoostTime + WHEEL_COOLDOWN_MS - now)
    : 0;
  $("adBoostBtn").disabled = boostLeft > 0 || boostCooldown > 0;
  text(
    "boostTitle",
    boostLeft > 0 ? "Sua fábrica está turbinada!" : "Uma dose extra de açúcar",
  );
  text(
    "boostDescription",
    boostLeft > 0
      ? `Produção e cliques 2× · ${duration(boostLeft)}`
      : boostCooldown > 0
        ? `Recarga: ${duration(boostCooldown)}`
        : "Bônus grátis: 2× por 30s · recarga de 5 min",
  );
  text(
    "boostAction",
    boostLeft > 0 ? "ATIVO ⚡" : boostCooldown > 0 ? "EM RECARGA" : "ATIVAR ↗",
  );
  if (currentTab === "prestige") {
    const gain = game.getPrestigeGain(state);
    text("prestigeLevel", state.prestigeLevel);
    text("prestigeBonus", `+${format(state.prestigeLevel * 15)}%`);
    text("prestigeGainText", `+${format(gain)} Prestígio`);
    $("prestigeBtn").disabled = gain <= 0 || !!state.pendingWheel;
  }
  if (currentTab === "stats") {
    const values = {
      statCurrent: format(state.pirulitos),
      statTotalEarned: format(state.totalEarned),
      statPps: format(pps),
      statClickPower: format(game.getClickPower(state, now)),
      statTotalClicks: format(state.totalClicks),
      statTimePlayed: duration(state.timePlayed * 1000),
      statWheelSpins: state.wheelSpins,
      statBoostsObtained: state.boostsObtained,
      statFlavorsUnlocked: `${state.unlockedFlavors.length} / 11`,
      statSkinsUnlocked: `${state.unlockedSkins.length} / 7`,
      statUpgradesBought: game.getTotalUpgradesCount(state),
      statMaxScore: format(state.maxScore),
      statMaxPps: format(state.maxPps),
      statBossesKilled: state.bossesKilled,
    };
    for (const [id, value] of Object.entries(values)) text(id, value);
  }
  if (currentArea === "boss") updateBoss(now);
}

function selectTab(tab, focus = false) {
  const headings = {
    upgrades: [
      "Melhorias da fábrica",
      "Pequenos investimentos. Doces resultados.",
    ],
    flavors: [
      "Coleção de sabores",
      "Encontre a receita perfeita para sua fábrica.",
    ],
    skins: [
      "Seu mundo, do seu jeito",
      "Pirulito, fundo e partículas. Misture suas escolhas.",
    ],
    roulette: [
      "Roleta da sorte",
      "Seis prêmios. Uma nova chance a cada 5 minutos.",
    ],
    prestige: [
      "Um legado de açúcar",
      "Recomece com um bônus que fica para sempre.",
    ],
    achievements: [
      "Sua coleção de conquistas",
      "Cada pequeno passo merece ser celebrado.",
    ],
    stats: [
      "Sua fábrica em números",
      "Do primeiro clique ao seu próximo grande marco.",
    ],
    settings: ["Configurações", "Ajuste os detalhes e cuide do seu progresso."],
  };
  if (!headings[tab] || locked) return;
  currentTab = tab;
  text("panelTitle", headings[tab][0]);
  text("panelDescription", headings[tab][1]);
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active);
    btn.tabIndex = active ? 0 : -1;
  });
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    const active = pane.id === `tab-${tab}`;
    pane.classList.toggle("active", active);
    pane.hidden = !active;
  });
  dirtyCollection = true;
  update();
  if (focus) document.querySelector(`.tab-btn[data-tab="${tab}"]`).focus();
}
function selectArea(area) {
  currentArea = area;
  for (const [key, id] of [
    ["clicker", "areaClicker"],
    ["boss", "areaBoss"],
    ["soon", "areaSoon"],
  ]) {
    $(id).hidden = key !== area;
    $(id).classList.toggle("hidden", key !== area);
  }
  document.querySelectorAll(".area-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.area === area);
    btn.setAttribute("aria-pressed", btn.dataset.area === area);
  });
  update();
}
function updateSettings() {
  for (const [id, key] of [
    ["toggleMusicBtn", "music"],
    ["toggleSfxBtn", "sfx"],
    ["toggleParticlesBtn", "particles"],
  ]) {
    text(id, state.settings[key] ? "Ligado" : "Desligado");
    $(id).setAttribute("aria-pressed", state.settings[key]);
  }
  audio.sync();
}

// The angle and the reward use the same slice index. The pointer is at 12 o'clock.
function wheelAngle(index) {
  return -Math.PI / 2 - ((index + 0.5) * Math.PI * 2) / WHEEL_REWARDS.length;
}
function drawWheel(rotation = 0) {
  const canvas = $("wheelCanvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = canvas.width,
    middle = size / 2,
    radius = middle - 8;
  ctx.clearRect(0, 0, size, size);
  WHEEL_REWARDS.forEach((reward, i) => {
    const arc = (Math.PI * 2) / WHEEL_REWARDS.length;
    const start = rotation + i * arc;
    ctx.beginPath();
    ctx.moveTo(middle, middle);
    ctx.arc(middle, middle, radius, start, start + arc);
    ctx.closePath();
    ctx.fillStyle = reward.color;
    ctx.fill();
    ctx.strokeStyle = "#24152f";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.translate(middle, middle);
    ctx.rotate(start + arc / 2);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(reward.short, radius - 24, 4);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(middle, middle, 22, 0, Math.PI * 2);
  ctx.fillStyle = "#21172d";
  ctx.fill();
  ctx.font = "22px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("🍭", middle, middle + 8);
}
function animateWheel() {
  cancelAnimationFrame(wheelFrame);
  const pending = state.pendingWheel;
  if (
    !pending ||
    document.hidden ||
    locked ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  function frame() {
    if (!state.pendingWheel || document.hidden || locked) return;
    const now = Date.now();
    const progress = Math.min(
      1,
      (now - pending.startedAt) / (pending.endsAt - pending.startedAt),
    );
    const target = Math.PI * 12 + wheelAngle(pending.index);
    drawWheel(target * (1 - (1 - progress) ** 4));
    if (progress < 1) wheelFrame = requestAnimationFrame(frame);
  }
  wheelFrame = requestAnimationFrame(frame);
}
function updateBoss(now) {
  const boss = state.boss;
  const active = !!boss;
  const max = active ? boss.maxHp : game.getBossMaxHp(state);
  const hp = active ? boss.hp : max;
  text("bossName", `Monstro Doce · Nível ${state.bossesKilled + 1}`);
  text("bossHpText", `${format(hp)} / ${format(max)} HP`);
  $("bossHpBar").style.width = `${Math.max(0, (hp / max) * 100)}%`;
  $("bossHpBar").parentElement.setAttribute(
    "aria-valuenow",
    Math.ceil((hp / max) * 100),
  );
  text(
    "bossTimer",
    active
      ? `Tempo restante: ${duration(boss.endsAt - now)}`
      : "30 segundos para vencer",
  );
  text("bossReward", `Recompensa: ${format(Math.floor(max * 15))} 🍭`);
  $("startBossBtn").disabled = active;
  $("bossAvatar").disabled = !active;
  $("bossAvatar").classList.toggle("fighting", active);
}

setupShop();
renderAchievements();
applyAppearance();
updateSettings();
drawWheel(state.lastWheelReward ? wheelAngle(state.lastWheelReward.index) : 0);
if (state.lastWheelReward) {
  text(
    "wheelResult",
    `Último prêmio: ${state.lastWheelReward.type === "pct" ? `+${format(state.lastWheelReward.amount)} pirulitos` : state.lastWheelReward.label}`,
  );
  $("wheelResult").hidden = false;
}
selectArea("clicker");
selectTab("upgrades");
if (state.pendingWheel) animateWheel();
persist();
if (loaded.warnings.length) toast(loaded.warnings.join(" "));
else if (loaded.offlineEarned > 0)
  toast(
    `Bem-vindo de volta! Sua fábrica produziu ${format(loaded.offlineEarned)} pirulitos offline.`,
  );

$("lollipop").addEventListener("click", (e) => {
  const amount = game.click(state, Date.now());
  const rect = e.currentTarget.getBoundingClientRect();
  effects.spawn(
    e.detail ? e.clientX : rect.x + rect.width / 2,
    e.detail ? e.clientY : rect.y + rect.height / 2,
    `+${format(amount)}`,
  );
  audio.play("click");
  update();
});
for (const id of ["freeFlavorGrid", "premiumFlavorGrid"])
  $(id).addEventListener("click", (e) => {
    const key = e.target.closest("[data-flavor]")?.dataset.flavor;
    if (key && game.selectFlavor(state, key, Date.now())) {
      applyAppearance();
      afterAction();
    }
  });
$("skinGrid").addEventListener("click", (e) => {
  const key = e.target.closest("[data-skin]")?.dataset.skin;
  if (key && game.selectCustomization(state, category, key, Date.now())) {
    applyAppearance();
    afterAction();
  }
});
document.querySelectorAll(".category-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    category = btn.dataset.category;
    document.querySelectorAll(".category-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    });
    dirtyCollection = true;
    update();
  }),
);
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectTab(btn.dataset.tab);
    if (innerWidth <= 760)
      document
        .querySelector(".shop-panel")
        .scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
  });
  btn.addEventListener("keydown", (e) => {
    const buttons = [...document.querySelectorAll(".tab-btn")];
    let index = buttons.indexOf(btn);
    if (["ArrowDown", "ArrowRight"].includes(e.key))
      index = (index + 1) % buttons.length;
    else if (["ArrowUp", "ArrowLeft"].includes(e.key))
      index = (index + buttons.length - 1) % buttons.length;
    else if (e.key === "Home") index = 0;
    else if (e.key === "End") index = buttons.length - 1;
    else return;
    e.preventDefault();
    selectTab(buttons[index].dataset.tab, true);
  });
});
document
  .querySelectorAll(".area-btn")
  .forEach((btn) =>
    btn.addEventListener("click", () => selectArea(btn.dataset.area)),
  );
document.querySelectorAll("[data-open-tab]").forEach((btn) =>
  btn.addEventListener("click", () => {
    selectTab(btn.dataset.openTab);
    $("panelTitle").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }),
);
$("adBoostBtn").addEventListener("click", () => {
  if (game.startBoost(state, Date.now())) {
    toast("Bônus grátis ativado! Produção e cliques 2× por 30 segundos.");
    afterAction("win");
  }
});
$("spinBtn").addEventListener("click", () => {
  if (!canSave) return toast("Exporte ou recupere seu save antes de girar.");
  // Persist the sampled outcome before the animation, so refresh cannot reroll it.
  const before = structuredClone(state);
  if (game.startWheel(state, Date.now())) {
    if (!persist()) {
      state = before;
      toast(
        "Não foi possível reservar o giro. Libere armazenamento ou exporte seu save.",
      );
      update();
      return;
    }
    text("wheelResult", "");
    $("wheelResult").hidden = true;
    update();
    animateWheel();
    audio.play("buy");
  }
});
$("startBossBtn").addEventListener("click", () => {
  if (game.startBoss(state, Date.now())) afterAction("click");
});
$("bossAvatar").addEventListener("click", (e) => {
  const result = game.hitBoss(state, Date.now());
  if (!result) {
    update();
    return;
  }
  effects.spawn(e.clientX, e.clientY, `−${format(result.damage)}`);
  if (result.won) {
    toast(`⚔️ Vitória! +${format(result.reward)} pirulitos.`);
    afterAction("win");
  } else {
    audio.play("click");
    update();
  }
});
$("prestigeBtn").addEventListener("click", () => {
  const gain = game.getPrestigeGain(state);
  if (
    gain > 0 &&
    confirm(
      `Ganhar +${gain} de prestígio? Seu saldo, upgrades e bônus temporários serão reiniciados. Sua coleção, conquistas e estatísticas serão mantidas.`,
    )
  ) {
    if (game.prestige(state, Date.now())) {
      toast(
        `👑 Novo prestígio! Bônus permanente de +${format(state.prestigeLevel * 15)}%.`,
      );
      afterAction("win");
    }
  }
});
for (const [id, key] of [
  ["toggleMusicBtn", "music"],
  ["toggleSfxBtn", "sfx"],
  ["toggleParticlesBtn", "particles"],
])
  $(id).addEventListener("click", () => {
    state.settings[key] = !state.settings[key];
    updateSettings();
    if (!state.settings.particles) effects.clear();
    persist();
  });
$("exportSaveBtn").addEventListener("click", () => {
  let contents = JSON.stringify(state, null, 2);
  if (!canSave) {
    try {
      contents = storage.getItem("lollipopSave") || contents;
    } catch {
      /* Export the in-memory progress if storage is blocked. */
    }
  }
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `lollipop-${canSave ? "save" : "recovery-raw"}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup exportado. Guarde o arquivo em um lugar seguro.");
});
$("importSaveBtn").addEventListener("click", () =>
  $("importSaveInput").click(),
);
$("importSaveInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error("Arquivo muito grande.");
    const parsed = JSON.parse(await file.text());
    if (
      !parsed ||
      Array.isArray(parsed) ||
      typeof parsed !== "object" ||
      !("pirulitos" in parsed) ||
      !("upgrades" in parsed)
    )
      throw new Error("Formato de save inválido.");
    const validated = validateState(parsed, Date.now());
    if (
      !confirm(
        "Substituir seu progresso pelo arquivo importado? Um backup do save atual será guardado neste navegador.",
      )
    )
      return;
    const raw = storage.getItem("lollipopSave");
    if (raw !== null)
      storage.setItem(`lollipopSave.backup.import.${Date.now()}`, raw);
    const result = saveGame(storage, validated, { force: true });
    if (!result.ok) throw new Error(result.error);
    state = validated;
    canSave = true;
    observedWheelReward = state.lastWheelReward?.at || 0;
    dirtyCollection = true;
    applyAppearance();
    updateSettings();
    tick();
    persist();
    cancelAnimationFrame(wheelFrame);
    drawWheel();
    if (state.pendingWheel) animateWheel();
    toast("Save importado com sucesso.");
  } catch (error) {
    toast(`Não foi possível importar: ${error.message}`);
  } finally {
    e.target.value = "";
  }
});
$("restoreBackupBtn").addEventListener("click", () => {
  let candidate;
  try {
    for (const key of ["lollipopSave.backup", "lollipopSave.legacy-v1"]) {
      const raw = storage.getItem(key);
      if (raw === null) continue;
      try {
        candidate = validateState(JSON.parse(raw), Date.now());
        break;
      } catch {
        /* Try the preserved legacy backup next. */
      }
    }
    if (!candidate)
      return toast(
        "Nenhum backup local válido foi encontrado. Importe um arquivo exportado.",
      );
    if (
      !confirm(
        "Restaurar o backup local? O save atual será preservado separadamente antes da substituição.",
      )
    )
      return;
    game.advance(candidate, Date.now(), { offline: true });
    const result = saveGame(storage, candidate, { force: true });
    if (!result.ok) throw new Error(result.error);
    state = candidate;
    canSave = true;
    observedWheelReward = state.lastWheelReward?.at || 0;
    cancelAnimationFrame(wheelFrame);
    drawWheel();
    if (state.pendingWheel) animateWheel();
    dirtyCollection = true;
    applyAppearance();
    updateSettings();
    update();
    persist();
    toast("Backup restaurado. O salvamento automático está ativo novamente.");
  } catch (error) {
    toast(`Não foi possível restaurar: ${error.message}`);
  }
});
$("resetDataBtn").addEventListener("click", () => {
  if (
    !confirm("Apagar todo o progresso? Exporte um backup antes de continuar.")
  )
    return;
  if (
    !confirm(
      "Confirmação final: zerar pirulitos, coleção, prestígio e conquistas?",
    )
  )
    return;
  try {
    const raw = storage.getItem("lollipopSave");
    if (raw !== null)
      storage.setItem(`lollipopSave.backup.reset.${Date.now()}`, raw);
  } catch {
    toast(
      "Não foi possível guardar um backup. Exporte seu save antes de tentar novamente.",
    );
    return;
  }
  const fresh = game.createState(Date.now());
  const result = saveGame(storage, fresh, { force: true });
  if (!result.ok) {
    toast(result.error);
    return;
  }
  state = fresh;
  canSave = true;
  observedWheelReward = 0;
  cancelAnimationFrame(wheelFrame);
  effects.clear();
  dirtyCollection = true;
  applyAppearance();
  updateSettings();
  drawWheel();
  update();
  persist();
  toast("Progresso reiniciado.");
});

let lastSave = Date.now();
function tick({ offline = false } = {}) {
  if (locked) return;
  const now = Date.now();
  const bossWasActive = !!state.boss;
  game.advance(state, now, { offline });
  if (bossWasActive && !state.boss)
    toast("O tempo acabou. O Monstro Doce escapou! Tente novamente.");
  update(now);
  if (now - lastSave >= 5000) {
    persist();
    lastSave = now;
  }
}
const timer = setInterval(() => {
  if (!document.hidden) tick();
}, 200);
document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
document.addEventListener("keydown", () => audio.unlock(), { once: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    tick();
    persist();
    effects.clear();
    cancelAnimationFrame(wheelFrame);
    audio.suspend(true);
  } else {
    tick({ offline: true });
    audio.suspend(locked);
    if (state.pendingWheel) animateWheel();
  }
});
window.addEventListener("pagehide", () => {
  tick();
  persist();
  audio.suspend(true);
});
window.addEventListener("pageshow", () => {
  tick({ offline: true });
  audio.suspend(document.hidden || locked);
});
window.addEventListener("storage", (e) => {
  if (e.key === "lollipopSave" && e.newValue !== JSON.stringify(state)) {
    // One writer prevents duplicate wheel/boss rewards or stale tabs replacing progress.
    canSave = false;
    clearInterval(timer);
    selectTab("settings");
    locked = true;
    effects.clear();
    audio.suspend(true);
    cancelAnimationFrame(wheelFrame);
    document.querySelectorAll("button").forEach((btn) => {
      if (!["exportSaveBtn"].includes(btn.id)) btn.disabled = true;
    });
    toast(
      "O save mudou em outra aba. Recarregue esta página para continuar com o progresso mais recente.",
    );
    text("saveStatus", "Outra aba está ativa • recarregue esta página");
  }
});
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    /* Game remains playable without offline install. */
  });
}
