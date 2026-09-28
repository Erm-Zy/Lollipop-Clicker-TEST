// ============================================================
// LOLLIPOP CLICKER - SCRIPT COMPLETO E ATUALIZADO
// ============================================================

// ===== ESTADO INICIAL E SALVAMENTO =====
const defaultState = {
  pirulitos: 0,
  totalEarned: 0,
  totalClicks: 0,
  prestigeLevel: 0,
  activeFlavor: 'morango',

  // Compatibilidade com saves antigos.
  activeSkin: 'classic',

  // ===== SKINS INDEPENDENTES =====
  activeLollipopSkin: 'classic',
  activeTheme: 'classic',
  activeParticle: 'classic',

  upgrades: {
    maquina: 0,
    calda: 0,
    fabrica: 0,
    misturador: 0,
    embaladora: 0,
    laboratorio: 0,
    linha: 0,
    superfabrica: 0
  },
  unlockedFlavors: ['morango', 'limao', 'blueberry'],

  // Compatibilidade com saves antigos.
  unlockedSkins: ['classic'],

  // Cada categoria possui seus próprios desbloqueios.
  unlockedLollipopSkins: ['classic'],
  unlockedThemes: ['classic'],
  unlockedParticles: ['classic'],

  unlockedAchievements: [],
  bossesKilled: 0,
  wheelSpins: 0,
  lastWheelTime: 0,
  boostEndTime: 0,
  boostsObtained: 0,
  timePlayed: 0,
  maxScore: 0,
  maxPps: 0,
  settings: {
    music: true,
    sfx: true
  }
};

let gameState = JSON.parse(JSON.stringify(defaultState));

// ===== SHOP / UPGRADES =====
const UPGRADES_DATA = {
  maquina: { name: 'Máquina de Pirulitos', baseCost: 15, costMult: 1.15, basePps: 0.5, icon: '🍭', desc: '+0.5 pirulitos/s' },
  calda: { name: 'Calda Açucarada', baseCost: 100, costMult: 1.15, basePps: 4, icon: '🍯', desc: '+4.0 pirulitos/s' },
  fabrica: { name: 'Fábrica de Doces', baseCost: 1100, costMult: 1.15, basePps: 32, icon: '🏭', desc: '+32.0 pirulitos/s' },
  misturador: { name: 'Misturador de Sabores', baseCost: 12000, costMult: 1.15, basePps: 260, icon: '🥣', desc: '+260.0 pirulitos/s' },
  embaladora: { name: 'Embaladora Automática', baseCost: 130000, costMult: 1.15, basePps: 1400, icon: '📦', desc: '+1.4K pirulitos/s' },
  laboratorio: { name: 'Laboratório de Açúcar', baseCost: 1400000, costMult: 1.15, basePps: 7800, icon: '🧪', desc: '+7.8K pirulitos/s' },
  linha: { name: 'Linha de Produção', baseCost: 20000000, costMult: 1.15, basePps: 44000, icon: '⚙️', desc: '+44.0K pirulitos/s' },
  superfabrica: { name: 'Super Fábrica de Pirulitos', baseCost: 330000000, costMult: 1.15, basePps: 260000, icon: '🏰', desc: '+260.0K pirulitos/s' }
};

// ===== SABORES =====
const FLAVORS_DATA = {
  morango: { name: 'Morango', desc: 'Sabor equilibrado (+1 por clique)', icon: '🍓', cost: 0, isFree: true, clickBonus: 1, ppsMult: 1 },
  limao: { name: 'Limão', desc: 'Maior produção (+20% PPS)', icon: '🍋', cost: 0, isFree: true, clickBonus: 0, ppsMult: 1.20 },
  blueberry: { name: 'Blueberry', desc: 'Maior clique (+3 por clique & +10% PPS)', icon: '🫐', cost: 0, isFree: true, clickBonus: 3, ppsMult: 1.10 },
  uva: { name: 'Uva', desc: '+25% PPS Global', icon: '🍇', cost: 5000, isFree: false, clickBonus: 0, ppsMult: 1.25 },
  laranja: { name: 'Laranja', desc: '+5 por clique & +15% PPS', icon: '🍊', cost: 25000, isFree: false, clickBonus: 5, ppsMult: 1.15 },
  melancia: { name: 'Melancia', desc: '+40% PPS Global', icon: '🍉', cost: 150000, isFree: false, clickBonus: 0, ppsMult: 1.40 },
  abacaxi: { name: 'Abacaxi', desc: '+15 por clique extra', icon: '🍍', cost: 750000, isFree: false, clickBonus: 15, ppsMult: 1.10 },
  chocolate: { name: 'Chocolate', desc: '+60% PPS Global & +10 clique', icon: '🍫', cost: 5000000, isFree: false, clickBonus: 10, ppsMult: 1.60 },
  algodao: { name: 'Algodão-Doce', desc: '+100% PPS Global', icon: '🍬', cost: 30000000, isFree: false, clickBonus: 20, ppsMult: 2.00 },
  arcoiris: { name: 'Arco-Íris', desc: 'Super Multiplicador 2.5x PPS', icon: '🌈', cost: 200000000, isFree: false, clickBonus: 50, ppsMult: 2.50 },
  lendario: { name: 'Sabor Lendário', desc: 'Poder Supremo: 4.0x PPS & +100 por clique', icon: '⭐', cost: 1000000000, isFree: false, clickBonus: 100, ppsMult: 4.00 }
};

// ===== SKINS DO PIRULITO / TEMAS / PARTÍCULAS =====
const SKINS_DATA = {
  classic: { name: 'Clássico', emoji: '🍭', themeClass: 'theme-classic', glow: 'rgba(255, 64, 129, 0.4)', cost: 0, particleType: 'classic', color: '#ff4081' },
  neon: { name: 'Neon', emoji: '💖', themeClass: 'theme-neon', glow: 'rgba(0, 255, 234, 0.7)', cost: 2500, particleType: 'neon', color: '#00ffea' },
  rainbow: { name: 'Arco-Íris', emoji: '🌈', themeClass: 'theme-rainbow', glow: 'rgba(255, 235, 59, 0.7)', cost: 50000, particleType: 'rainbow', color: '#ffeb3b' },
  gold: { name: 'Dourado', emoji: '👑', themeClass: 'theme-gold', glow: 'rgba(255, 215, 0, 0.8)', cost: 500000, particleType: 'gold', color: '#ffd700' },
  cosmic: { name: 'Cósmico', emoji: '🌌', themeClass: 'theme-cosmic', glow: 'rgba(156, 39, 176, 0.8)', cost: 5000000, particleType: 'cosmic', color: '#ab47bc' },
  fire: { name: 'Fogo', emoji: '🔥', themeClass: 'theme-fire', glow: 'rgba(255, 87, 34, 0.8)', cost: 50000000, particleType: 'fire', color: '#ff5722' },
  ice: { name: 'Gelo', emoji: '🧊', themeClass: 'theme-ice', glow: 'rgba(33, 150, 243, 0.8)', cost: 500000000, particleType: 'ice', color: '#2196f3' }
};

