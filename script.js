// ============================================================
// LOLLIPOP CLICKER - SCRIPT COMPLETO E ATUALIZADO
// ============================================================

// --- ESTADO INICIAL E SALVAMENTO ---
const defaultState = {
  pirulitos: 0,
  totalEarned: 0,
  totalClicks: 0,
  prestigeLevel: 0,
  activeFlavor: 'morango',
  activeSkin: 'classic',
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
  unlockedSkins: ['classic'],
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

// --- 1. SHOP & UPGRADES ---
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

// --- 2. SABORES ---
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

// --- 3. SKINS DO PIRULITO (3 COMPONENTES: FUNDO + PIRULITO + PARTÍCULAS) ---
const SKINS_DATA = {
  classic: { name: 'Clássico', emoji: '🍭', themeClass: 'theme-classic', glow: 'rgba(255, 64, 129, 0.4)', cost: 0, particleType: 'classic', color: '#ff4081' },
  neon: { name: 'Neon', emoji: '💖', themeClass: 'theme-neon', glow: 'rgba(0, 255, 234, 0.7)', cost: 2500, particleType: 'neon', color: '#00ffea' },
  rainbow: { name: 'Arco-Íris', emoji: '🌈', themeClass: 'theme-rainbow', glow: 'rgba(255, 235, 59, 0.7)', cost: 50000, particleType: 'rainbow', color: '#ffeb3b' },
  gold: { name: 'Dourado', emoji: '👑', themeClass: 'theme-gold', glow: 'rgba(255, 215, 0, 0.8)', cost: 500000, particleType: 'gold', color: '#ffd700' },
  cosmic: { name: 'Cósmico', emoji: '🌌', themeClass: 'theme-cosmic', glow: 'rgba(156, 39, 176, 0.8)', cost: 5000000, particleType: 'cosmic', color: '#ab47bc' },
  fire: { name: 'Fogo', emoji: '🔥', themeClass: 'theme-fire', glow: 'rgba(255, 87, 34, 0.8)', cost: 50000000, particleType: 'fire', color: '#ff5722' },
  ice: { name: 'Gelo', emoji: '🧊', themeClass: 'theme-ice', glow: 'rgba(33, 150, 243, 0.8)', cost: 500000000, particleType: 'ice', color: '#2196f3' }
};

// --- 4. CONQUISTAS ---
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

// --- SISTEMA DE ÁUDIO (Música bgm1.ogg e Efeitos Sonoros) ---
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

// --- EFEITOS DE CANVAS & PARTÍCULAS CUSTOMIZADAS ---
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
  const currentSkin = SKINS_DATA[gameState.activeSkin] || SKINS_DATA.classic;
  const count = text ? 1 : 5;
  
  for (let i = 0; i < count; i++) {
    let pColor = currentSkin.color;
    let pSymbol = null;

    if (currentSkin.particleType === 'rainbow') {
      pColor = `hsl(${Math.random() * 360}, 100%, 75%)`;
    } else if (currentSkin.particleType === 'gold') {
      pSymbol = '✨';
    } else if (currentSkin.particleType === 'cosmic') {
      pSymbol = '⭐';
    } else if (currentSkin.particleType === 'fire') {
      pSymbol = Math.random() > 0.5 ? '🔥' : '💥';
    } else if (currentSkin.particleType === 'ice') {
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

// --- FORMATADOR DE NÚMEROS ---
function formatNum(num) {
  if (num < 1000) return Math.floor(num).toString();
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
  const i = Math.floor(Math.log10(num) / 3);
  if (i >= suffixes.length) return num.toExponential(2);
  const formatted = (num / Math.pow(10, i * 3)).toFixed(2);
  return `${formatted} ${suffixes[i]}`;
}

function getTotalUpgradesCount() {
  let count = 0;
  for (let key in gameState.upgrades) {
    count += gameState.upgrades[key] || 0;
  }
  return count;
}

// --- CÁLCULOS PRINCIPAIS ---
function getClickPower() {
  let base = 1;
  const flavor = FLAVORS_DATA[gameState.activeFlavor] || FLAVORS_DATA.morango;
  base += flavor.clickBonus;

  const prestigeMult = 1 + (gameState.prestigeLevel * 0.15);
  const boostMult = Date.now() < gameState.boostEndTime ? 2 : 1;

  return base * prestigeMult * boostMult;
}

function getPps() {
  let ppsBase = 0;
  for (let key in UPGRADES_DATA) {
    const count = gameState.upgrades[key] || 0;
    ppsBase += count * UPGRADES_DATA[key].basePps;
  }

  const flavor = FLAVORS_DATA[gameState.activeFlavor] || FLAVORS_DATA.morango;
  ppsBase *= flavor.ppsMult;

  const prestigeMult = 1 + (gameState.prestigeLevel * 0.15);
  const boostMult = Date.now() < gameState.boostEndTime ? 2 : 1;

  return ppsBase * prestigeMult * boostMult;
}

function getUpgradeCost(key) {
  const data = UPGRADES_DATA[key];
  const count = gameState.upgrades[key] || 0;
  return Math.floor(data.baseCost * Math.pow(data.costMult, count));
}
// --- ATUALIZAÇÃO DA UI ---
function updateUI() {
  document.getElementById('scoreDisplay').innerText = formatNum(gameState.pirulitos);
  document.getElementById('ppsDisplay').innerText = `${formatNum(getPps())} pirulitos / seg`;

  if (gameState.pirulitos > gameState.maxScore) gameState.maxScore = gameState.pirulitos;
  const currentPps = getPps();
  if (currentPps > gameState.maxPps) gameState.maxPps = currentPps;

  for (let key in UPGRADES_DATA) {
    const card = document.getElementById(`upg-${key}`);
    if (card) {
      const cost = getUpgradeCost(key);
      const count = gameState.upgrades[key] || 0;
      card.querySelector('.upgrade-sub').innerText = `Nível ${count} | ${UPGRADES_DATA[key].desc}`;
      card.querySelector('.upgrade-cost-tag').innerText = `${formatNum(cost)} 🍭`;
      if (gameState.pirulitos >= cost) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    }
  }

  document.getElementById('prestigeLevel').innerText = gameState.prestigeLevel;
  document.getElementById('prestigeBonus').innerText = `+${gameState.prestigeLevel * 15}%`;
  const potentialPrestige = Math.floor(Math.cbrt(gameState.totalEarned / 1000000));
  document.getElementById('prestigeGainText').innerText = `+${potentialPrestige} Prestígio`;

  document.getElementById('statCurrent').innerText = formatNum(gameState.pirulitos);
  document.getElementById('statTotalEarned').innerText = formatNum(gameState.totalEarned);
  document.getElementById('statPps').innerText = formatNum(getPps());
  document.getElementById('statClickPower').innerText = formatNum(getClickPower());
  document.getElementById('statTotalClicks').innerText = formatNum(gameState.totalClicks);
  document.getElementById('statTimePlayed').innerText = `${Math.floor(gameState.timePlayed)}s`;
  document.getElementById('statWheelSpins').innerText = gameState.wheelSpins;
  document.getElementById('statBoostsObtained').innerText = gameState.boostsObtained;
  document.getElementById('statFlavorsUnlocked').innerText = gameState.unlockedFlavors.length;
  document.getElementById('statSkinsUnlocked').innerText = gameState.unlockedSkins.length;
  document.getElementById('statUpgradesBought').innerText = getTotalUpgradesCount();
  document.getElementById('statMaxScore').innerText = formatNum(gameState.maxScore);
  document.getElementById('statMaxPps').innerText = formatNum(gameState.maxPps);

  const adBtn = document.getElementById('adBoostBtn');
  if (adBtn) {
    if (Date.now() < gameState.boostEndTime) {
      const remainingSecs = Math.ceil((gameState.boostEndTime - Date.now()) / 1000);
      adBtn.innerText = `⚡ Boost ativo: ${remainingSecs}s`;
      adBtn.classList.add('active-boost');
    } else {
      adBtn.innerText = '📺 Assistir Anúncio (2x Pirulitos por 30s)';
      adBtn.classList.remove('active-boost');
    }
  }

  checkAchievements();
  updateWheelTimerUI();
}

// --- RENDERIZAÇÃO DE SHOP, SABORES E SKINS ---
function renderUpgrades() {
  const container = document.getElementById('upgradesList');
  if (!container) return;
  container.innerHTML = '';
  for (let key in UPGRADES_DATA) {
    const data = UPGRADES_DATA[key];
    const card = document.createElement('div');
    card.id = `upg-${key}`;
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-icon">${data.icon}</div>
      <div class="upgrade-details">
        <div class="upgrade-title">${data.name}</div>
        <div class="upgrade-sub">Nível 0 | ${data.desc}</div>
      </div>
      <div class="upgrade-cost-tag">0 🍭</div>
    `;
    card.addEventListener('click', () => buyUpgrade(key));
    container.appendChild(card);
  }
}

function buyUpgrade(key) {
  const cost = getUpgradeCost(key);
  if (gameState.pirulitos >= cost) {
    gameState.pirulitos -= cost;
    gameState.upgrades[key] = (gameState.upgrades[key] || 0) + 1;
    playSound('buy');
    updateUI();
  }
}

function renderFlavors() {
  const freeGrid = document.getElementById('freeFlavorGrid');
  const premiumGrid = document.getElementById('premiumFlavorGrid');
  if (!freeGrid || !premiumGrid) return;
  freeGrid.innerHTML = '';
  premiumGrid.innerHTML = '';

  for (let key in FLAVORS_DATA) {
    const data = FLAVORS_DATA[key];
    const unlocked = gameState.unlockedFlavors.includes(key);
    const active = gameState.activeFlavor === key;

    const card = document.createElement('div');
    card.className = `flavor-card ${active ? 'active' : ''} ${!unlocked ? 'disabled' : ''}`;
    card.innerHTML = `
      <div style="font-size: 1.5rem;">${data.icon}</div>
      <div class="flavor-name">${data.name}</div>
      <div class="flavor-desc">${data.desc}</div>
      <div class="flavor-desc" style="font-weight:bold; color:#ffd54f; margin-top:4px;">
        ${active ? '★ Equipado' : unlocked ? 'Selecionar' : formatNum(data.cost) + ' 🍭'}
      </div>
    `;
    card.addEventListener('click', () => selectFlavor(key));

    if (data.isFree) {
      freeGrid.appendChild(card);
    } else {
      premiumGrid.appendChild(card);
    }
  }
}

function selectFlavor(key) {
  const data = FLAVORS_DATA[key];
  if (!gameState.unlockedFlavors.includes(key)) {
    if (gameState.pirulitos >= data.cost) {
      gameState.pirulitos -= data.cost;
      gameState.unlockedFlavors.push(key);
      gameState.activeFlavor = key;
      playSound('buy');
    }
  } else {
    gameState.activeFlavor = key;
    playSound('click');
  }
  renderFlavors();
  updateUI();
}

function renderSkins() {
  const grid = document.getElementById('skinGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let key in SKINS_DATA) {
    const data = SKINS_DATA[key];
    const unlocked = gameState.unlockedSkins.includes(key);
    const active = gameState.activeSkin === key;

    const card = document.createElement('div');
    card.className = `skin-card ${active ? 'active' : ''} ${!unlocked ? 'disabled' : ''}`;
    card.innerHTML = `
      <div class="skin-icon">${data.emoji}</div>
      <div class="skin-name">${data.name}</div>
      <div class="${unlocked ? 'skin-status' : 'skin-cost'}">
        ${active ? 'Equipado' : unlocked ? 'Usar' : formatNum(data.cost) + ' 🍭'}
      </div>
    `;
    card.addEventListener('click', () => selectSkin(key));
    grid.appendChild(card);
  }
}

function selectSkin(key) {
  const data = SKINS_DATA[key];
  if (!gameState.unlockedSkins.includes(key)) {
    if (gameState.pirulitos >= data.cost) {
      gameState.pirulitos -= data.cost;
      gameState.unlockedSkins.push(key);
      gameState.activeSkin = key;
      playSound('buy');
    }
  } else {
    gameState.activeSkin = key;
    playSound('click');
  }
  applySkinToMainLollipop();
  renderSkins();
  updateUI();
}

function applySkinToMainLollipop() {
  const lollipopEl = document.getElementById('lollipop');
  const glowEl = document.getElementById('lollipopGlow');
  const skin = SKINS_DATA[gameState.activeSkin] || SKINS_DATA.classic;

  document.body.className = '';
  document.body.classList.add(skin.themeClass);

  if (lollipopEl) {
    lollipopEl.innerText = skin.emoji;
  }
  if (glowEl) {
    glowEl.style.background = `radial-gradient(circle, ${skin.glow} 0%, rgba(0,0,0,0) 70%)`;
  }
}

function renderAchievements() {
  const list = document.getElementById('achievementsList');
  if (!list) return;
  list.innerHTML = '';
  ACHIEVEMENTS_DATA.forEach(ach => {
    const unlocked = gameState.unlockedAchievements.includes(ach.id);
    const card = document.createElement('div');
    card.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-details">
        <div class="achievement-title">${ach.title}</div>
        <div class="achievement-sub">${ach.desc}</div>
      </div>
      <div class="achievement-status">${unlocked ? '✅' : '🔒'}</div>
    `;
    list.appendChild(card);
  });
}

function checkAchievements() {
  let changed = false;
  ACHIEVEMENTS_DATA.forEach(ach => {
    if (!gameState.unlockedAchievements.includes(ach.id) && ach.req(gameState)) {
      gameState.unlockedAchievements.push(ach.id);
      spawnParticle(window.innerWidth / 2, 100, `🏆 ${ach.title}`);
      playSound('win');
      changed = true;
    }
  });
  if (changed) renderAchievements();
}

// --- CLIQUE NO PIRULITO ---
const lollipopBtn = document.getElementById('lollipop');
if (lollipopBtn) {
  lollipopBtn.addEventListener('click', (e) => {
    const power = getClickPower();
    gameState.pirulitos += power;
    gameState.totalEarned += power;
    gameState.totalClicks += 1;

    playSound('click');

    const clickText = document.createElement('div');
    clickText.className = 'click-text';
    clickText.innerText = `+${formatNum(power)}`;
    clickText.style.left = `${e.clientX - 20}px`;
    clickText.style.top = `${e.clientY - 30}px`;
    document.body.appendChild(clickText);
    setTimeout(() => clickText.remove(), 800);

    spawnParticle(e.clientX, e.clientY);

    const bottomPanel = document.getElementById('bottomPanel');
    if (bottomPanel && bottomPanel.classList.contains('open')) {
      bottomPanel.classList.remove('open');
    }

    updateUI();
  });
}

// --- NAVEGAÇÃO DE ÁREAS ---
function updateAreaView() {
  AREAS_DATA.forEach((area, i) => {
    const el = document.getElementById(area.elementId);
    if (el) {
      if (i === currentAreaIndex) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
  const titleEl = document.getElementById('areaTitle');
  if (titleEl) titleEl.innerText = AREAS_DATA[currentAreaIndex].title;
}

const prevAreaBtn = document.getElementById('prevAreaBtn');
if (prevAreaBtn) {
  prevAreaBtn.addEventListener('click', () => {
    currentAreaIndex = (currentAreaIndex - 1 + AREAS_DATA.length) % AREAS_DATA.length;
    updateAreaView();
    playSound('click');
  });
}

const nextAreaBtn = document.getElementById('nextAreaBtn');
if (nextAreaBtn) {
  nextAreaBtn.addEventListener('click', () => {
    currentAreaIndex = (currentAreaIndex + 1) % AREAS_DATA.length;
    updateAreaView();
    playSound('click');
  });
}

// --- ARENA DE BOSSES ---
let bossActive = false;
let bossMaxHp = 100;
let bossCurrentHp = 100;
let bossTimerInterval = null;
let bossTimeLeft = 30;

const startBossBtn = document.getElementById('startBossBtn');
const bossAvatar = document.getElementById('bossAvatar');

if (startBossBtn) {
  startBossBtn.addEventListener('click', () => {
    if (bossActive) return;
    bossActive = true;
    bossMaxHp = Math.floor(100 * Math.pow(1.6, gameState.bossesKilled));
    bossCurrentHp = bossMaxHp;
    bossTimeLeft = 30;

    if (bossAvatar) bossAvatar.className = 'boss-avatar';
    startBossBtn.style.display = 'none';

    updateBossUI();

    bossTimerInterval = setInterval(() => {
      bossTimeLeft--;
      const bossTimerEl = document.getElementById('bossTimer');
      if (bossTimerEl) bossTimerEl.innerText = `Tempo: ${bossTimeLeft}s`;
      if (bossTimeLeft <= 0) {
        endBoss(false);
      }
    }, 1000);
  });
}

if (bossAvatar) {
  bossAvatar.addEventListener('click', (e) => {
    if (!bossActive) return;
    const dmg = getClickPower();
    bossCurrentHp -= dmg;
    playSound('click');
    spawnParticle(e.clientX, e.clientY, `-${formatNum(dmg)}`);
    if (bossCurrentHp <= 0) {
      bossCurrentHp = 0;
      endBoss(true);
    }
    updateBossUI();
  });
}

function updateBossUI() {
  const hpPct = Math.max(0, (bossCurrentHp / bossMaxHp) * 100);
  const hpBarEl = document.getElementById('bossHpBar');
  const hpTextEl = document.getElementById('bossHpText');
  if (hpBarEl) hpBarEl.style.width = `${hpPct}%`;
  if (hpTextEl) hpTextEl.innerText = `${formatNum(bossCurrentHp)} / ${formatNum(bossMaxHp)} HP`;
}

function endBoss(won) {
  clearInterval(bossTimerInterval);
  bossActive = false;
  if (bossAvatar) bossAvatar.className = 'boss-avatar-idle';
  if (startBossBtn) startBossBtn.style.display = 'block';

  if (won) {
    gameState.bossesKilled += 1;
    const reward = Math.floor(bossMaxHp * 15);
    gameState.pirulitos += reward;
    gameState.totalEarned += reward;
    playSound('win');
    alert(`🎉 Vitória! Você derrotou o Boss e ganhou ${formatNum(reward)} pirulitos!`);
  } else {
    alert('❌ O tempo acabou! O Boss escapou.');
  }
  updateUI();
}

// --- BOTTOM SHEET MENU ---
const menuToggleBtn = document.getElementById('menuToggleBtn');
const bottomPanel = document.getElementById('bottomPanel');
const closeMenuDrag = document.getElementById('closeMenuDrag');

if (menuToggleBtn && bottomPanel) {
  menuToggleBtn.addEventListener('click', () => {
    bottomPanel.classList.toggle('open');
    playSound('click');
  });
}

if (closeMenuDrag && bottomPanel) {
  closeMenuDrag.addEventListener('click', () => {
    bottomPanel.classList.remove('open');
    playSound('click');
  });
}

document.querySelectorAll('.nav-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content .tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabTarget = btn.getAttribute('data-tab');
    const targetPane = document.getElementById(`tab-${tabTarget}`);
    if (targetPane) targetPane.classList.add('active');
    playSound('click');
  });
});

// --- ROLETA ---
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
    wheelCtx.font = 'bold 10px sans-serif';
    wheelCtx.translate(110 + Math.cos(angle + arc / 2) * 60, 110 + Math.sin(angle + arc / 2) * 60);
    wheelCtx.rotate(angle + arc / 2 + Math.PI / 2);
    const labelText = wheelRewards[i].label;
    wheelCtx.fillText(labelText, -wheelCtx.measureText(labelText).width / 2, 0);
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

// --- ANÚNCIO MOCK (IMEDIATO - 30 SEGUNDOS) ---
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

// --- PRESTÍGIO ---
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

// --- CONFIGURAÇÕES ---
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

// --- LOOP E SAVE ---
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
      if (parsed.settings) gameState.settings = Object.assign({}, defaultState.settings, parsed.settings);
      if (parsed.upgrades) gameState.upgrades = Object.assign({}, defaultState.upgrades, parsed.upgrades);
    } catch (e) {
      console.error('Erro ao carregar save', e);
    }
  }

  if (toggleMusicBtn) toggleMusicBtn.innerText = gameState.settings.music ? 'ON' : 'OFF';
  if (toggleSfxBtn) toggleSfxBtn.innerText = gameState.settings.sfx ? 'ON' : 'OFF';

  updateMusicState();
  applySkinToMainLollipop();
  renderUpgrades();
  renderFlavors();
  renderSkins();
  renderAchievements();
  updateUI();
}

loadGame();