// ===== CONQUISTAS =====
const ACHIEVEMENTS_DATA = [
  { id: 'c1', title: 'Primeiro Pirulito', desc: 'Faça 1 clique no pirulito', icon: '🍭', req: s => s.totalClicks >= 1 },
  { id: 'c100', title: 'Dedo Açucarado', desc: 'Alcance 100 cliques totais', icon: '👆', req: s => s.totalClicks >= 100 },
  { id: 'c1000', title: 'Maratona de Cliques', desc: 'Alcance 1.000 cliques totais', icon: '💥', req: s => s.totalClicks >= 1000 },
  { id: 'viciado', title: 'Viciado em Açúcar', desc: 'Acumule 10.000 pirulitos no total', icon: '🍯', req: s => s.totalEarned >= 10000 },
  { id: 'fabrica_doces', title: 'Fábrica de Doces', desc: 'Alcance 500 Pirulitos por segundo', icon: '🏭', req: s => getPps() >= 500 },
  { id: 'magnata', title: 'Magnata dos Pirulitos', desc: 'Alcance 1.000.000 Pirulitos por segundo', icon: '👑', req: s => getPps() >= 1000000 },
  { id: 'sabores_3', title: 'Provador de Doces', desc: 'Desbloqueie 4 sabores', icon: '🍓', req: s => s.unlockedFlavors.length >= 4 },
  { id: 'sabores_todos', title: 'Colecionador de Sabores', desc: 'Desbloqueie 8 sabores', icon: '🌈', req: s => s.unlockedFlavors.length >= 8 },
  { id: 'fashionista', title: 'Fashionista', desc: 'Desbloqueie 3 skins do pirulito', icon: '🎨', req: s => s.unlockedSkins.length >= 3 },
  { id: 'roleta_1', title: 'Sorte Grande', desc: 'Gire a roleta da sorte pela 1ª vez', icon: '🎰', req: s => s.wheelSpins >= 1 },
  { id: 'upgrades_10', title: 'Pequeno Investidor', desc: 'Compre 10 upgrades no total', icon: '⚙️', req: s => getTotalUpgradesCount() >= 10 },
  { id: 'boss_1', title: 'Caçador de Monstros', desc: 'Derrote o primeiro Chefão', icon: '⚔️', req: s => s.bossesKilled >= 1 },
  { id: 'tempo_10m', title: 'Açúcar no Sangue', desc: 'Jogue por pelo menos 10 minutos', icon: '⏱️', req: s => s.timePlayed >= 600 }
];

const AREAS_DATA = [
  { title: '🍭 Fábrica de Pirulitos', elementId: 'areaClicker' },
  { title: '⚔️ Arena de Bosses', elementId: 'areaBoss' },
  { title: '🚀 Nova Dimensão', elementId: 'areaSoon' }
];

let currentAreaIndex = 0;

// ===== SISTEMA DE ÁUDIO =====
const bgmAudio = new Audio('assets/audio/bgm1.ogg');
bgmAudio.loop = true;
bgmAudio.volume = 0.4;

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
}

function playSound(type) {
  if (!gameState.settings.sfx) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.08);

  } else if (type === 'buy') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);

  } else if (type === 'win') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.1);
    osc.frequency.setValueAtTime(659.25, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

function updateMusicState() {
  if (gameState.settings.music) {
    bgmAudio.play().catch(() => {});
  } else {
    bgmAudio.pause();
  }
}

window.addEventListener('click', () => {
  if (gameState.settings.music && bgmAudio.paused) {
    bgmAudio.play().catch(() => {});
  }
}, { once: false });

// ===== EFEITOS DE CANVAS / PARTÍCULAS =====
const canvas = document.getElementById('fxCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let particles = [];

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnParticle(x, y, text = null) {
  if (!ctx) return;

  const currentParticle =
    SKINS_DATA[gameState.activeParticle] || SKINS_DATA.classic;

  const count = text ? 1 : 5;

  for (let i = 0; i < count; i++) {
    let pColor = currentParticle.color;
    let pSymbol = null;

    if (currentParticle.particleType === 'rainbow') {
      pColor = `hsl(${Math.random() * 360}, 100%, 75%)`;
    } else if (currentParticle.particleType === 'gold') {
      pSymbol = '✨';
    } else if (currentParticle.particleType === 'cosmic') {
      pSymbol = '⭐';
    } else if (currentParticle.particleType === 'fire') {
      pSymbol = Math.random() > 0.5 ? '🔥' : '💥';
    } else if (currentParticle.particleType === 'ice') {
      pSymbol = '❄️';
    }

    particles.push({
      x: x || window.innerWidth / 2,
      y: y || window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.8) * 5,
      alpha: 1,
      size: Math.random() * 6 + 3,
      color: pColor,
      symbol: pSymbol,
      text: text
    });
  }
}

function updateParticles() {
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.025;

    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);

    if (p.text) {
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(p.text, p.x, p.y);

    } else if (p.symbol) {
      ctx.font = '16px sans-serif';
      ctx.fillText(p.symbol, p.x, p.y);

    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  requestAnimationFrame(updateParticles);
}

requestAnimationFrame(updateParticles);

// ===== FORMATADOR DE NÚMEROS =====
function formatNum(num) {
  if (num < 1000) return Math.floor(num).toString();

  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const i = Math.floor(Math.log10(num) / 3);

  if (i >= suffixes.length) {
    return num.toExponential(2);
  }

  const formatted =
    (num / Math.pow(10, i * 3)).toFixed(2);

  return `${formatted} ${suffixes[i]}`;
}

function getTotalUpgradesCount() {
  let count = 0;

  for (let key in gameState.upgrades) {
    count += gameState.upgrades[key] || 0;
  }

  return count;
}

// ===== CÁLCULOS PRINCIPAIS =====
function getClickPower() {
  let base = 1;

  const flavor =
    FLAVORS_DATA[gameState.activeFlavor] ||
    FLAVORS_DATA.morango;

  base += flavor.clickBonus;

  const prestigeMult =
    1 + (gameState.prestigeLevel * 0.15);

  const boostMult =
    Date.now() < gameState.boostEndTime ? 2 : 1;

  return base * prestigeMult * boostMult;
}

function getPps() {
  let ppsBase = 0;

  for (let key in UPGRADES_DATA) {
    const count = gameState.upgrades[key] || 0;

    ppsBase +=
      count * UPGRADES_DATA[key].basePps;
  }

  const flavor =
    FLAVORS_DATA[gameState.activeFlavor] ||
    FLAVORS_DATA.morango;

  ppsBase *= flavor.ppsMult;

  const prestigeMult =
    1 + (gameState.prestigeLevel * 0.15);

  const boostMult =
    Date.now() < gameState.boostEndTime ? 2 : 1;

  return ppsBase * prestigeMult * boostMult;
}

function getUpgradeCost(key) {
  const data = UPGRADES_DATA[key];
  const count = gameState.upgrades[key] || 0;

  return Math.floor(
    data.baseCost * Math.pow(data.costMult, count)
  );
}

// ===== ATUALIZAÇÃO DA UI =====
function updateUI() {
  document.getElementById('scoreDisplay').innerText =
    formatNum(gameState.pirulitos);

  document.getElementById('ppsDisplay').innerText =
    `${formatNum(getPps())} pirulitos / seg`;

  if (gameState.pirulitos > gameState.maxScore) {
    gameState.maxScore = gameState.pirulitos;
  }

  const currentPps = getPps();

  if (currentPps > gameState.maxPps) {
    gameState.maxPps = currentPps;
  }

  for (let key in UPGRADES_DATA) {
    const card =
      document.getElementById(`upg-${key}`);

    if (card) {
      const cost = getUpgradeCost(key);
      const count = gameState.upgrades[key] || 0;

      card.querySelector('.upgrade-sub').innerText =
        `Nível ${count} | ${UPGRADES_DATA[key].desc}`;

      card.querySelector('.upgrade-cost-tag').innerText =
        `${formatNum(cost)} 🍭`;

      if (gameState.pirulitos >= cost) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    }
  }

  document.getElementById('prestigeLevel').innerText =
    gameState.prestigeLevel;

  document.getElementById('prestigeBonus').innerText =
    `+${gameState.prestigeLevel * 15}%`;

  const potentialPrestige =
    Math.floor(
      Math.cbrt(gameState.totalEarned / 1000000)
    );

  document.getElementById('prestigeGainText').innerText =
    `+${potentialPrestige} Prestígio`;

  document.getElementById('statCurrent').innerText =
    formatNum(gameState.pirulitos);

  document.getElementById('statTotalEarned').innerText =
    formatNum(gameState.totalEarned);

  document.getElementById('statPps').innerText =
    formatNum(getPps());

  document.getElementById('statClickPower').innerText =
    formatNum(getClickPower());

  document.getElementById('statTotalClicks').innerText =
    formatNum(gameState.totalClicks);

  document.getElementById('statTimePlayed').innerText =
    `${Math.floor(gameState.timePlayed)}s`;

  document.getElementById('statWheelSpins').innerText =
    gameState.wheelSpins;

  document.getElementById('statBoostsObtained').innerText =
    gameState.boostsObtained;

  document.getElementById('statFlavorsUnlocked').innerText =
    gameState.unlockedFlavors.length;

  const totalAppearanceUnlocks =
    gameState.unlockedLollipopSkins.length +
    gameState.unlockedThemes.length +
    gameState.unlockedParticles.length -
    2;

  document.getElementById('statSkinsUnlocked').innerText =
    totalAppearanceUnlocks;

  document.getElementById('statUpgradesBought').innerText =
    getTotalUpgradesCount();

  document.getElementById('statMaxScore').innerText =
    formatNum(gameState.maxScore);

  document.getElementById('statMaxPps').innerText =
    formatNum(gameState.maxPps);

  const adBtn =
    document.getElementById('adBoostBtn');

  if (adBtn) {
    if (Date.now() < gameState.boostEndTime) {
      const remainingSecs =
        Math.ceil(
          (gameState.boostEndTime - Date.now()) / 1000
        );

      adBtn.innerText =
        `⚡ Boost ativo: ${remainingSecs}s`;

      adBtn.classList.add('active-boost');

    } else {
      adBtn.innerText =
        '📺 Assistir Anúncio (2x Pirulitos por 30s)';

      adBtn.classList.remove('active-boost');
    }
  }

  checkAchievements();
  updateWheelTimerUI();
}

// ===== RENDERIZAÇÃO DE SHOP, SABORES E SKINS =====
function renderUpgrades() {
  const container =
    document.getElementById('upgradesList');

  if (!container) return;

  container.innerHTML = '';

  for (let key in UPGRADES_DATA) {
    const data = UPGRADES_DATA[key];

    const card =
      document.createElement('div');

    card.id = `upg-${key}`;
    card.className = 'upgrade-card';

    card.innerHTML = `
      <div class="upgrade-icon">${data.icon}</div>

      <div class="upgrade-info">
        <div class="upgrade-name">${data.name}</div>
        <div class="upgrade-sub">
          Nível 0 | ${data.desc}
        </div>
      </div>

      <div class="upgrade-action">
        <div class="upgrade-cost-tag">
          ${formatNum(data.baseCost)} 🍭
        </div>
        <button class="buy-upgrade-btn">
          Comprar
        </button>
      </div>
    `;

    const button =
      card.querySelector('.buy-upgrade-btn');

    button.addEventListener('click', () => {
      buyUpgrade(key);
    });

    container.appendChild(card);
  }
}

function buyUpgrade(key) {
  const cost = getUpgradeCost(key);

  if (gameState.pirulitos < cost) {
    return;
  }

  gameState.pirulitos -= cost;
  gameState.upgrades[key]++;

  playSound('buy');

  saveGame();
  updateUI();
}

function renderFlavors() {
  const freeContainer =
    document.getElementById('freeFlavorGrid');

  const premiumContainer =
    document.getElementById('premiumFlavorGrid');

  if (freeContainer) {
    freeContainer.innerHTML = '';
  }

  if (premiumContainer) {
    premiumContainer.innerHTML = '';
  }

  for (const key in FLAVORS_DATA) {
    const data = FLAVORS_DATA[key];

    const unlocked =
      gameState.unlockedFlavors.includes(key);

    const active =
      gameState.activeFlavor === key;

    const card =
      document.createElement('div');

    card.className =
      `flavor-card ${active ? 'active' : ''} ${!unlocked ? 'locked' : ''}`;

    card.innerHTML = `
      <div class="flavor-icon">${data.icon}</div>
      <div class="flavor-name">${data.name}</div>
      <div class="flavor-desc">${data.desc}</div>
      <div class="flavor-cost">
        ${
          unlocked
            ? active
              ? '★ Equipado'
              : 'Usar'
            : `${formatNum(data.cost)} 🍭`
        }
      </div>
    `;

    card.addEventListener('click', () => {
      selectFlavor(key);
    });

    if (data.isFree) {
      if (freeContainer) {
        freeContainer.appendChild(card);
      }
    } else {
      if (premiumContainer) {
        premiumContainer.appendChild(card);
      }
    }
  }
}

function selectFlavor(key) {
  const data = FLAVORS_DATA[key];

  if (!data) return;

  if (!gameState.unlockedFlavors.includes(key)) {
    if (gameState.pirulitos < data.cost) {
      return;
    }

    gameState.pirulitos -= data.cost;
    gameState.unlockedFlavors.push(key);

    playSound('buy');
  }

  gameState.activeFlavor = key;

  playSound('click');

  saveGame();
  renderFlavors();
  updateUI();
}

// ===== SKINS INDEPENDENTES =====
const APPEARANCE_CATEGORIES = {
  lollipop: {
    gridId: 'lollipopSkinGrid',
    unlockedKey: 'unlockedLollipopSkins',
    activeKey: 'activeLollipopSkin',
    title: 'Pirulito'
  },

  theme: {
    gridId: 'themeGrid',
    unlockedKey: 'unlockedThemes',
    activeKey: 'activeTheme',
    title: 'Fundo'
  },

  particle: {
    gridId: 'particleGrid',
    unlockedKey: 'unlockedParticles',
    activeKey: 'activeParticle',
    title: 'Partículas'
  }
};

function renderAppearanceCategory(categoryKey) {
  const config =
    APPEARANCE_CATEGORIES[categoryKey];

  const grid =
    document.getElementById(config.gridId);

  if (!grid) return;

  grid.innerHTML = '';

  const unlockedList =
    gameState[config.unlockedKey] || [];

  const activeKey =
    gameState[config.activeKey];

  for (const key in SKINS_DATA) {
    const data = SKINS_DATA[key];

    const unlocked =
      unlockedList.includes(key);

    const active =
      activeKey === key;

    const card =
      document.createElement('div');

    card.className =
      `skin-card ${active ? 'active' : ''} ${!unlocked ? 'disabled' : ''}`;

    card.innerHTML = `
      <div class="skin-icon">${data.emoji}</div>
      <div class="skin-name">${data.name}</div>

      <div class="${unlocked ? 'skin-status' : 'skin-cost'}">
        ${
          active
            ? '★ Equipado'
            : unlocked
              ? 'Usar'
              : formatNum(data.cost) + ' 🍭'
        }
      </div>
    `;

    card.addEventListener('click', () => {
      selectAppearance(categoryKey, key);
    });

    grid.appendChild(card);
  }
}

function renderSkins() {
  renderAppearanceCategory('lollipop');
  renderAppearanceCategory('theme');
  renderAppearanceCategory('particle');
}

function selectAppearance(categoryKey, key) {
  const config =
    APPEARANCE_CATEGORIES[categoryKey];

  const data =
    SKINS_DATA[key];

  if (!data) return;

  const unlockedList =
    gameState[config.unlockedKey];

  if (!unlockedList.includes(key)) {
    if (gameState.pirulitos < data.cost) {
      return;
    }

    gameState.pirulitos -= data.cost;
    unlockedList.push(key);

    gameState[config.activeKey] = key;

    playSound('buy');

  } else {
    gameState[config.activeKey] = key;

    playSound('click');
  }

  // Mantém compatibilidade com o save antigo.
  if (!gameState.unlockedSkins.includes(key)) {
    gameState.unlockedSkins.push(key);
  }

  applyAppearance();

  saveGame();
  renderSkins();
  updateUI();
}

function applyAppearance() {
  const lollipopEl =
    document.getElementById('lollipop');

  const glowEl =
    document.getElementById('lollipopGlow');

  const lollipopSkin =
    SKINS_DATA[gameState.activeLollipopSkin] ||
    SKINS_DATA.classic;

  const theme =
    SKINS_DATA[gameState.activeTheme] ||
    SKINS_DATA.classic;

  // ===== FUNDO =====
  document.body.className = '';
  document.body.classList.add(theme.themeClass);

  // ===== PIRULITO =====
  if (lollipopEl) {
    lollipopEl.innerText =
      lollipopSkin.emoji;
  }

  // ===== BRILHO DO PIRULITO =====
  if (glowEl) {
    glowEl.style.background =
      `radial-gradient(circle, ${lollipopSkin.glow} 0%, rgba(0,0,0,0) 70%)`;
  }
}

// Compatibilidade com chamadas antigas.
function applySkinToMainLollipop() {
  applyAppearance();
}
    if (targetPane) {
      targetPane.classList.add('active');
    }

    playSound('click');
  });
});

// ===== ROLETA =====
const wheelCanvas = document.getElementById('wheelCanvas');
const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;

const wheelRewards = [
  {
    label: '5% Pirulitos',
    type: 'percent',
    value: 0.05,
    color: '#ff4081'
  },
  {
    label: '15% Pirulitos',
    type: 'percent',
    value: 0.15,
    color: '#7c4dff'
  },
  {
    label: '2x Boost (30s)',
    type: 'boost',
    value: 30,
    color: '#00bcd4'
  },
  {
    label: '30% Pirulitos',
    type: 'percent',
    value: 0.30,
    color: '#4caf50'
  },
  {
    label: 'Raro (+Clique)',
    type: 'click',
    value: 10,
    color: '#ff9800'
  },
  {
    label: '50% Pirulitos',
    type: 'percent',
    value: 0.50,
    color: '#e91e63'
  }
];

let wheelAngle = 0;
let wheelSpinning = false;

function drawWheel(angleOffset = 0) {
  if (!wheelCtx) return;

  const numSlices = wheelRewards.length;
  const arc = (Math.PI * 2) / numSlices;

  wheelCtx.clearRect(0, 0, 220, 220);

  for (let i = 0; i < numSlices; i++) {
    const angle = angleOffset + i * arc;

    // ===== FATIA =====
    wheelCtx.beginPath();
    wheelCtx.fillStyle = wheelRewards[i].color;
    wheelCtx.moveTo(110, 110);
    wheelCtx.arc(
      110,
      110,
      100,
      angle,
      angle + arc
    );
    wheelCtx.lineTo(110, 110);
    wheelCtx.fill();

    wheelCtx.strokeStyle = 'rgba(255,255,255,0.25)';
    wheelCtx.lineWidth = 1;
    wheelCtx.stroke();

    // ===== TEXTO DA FATIA =====
    wheelCtx.save();

    wheelCtx.fillStyle = '#fff';
    wheelCtx.font = 'bold 9px sans-serif';
    wheelCtx.textAlign = 'center';
    wheelCtx.textBaseline = 'middle';

    const textAngle = angle + arc / 2;

    wheelCtx.translate(
      110 + Math.cos(textAngle) * 62,
      110 + Math.sin(textAngle) * 62
    );

    wheelCtx.rotate(
      textAngle + Math.PI / 2
    );

    const label = wheelRewards[i].label;
    const words = label.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine =
        currentLine.length > 0
          ? `${currentLine} ${word}`
          : word;

      if (
        wheelCtx.measureText(testLine).width > 48 &&
        currentLine.length > 0
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const visibleLines = lines.slice(0, 2);

    visibleLines.forEach((line, lineIndex) => {
      const y =
        (lineIndex - (visibleLines.length - 1) / 2) * 11;

      wheelCtx.fillText(line, 0, y);
    });

    wheelCtx.restore();
  }

  // ===== CENTRO DA ROLETA =====
  wheelCtx.beginPath();
  wheelCtx.fillStyle = '#fff';
  wheelCtx.arc(110, 110, 14, 0, Math.PI * 2);
  wheelCtx.fill();

  wheelCtx.beginPath();
  wheelCtx.fillStyle = '#ff4081';
  wheelCtx.arc(110, 110, 7, 0, Math.PI * 2);
  wheelCtx.fill();
}

function getWheelCooldown() {
  const cooldown = 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - gameState.lastWheelTime;

  return Math.max(0, cooldown - elapsed);
}

function updateWheelTimerUI() {
  const timerEl =
    document.getElementById('wheelTimer');

  const spinBtn =
    document.getElementById('spinBtn');

  if (!timerEl || !spinBtn) return;

  const remaining = getWheelCooldown();

  if (remaining <= 0) {
    timerEl.innerText =
      'Disponível para girar!';

    spinBtn.disabled = false;

    return;
  }

  spinBtn.disabled = true;

  const totalSeconds =
    Math.ceil(remaining / 1000);

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor((totalSeconds % 3600) / 60);

  const seconds =
    totalSeconds % 60;

  timerEl.innerText =
    `Próximo giro: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function applyWheelReward(reward) {
  if (reward.type === 'percent') {
    const amount =
      Math.max(
        1,
        Math.floor(
          gameState.pirulitos * reward.value
        )
      );

    gameState.pirulitos += amount;
    gameState.totalEarned += amount;

    alert(
      `🎉 Você ganhou ${formatNum(amount)} pirulitos!`
    );

  } else if (reward.type === 'boost') {
    gameState.boostEndTime =
      Date.now() + (reward.value * 1000);

    gameState.boostsObtained += 1;

    alert(
      `⚡ Boost 2x ativado por ${reward.value} segundos!`
    );

  } else if (reward.type === 'click') {
    const flavor =
      FLAVORS_DATA[gameState.activeFlavor] ||
      FLAVORS_DATA.morango;

    flavor.clickBonus += reward.value;

    alert(
      `🍭 Seu clique recebeu +${reward.value} permanentemente!`
    );
  }

  playSound('win');
}

function spinWheel() {
  if (wheelSpinning) return;

  if (getWheelCooldown() > 0) {
    return;
  }

  wheelSpinning = true;

  const spinBtn =
    document.getElementById('spinBtn');

  if (spinBtn) {
    spinBtn.disabled = true;
  }

  gameState.lastWheelTime = Date.now();
  gameState.wheelSpins += 1;

  const rewardIndex =
    Math.floor(
      Math.random() * wheelRewards.length
    );

  const numSlices =
    wheelRewards.length;

  const arc =
    (Math.PI * 2) / numSlices;

  // Faz a recompensa sorteada parar no topo.
  const targetAngle =
    -(rewardIndex * arc + arc / 2);

  const currentNormalized =
    wheelAngle % (Math.PI * 2);

  let delta =
    targetAngle - currentNormalized;

  while (delta < 0) {
    delta += Math.PI * 2;
  }

  const extraRotations =
    5 + Math.floor(Math.random() * 3);

  const finalAngle =
    wheelAngle +
    delta +
    extraRotations * Math.PI * 2;

  const startAngle = wheelAngle;
  const duration = 3500;
  const startTime = performance.now();

  function animateWheel(now) {
    const elapsed =
      now - startTime;

    const progress =
      Math.min(1, elapsed / duration);

    // Ease-out cúbico.
    const eased =
      1 - Math.pow(1 - progress, 3);

    wheelAngle =
      startAngle +
      (finalAngle - startAngle) * eased;

    drawWheel(wheelAngle);

    if (progress < 1) {
      requestAnimationFrame(animateWheel);
    } else {
      wheelAngle = finalAngle;
      drawWheel(wheelAngle);

      wheelSpinning = false;

      applyWheelReward(
        wheelRewards[rewardIndex]
      );

      saveGame();
      updateUI();
    }
  }

  requestAnimationFrame(animateWheel);
}

if (wheelCanvas) {
  drawWheel(0);
}

const spinBtn =
  document.getElementById('spinBtn');

if (spinBtn) {
  spinBtn.addEventListener(
    'click',
    spinWheel
  );
}

// ===== ANÚNCIOS / GOOGLE ADS =====
const adBoostBtn =
  document.getElementById('adBoostBtn');

if (adBoostBtn) {
  adBoostBtn.addEventListener(
    'click',
    () => {
      // O anúncio ainda é MOCK.
      // A integração real do Google Ads fica preservada
      // para quando o ID definitivo estiver disponível.

      if (Date.now() < gameState.boostEndTime) {
        return;
      }

      const watched =
        confirm(
          '📺 ANÚNCIO DE TESTE\n\n' +
          'Este é um anúncio simulado.\n' +
          'Para fins de teste, vamos considerar que você assistiu ao anúncio.\n\n' +
          'Clique em OK para receber o boost 2x por 30 segundos.'
        );

      if (!watched) {
        return;
      }

      // IMPORTANTE:
      // O usuário NÃO precisa esperar 30 segundos.
      // O boost é concedido imediatamente.
      gameState.boostEndTime =
        Date.now() + (30 * 1000);

      gameState.boostsObtained += 1;

      playSound('win');

      alert(
        '⚡ Anúncio concluído!\n\n' +
        'Boost 2x ativado por 30 segundos.'
      );

      saveGame();
      updateUI();
    }
  );
}

// ===== PRESTÍGIO =====
const prestigeBtn =
  document.getElementById('prestigeBtn');

if (prestigeBtn) {
  prestigeBtn.addEventListener(
    'click',
    () => {
      const potentialPrestige =
        Math.floor(
          Math.cbrt(
            gameState.totalEarned / 1000000
          )
        );

      if (potentialPrestige <= 0) {
        alert(
          'Você precisa produzir pelo menos 1.000.000 de pirulitos no total para obter Prestígio.'
        );

        return;
      }

      const confirmed =
        confirm(
          `Você ganhará ${potentialPrestige} de Prestígio.\n\n` +
          'Isso resetará seus pirulitos e upgrades.\n\n' +
          'Continuar?'
        );

      if (!confirmed) return;

      gameState.prestigeLevel +=
        potentialPrestige;

      gameState.pirulitos = 0;

      for (const key in gameState.upgrades) {
        gameState.upgrades[key] = 0;
      }

      playSound('win');

      saveGame();
      renderUpgrades();
      updateUI();

      alert(
        `👑 Prestígio realizado!\n\n` +
        `Você recebeu +${potentialPrestige} Prestígio.`
      );
    }
  );
}

// ===== CONFIGURAÇÕES =====
const toggleMusicBtn =
  document.getElementById('toggleMusicBtn');

const toggleSfxBtn =
  document.getElementById('toggleSfxBtn');

if (toggleMusicBtn) {
  toggleMusicBtn.addEventListener(
    'click',
    () => {
      gameState.settings.music =
        !gameState.settings.music;

      toggleMusicBtn.innerText =
        gameState.settings.music
          ? 'ON'
          : 'OFF';

      updateMusicState();

      saveGame();
    }
  );
}

if (toggleSfxBtn) {
  toggleSfxBtn.addEventListener(
    'click',
    () => {
      gameState.settings.sfx =
        !gameState.settings.sfx;

      toggleSfxBtn.innerText =
        gameState.settings.sfx
          ? 'ON'
          : 'OFF';

      if (gameState.settings.sfx) {
        playSound('click');
      }

      saveGame();
    }
  );
}

// ===== SALVAMENTO =====
function saveGame() {
  try {
    localStorage.setItem(
      'lollipopSave',
      JSON.stringify(gameState)
    );
  } catch (e) {
    console.error(
      'Erro ao salvar o jogo:',
      e
    );
  }
}

// ===== CARREGAMENTO E MIGRAÇÃO DE SAVE =====
function loadGame() {
  const saved =
    localStorage.getItem(
      'lollipopSave'
    );

  if (saved) {
    try {
      const parsed =
        JSON.parse(saved);

      gameState =
        Object.assign(
          {},
          defaultState,
          parsed
        );

      if (parsed.settings) {
        gameState.settings =
          Object.assign(
            {},
            defaultState.settings,
            parsed.settings
          );
      }

      if (parsed.upgrades) {
        gameState.upgrades =
          Object.assign(
            {},
            defaultState.upgrades,
            parsed.upgrades
          );
      }

      // ===== MIGRAÇÃO DO SISTEMA ANTIGO DE SKINS =====
      const legacyActiveSkin =
        parsed.activeSkin ||
        'classic';

      const legacyUnlockedSkins =
        Array.isArray(
          parsed.unlockedSkins
        )
          ? parsed.unlockedSkins
          : ['classic'];

      if (
        !Array.isArray(
          parsed.unlockedLollipopSkins
        )
      ) {
        gameState.unlockedLollipopSkins =
          [...legacyUnlockedSkins];
      }

      if (
        !Array.isArray(
          parsed.unlockedThemes
        )
      ) {
        gameState.unlockedThemes =
          [...legacyUnlockedSkins];
      }

      if (
        !Array.isArray(
          parsed.unlockedParticles
        )
      ) {
        gameState.unlockedParticles =
          [...legacyUnlockedSkins];
      }

      if (!parsed.activeLollipopSkin) {
        gameState.activeLollipopSkin =
          legacyActiveSkin;
      }

      if (!parsed.activeTheme) {
        gameState.activeTheme =
          legacyActiveSkin;
      }

      if (!parsed.activeParticle) {
        gameState.activeParticle =
          legacyActiveSkin;
      }

      // Garante que o Clássico sempre exista.
      if (
        !gameState.unlockedLollipopSkins.includes(
          'classic'
        )
      ) {
        gameState.unlockedLollipopSkins.push(
          'classic'
        );
      }

      if (
        !gameState.unlockedThemes.includes(
          'classic'
        )
      ) {
        gameState.unlockedThemes.push(
          'classic'
        );
      }

      if (
        !gameState.unlockedParticles.includes(
          'classic'
        )
      ) {
        gameState.unlockedParticles.push(
          'classic'
        );
      }

      // Mantém compatibilidade com o sistema antigo.
      gameState.activeSkin =
        gameState.activeLollipopSkin;

      gameState.unlockedSkins = [
        ...new Set([
          ...gameState.unlockedSkins,
          ...gameState.unlockedLollipopSkins,
          ...gameState.unlockedThemes,
          ...gameState.unlockedParticles
        ])
      ];

    } catch (e) {
      console.error(
        'Erro ao carregar save:',
        e
      );
    }
  }

  if (toggleMusicBtn) {
    toggleMusicBtn.innerText =
      gameState.settings.music
        ? 'ON'
        : 'OFF';
  }

  if (toggleSfxBtn) {
    toggleSfxBtn.innerText =
      gameState.settings.sfx
        ? 'ON'
        : 'OFF';
  }

  updateMusicState();
  applyAppearance();

  renderUpgrades();
  renderFlavors();
  renderSkins();
  renderAchievements();

  updateUI();
}

// ===== PRODUÇÃO AUTOMÁTICA =====
let lastProductionTime =
  Date.now();

function productionTick() {
  const now =
    Date.now();

  const elapsed =
    (now - lastProductionTime) / 1000;

  lastProductionTime =
    now;

  // Evita ganhos gigantes caso a aba fique suspensa.
  const safeElapsed =
    Math.min(elapsed, 5);

  const pps =
    getPps();

  const produced =
    pps * safeElapsed;

  if (produced > 0) {
    gameState.pirulitos +=
      produced;

    gameState.totalEarned +=
      produced;
  }

  gameState.timePlayed +=
    safeElapsed;

  updateUI();
}

setInterval(
  productionTick,
  1000
);

// ===== RESETAR PROGRESSO =====
const resetDataBtn =
  document.getElementById('resetDataBtn');

if (resetDataBtn) {
  resetDataBtn.addEventListener(
    'click',
    () => {
      const confirmed =
        confirm(
          '⚠️ ATENÇÃO!\n\n' +
          'Isso apagará todo o seu progresso.\n\n' +
          'Esta ação não pode ser desfeita.\n\n' +
          'Tem certeza?'
        );

      if (!confirmed) return;

      localStorage.removeItem(
        'lollipopSave'
      );

      gameState =
        JSON.parse(
          JSON.stringify(
            defaultState
          )
        );

      applyAppearance();
      renderUpgrades();
      renderFlavors();
      renderSkins();
      renderAchievements();

      updateUI();

      alert(
        '🔄 Progresso resetado com sucesso!'
      );
    }
  );
}

// ===== INICIALIZAÇÃO =====
loadGame();
updateAreaView();
updateWheelTimerUI();

// Salva automaticamente a cada 10 segundos.
setInterval(
  saveGame,
  10000
);

// Salva ao sair da página.
window.addEventListener(
  'beforeunload',
  saveGame
);
    if (targetPane) targetPane.classList.add('active');
    playSound('click');
  });
});

// ===== ROLETA =====
const wheelCanvas = document.getElementById('wheelCanvas');
const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
const spinBtn = document.getElementById('spinBtn');
const wheelTimerEl = document.getElementById('wheelTimer');

const WHEEL_COOLDOWN_MS = 5 * 60 * 1000;
let isSpinning = false;

const wheelRewards = [
  { label: '5% Pirulitos', type: 'pct', val: 0.05, color: '#ff4081' },
  { label: '15% Pirulitos', type: 'pct', val: 0.15, color: '#ab47bc' },
  { label: '2x Boost (30s)', type: 'boost', val: 30, color: '#42a5f5' },
  { label: '30% Pirulitos', type: 'pct', val: 0.30, color: '#26a69a' },
  { label: 'Raro (+Clique)', type: 'click', val: 100, color: '#ffca28' },
  { label: '50% Pirulitos', type: 'pct', val: 0.50, color: '#ff7043' }
];

function drawWheel(angleOffset = 0) {
  if (!wheelCtx) return;

  const numSlices = wheelRewards.length;
  const arc = (Math.PI * 2) / numSlices;

  wheelCtx.clearRect(0, 0, 220, 220);

  for (let i = 0; i < numSlices; i++) {
    const angle = angleOffset + i * arc;

    wheelCtx.beginPath();
    wheelCtx.fillStyle = wheelRewards[i].color;
    wheelCtx.moveTo(110, 110);
    wheelCtx.arc(110, 110, 100, angle, angle + arc);
    wheelCtx.lineTo(110, 110);
    wheelCtx.fill();

    wheelCtx.save();
    wheelCtx.fillStyle = '#fff';
    wheelCtx.font = 'bold 9px sans-serif';
    wheelCtx.textAlign = 'center';
    wheelCtx.textBaseline = 'middle';

    const textAngle = angle + arc / 2;

    wheelCtx.translate(
      110 + Math.cos(textAngle) * 62,
      110 + Math.sin(textAngle) * 62
    );

    wheelCtx.rotate(textAngle + Math.PI / 2);

    const labelText = wheelRewards[i].label;
    const words = labelText.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine =
        currentLine.length > 0
          ? `${currentLine} ${word}`
          : word;

      if (
        wheelCtx.measureText(testLine).width > 48 &&
        currentLine.length > 0
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    const visibleLines = lines.slice(0, 2);

    visibleLines.forEach((line, lineIndex) => {
      const y =
        (lineIndex - (visibleLines.length - 1) / 2) * 11;

      wheelCtx.fillText(line, 0, y);
    });

    wheelCtx.restore();
  }
}

drawWheel(0);

if (spinBtn) {
  spinBtn.addEventListener('click', () => {
    const now = Date.now();
    if (isSpinning) return;
    if (now - gameState.lastWheelTime < WHEEL_COOLDOWN_MS) {
      alert('A roleta ainda está em cooldown! Aguarde o tempo acabar.');
      return;
    }

    isSpinning = true;
    spinBtn.disabled = true;

    const prizeIndex = Math.floor(Math.random() * wheelRewards.length);
    const numSlices = wheelRewards.length;
    const arc = (Math.PI * 2) / numSlices;

    let currentRot = 0;
    let speed = 0.35;

    const spinInterval = setInterval(() => {
      currentRot += speed;
      speed *= 0.982;
      drawWheel(currentRot);

      if (speed <= 0.005) {
        clearInterval(spinInterval);
        isSpinning = false;
        gameState.lastWheelTime = Date.now();
        gameState.wheelSpins += 1;

        const reward = wheelRewards[prizeIndex];
        let prizeText = '';

        if (reward.type === 'pct') {
          const amount = Math.max(100, Math.floor(gameState.pirulitos * reward.val));
          gameState.pirulitos += amount;
          gameState.totalEarned += amount;
          prizeText = `+${formatNum(amount)} Pirulitos!`;
        } else if (reward.type === 'boost') {
          gameState.boostEndTime = Date.now() + (reward.val * 1000);
          gameState.boostsObtained += 1;
          prizeText = 'Bônus 2x de Produção por 30 segundos ativado!';
        } else if (reward.type === 'click') {
          const amount = Math.max(500, Math.floor((getPps() + 1) * 20));
          gameState.pirulitos += amount;
          gameState.totalEarned += amount;
          prizeText = `Prêmio Raro! +${formatNum(amount)} Pirulitos!`;
        }

        playSound('win');
        alert(`🎰 A roleta parou em: ${reward.label}\n\nRecompensa: ${prizeText}`);
        updateUI();
      }
    }, 16);
  });
}

function updateWheelTimerUI() {
  if (!wheelTimerEl || !spinBtn) return;
  const now = Date.now();
  const elapsed = now - gameState.lastWheelTime;

  if (elapsed < WHEEL_COOLDOWN_MS) {
    const remaining = Math.ceil((WHEEL_COOLDOWN_MS - elapsed) / 1000);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    wheelTimerEl.innerText = `Próximo giro em: ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    spinBtn.disabled = true;
    spinBtn.classList.add('disabled');
  } else {
    wheelTimerEl.innerText = 'Disponível para girar agora!';
    if (!isSpinning) {
      spinBtn.disabled = false;
      spinBtn.classList.remove('disabled');
    }
  }
}

// ===== ANÚNCIOS / GOOGLE ADS =====
const adBoostBtn = document.getElementById('adBoostBtn');
if (adBoostBtn) {
  adBoostBtn.addEventListener('click', () => {
    alert("📺 Anúncio de teste concluído!\nVocê recebeu um boost de 2x por 30 segundos.");
    gameState.boostEndTime = Date.now() + (30 * 1000);
    gameState.boostsObtained += 1;
    playSound('win');
    updateUI();
  });
}

try {
  (adsbygoogle = window.adsbygoogle || []).push({});
} catch (e) {}

// ===== PRESTÍGIO =====
const prestigeBtn = document.getElementById('prestigeBtn');
if (prestigeBtn) {
  prestigeBtn.addEventListener('click', () => {
    const potentialPrestige = Math.floor(Math.cbrt(gameState.totalEarned / 1000000));
    if (potentialPrestige <= 0) {
      alert('Você precisa acumular pelo menos 1.000.000 de pirulitos no histórico para fazer prestígio!');
      return;
    }

    if (confirm(`Tem certeza que deseja reiniciar para ganhar +${potentialPrestige} Níveis de Prestígio?`)) {
      gameState.prestigeLevel += potentialPrestige;
      gameState.pirulitos = 0;
      for (let key in gameState.upgrades) gameState.upgrades[key] = 0;
      playSound('win');
      updateUI();
    }
  });
}

// ===== CONFIGURAÇÕES =====
const toggleMusicBtn = document.getElementById('toggleMusicBtn');
const toggleSfxBtn = document.getElementById('toggleSfxBtn');
const resetDataBtn = document.getElementById('resetDataBtn');

if (toggleMusicBtn) {
  toggleMusicBtn.addEventListener('click', () => {
    gameState.settings.music = !gameState.settings.music;
    toggleMusicBtn.innerText = gameState.settings.music ? 'ON' : 'OFF';
    updateMusicState();
  });
}

if (toggleSfxBtn) {
  toggleSfxBtn.addEventListener('click', () => {
    gameState.settings.sfx = !gameState.settings.sfx;
    toggleSfxBtn.innerText = gameState.settings.sfx ? 'ON' : 'OFF';
  });
}

if (resetDataBtn) {
  resetDataBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja resetar todo o progresso? Essa ação não pode ser desfeita.')) {
      if (confirm('CONFIRMAÇÃO FINAL: Apagar todos os pirulitos, conquistas e upgrades?')) {
        localStorage.removeItem('lollipopSave');
        gameState = JSON.parse(JSON.stringify(defaultState));
        applySkinToMainLollipop();
        renderUpgrades();
        renderFlavors();
        renderSkins();
        renderAchievements();
        updateUI();
        alert('Jogo resetado com sucesso!');
      }
    }
  });
}

// ===== LOOP E SALVAMENTO =====
setInterval(() => {
  const pps = getPps();
  if (pps > 0) {
    const gainPerTick = pps / 10;
    gameState.pirulitos += gainPerTick;
    gameState.totalEarned += gainPerTick;
  }
  gameState.timePlayed += 0.1;
  updateUI();
}, 100);

setInterval(() => {
  localStorage.setItem('lollipopSave', JSON.stringify(gameState));
}, 5000);

function loadGame() {
  const saved = localStorage.getItem('lollipopSave');

  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      gameState = Object.assign({}, defaultState, parsed);

      if (parsed.settings) {
        gameState.settings = Object.assign(
          {},
          defaultState.settings,
          parsed.settings
        );
      }

      if (parsed.upgrades) {
        gameState.upgrades = Object.assign(
          {},
          defaultState.upgrades,
          parsed.upgrades
        );
      }

      // ===== MIGRAÇÃO DE SAVES ANTIGOS =====
      const legacyActiveSkin = parsed.activeSkin || 'classic';

      const legacyUnlockedSkins =
        Array.isArray(parsed.unlockedSkins)
          ? parsed.unlockedSkins
          : ['classic'];

      if (!Array.isArray(parsed.unlockedLollipopSkins)) {
        gameState.unlockedLollipopSkins = [...legacyUnlockedSkins];
      }

      if (!Array.isArray(parsed.unlockedThemes)) {
        gameState.unlockedThemes = [...legacyUnlockedSkins];
      }

      if (!Array.isArray(parsed.unlockedParticles)) {
        gameState.unlockedParticles = [...legacyUnlockedSkins];
      }

      if (!parsed.activeLollipopSkin) {
        gameState.activeLollipopSkin = legacyActiveSkin;
      }

      if (!parsed.activeTheme) {
        gameState.activeTheme = legacyActiveSkin;
      }

      if (!parsed.activeParticle) {
        gameState.activeParticle = legacyActiveSkin;
      }

      if (!gameState.unlockedLollipopSkins.includes('classic')) {
        gameState.unlockedLollipopSkins.push('classic');
      }

      if (!gameState.unlockedThemes.includes('classic')) {
        gameState.unlockedThemes.push('classic');
      }

      if (!gameState.unlockedParticles.includes('classic')) {
        gameState.unlockedParticles.push('classic');
      }

      // Compatibilidade com o formato antigo.
      gameState.activeSkin = gameState.activeLollipopSkin;
      gameState.unlockedSkins = [
        ...new Set([
          ...gameState.unlockedSkins,
          ...gameState.unlockedLollipopSkins,
          ...gameState.unlockedThemes,
          ...gameState.unlockedParticles
        ])
      ];
    } catch (e) {
      console.error('Erro ao carregar save', e);
    }
  }

  if (toggleMusicBtn) {
    toggleMusicBtn.innerText =
      gameState.settings.music ? 'ON' : 'OFF';
  }

  if (toggleSfxBtn) {
    toggleSfxBtn.innerText =
      gameState.settings.sfx ? 'ON' : 'OFF';
  }

  updateMusicState();
  applyAppearance();
  renderUpgrades();
  renderFlavors();
  renderSkins();
  renderAchievements();
  updateUI();
}

loadGame();
