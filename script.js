// ==========================================
// LOLLIPOP CLICKER - SCRIPT PRINCIPAL
// ==========================================

// --- ESTADO DO JOGO ---
const defaultState = {
  pirulitos: 0,
  totalEarned: 0,
  totalClicks: 0,
  prestigeLevel: 0,
  activeFlavor: 'morango',
  activeSkin: 'purple',
  upgrades: {
    cursor: 0,
    vovo: 0,
    fabrica: 0,
    loja: 0,
    laboratorio: 0
  },
  unlockedSkins: ['purple'],
  unlockedAchievements: [],
  bossesKilled: 0,
  wheelSpins: 0,
  lastWheelTime: 0,
  boostEndTime: 0
};

let gameState = JSON.parse(JSON.stringify(defaultState));

// --- CONFIGURAÇÕES DE DADOS ---
const UPGRADES_DATA = {
  cursor: { name: 'Cursor Doce', baseCost: 15, costMult: 1.15, basePps: 0.5, icon: '👆' },
  vovo: { name: 'Vovó Confeiteira', baseCost: 100, costMult: 1.15, basePps: 4, icon: '👵' },
  fabrica: { name: 'Fábrica de Balas', baseCost: 1100, costMult: 1.15, basePps: 32, icon: '🏭' },
  loja: { name: 'Mega Loja Doce', baseCost: 12000, costMult: 1.15, basePps: 260, icon: '🏪' },
  laboratorio: { name: 'Laboratório Alquímico', baseCost: 130000, costMult: 1.15, basePps: 1400, icon: '🧪' }
};

const FLAVORS_DATA = {
  morango: { name: 'Morango', desc: '+1 por clique', icon: '🍓' },
  uva: { name: 'Uva', desc: '+10% PPS global', icon: '🍇' },
  limao: { name: 'Limão', desc: '+25% força de clique', icon: '🍋' }
};

const SKINS_DATA = {
  purple: { name: 'Iniciante Roxa', cost: 0, themeClass: 'theme-purple', icon: '🟣' },
  pink: { name: 'Rosa Chiclete', cost: 1000, themeClass: 'theme-pink', icon: '🌸' },
  space: { name: 'Galáxia Doce', cost: 100000, themeClass: 'theme-space', icon: '🌌' },
  gold: { name: 'Ouro Imperial', cost: 10000000, themeClass: 'theme-gold', icon: '👑' }
};

const ACHIEVEMENTS_DATA = [
  { id: 'c1', title: 'Primeira Lambida', desc: 'Faça 1 clique no pirulito', icon: '🍭', req: state => state.totalClicks >= 1 },
  { id: 'c100', title: 'Clicador Nato', desc: 'Faça 100 cliques no pirulito', icon: '💥', req: state => state.totalClicks >= 100 },
  { id: 'p1k', title: 'Empresário Doce', desc: 'Acumule 1.000 pirulitos', icon: '💰', req: state => state.totalEarned >= 1000 },
  { id: 'boss1', title: 'Caçador de Monstros', desc: 'Derrote o primeiro Chefão', icon: '⚔️', req: state => state.bossesKilled >= 1 },
  { id: 'pres1', title: 'Renascer Real', desc: 'Realize o seu 1º Prestígio', icon: '👑', req: state => state.prestigeLevel >= 1 }
];

const AREAS_DATA = [
  { title: '🍭 Fábrica de Pirulitos', elementId: 'areaClicker' },
  { title: '⚔️ Arena de Bosses', elementId: 'areaBoss' },
  { title: '🚀 Nova Dimensão', elementId: 'areaSoon' }
];

let currentAreaIndex = 0;

// --- VARIÁVEIS DO BOSS ---
let bossActive = false;
let bossMaxHp = 100;
let bossCurrentHp = 100;
let bossTimerInterval = null;
let bossTimeLeft = 30;

// --- EFEITOS DE CANVAS ---
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
  const count = text ? 1 : 6;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x || window.innerWidth / 2,
      y: y || window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 6,
      alpha: 1,
      size: Math.random() * 8 + 4,
      color: `hsl(${Math.random() * 360}, 100%, 75%)`,
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
    p.alpha -= 0.02;
    
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    if (p.text) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(p.text, p.x, p.y);
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

// --- CÁLCULOS DO JOGO ---
function getClickPower() {
  let base = 1;
  if (gameState.activeFlavor === 'morango') base += 1;
  if (gameState.activeFlavor === 'limao') base *= 1.25;
  
  const prestigeMult = 1 + (gameState.prestigeLevel * 0.1);
  const boostMult = Date.now() < gameState.boostEndTime ? 2 : 1;

  return base * prestigeMult * boostMult;
}

function getPps() {
  let ppsBase = 0;
  for (let key in UPGRADES_DATA) {
    const count = gameState.upgrades[key] || 0;
    ppsBase += count * UPGRADES_DATA[key].basePps;
  }

  if (gameState.activeFlavor === 'uva') ppsBase *= 1.10;

  const prestigeMult = 1 + (gameState.prestigeLevel * 0.1);
  const boostMult = Date.now() < gameState.boostEndTime ? 2 : 1;

  return ppsBase * prestigeMult * boostMult;
}

function getUpgradeCost(key) {
  const data = UPGRADES_DATA[key];
  const count = gameState.upgrades[key] || 0;
  return Math.floor(data.baseCost * Math.pow(data.costMult, count));
}

// --- ATUALIZAÇÃO DA TELA (UI) ---
function updateUI() {
  document.getElementById('scoreDisplay').innerText = formatNum(gameState.pirulitos);
  document.getElementById('ppsDisplay').innerText = `${formatNum(getPps())} pirulitos / seg`;

  // Upgrades
  for (let key in UPGRADES_DATA) {
    const card = document.getElementById(`upg-${key}`);
    if (card) {
      const cost = getUpgradeCost(key);
      const count = gameState.upgrades[key] || 0;
      card.querySelector('.upgrade-sub').innerText = `Nível ${count} | +${formatNum(UPGRADES_DATA[key].basePps)}/s`;
      card.querySelector('.upgrade-cost-tag').innerText = `${formatNum(cost)} 🍭`;
      if (gameState.pirulitos >= cost) {
        card.classList.remove('disabled');
      } else {
        card.classList.add('disabled');
      }
    }
  }

  // Prestígio
  document.getElementById('prestigeLevel').innerText = gameState.prestigeLevel;
  document.getElementById('prestigeBonus').innerText = `+${gameState.prestigeLevel * 10}%`;
  const potentialPrestige = Math.floor(Math.cbrt(gameState.totalEarned / 1000000));
  document.getElementById('prestigeGainText').innerText = `+${potentialPrestige} Prestígio`;

  // Stats
  document.getElementById('statTotalClicks').innerText = formatNum(gameState.totalClicks);
  document.getElementById('statTotalEarned').innerText = formatNum(gameState.totalEarned);
  document.getElementById('statBossesKilled').innerText = gameState.bossesKilled;
  document.getElementById('statWheelSpins').innerText = gameState.wheelSpins;

  // Ad Boost Btn
  const adBtn = document.getElementById('adBoostBtn');
  if (Date.now() < gameState.boostEndTime) {
    const remainingSecs = Math.ceil((gameState.boostEndTime - Date.now()) / 1000);
    adBtn.innerText = `🔥 Bónus 2x Ativo! (${remainingSecs}s)`;
    adBtn.classList.add('active-boost');
  } else {
    adBtn.innerText = '📺 Assistir Anúncio (2x Pirulitos por 4min)';
    adBtn.classList.remove('active-boost');
  }

  checkAchievements();
}

// --- INICIALIZAÇÃO DOS COMPONENTES DA LOJA E SKINS ---
function renderUpgrades() {
  const container = document.getElementById('tab-upgrades');
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
        <div class="upgrade-sub">Nível 0 | +${data.basePps}/s</div>
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
    updateUI();
  }
}

function renderFlavors() {
  const grid = document.getElementById('flavorGrid');
  grid.innerHTML = '';
  for (let key in FLAVORS_DATA) {
    const data = FLAVORS_DATA[key];
    const card = document.createElement('div');
    card.className = `flavor-card ${gameState.activeFlavor === key ? 'active' : ''}`;
    card.innerHTML = `
      <div style="font-size: 1.5rem;">${data.icon}</div>
      <div class="flavor-name">${data.name}</div>
      <div class="flavor-desc">${data.desc}</div>
    `;
    card.addEventListener('click', () => {
      gameState.activeFlavor = key;
      renderFlavors();
      updateUI();
    });
    grid.appendChild(card);
  }
}

function renderSkins() {
  const grid = document.getElementById('skinGrid');
  grid.innerHTML = '';
  for (let key in SKINS_DATA) {
    const data = SKINS_DATA[key];
    const unlocked = gameState.unlockedSkins.includes(key);
    const active = gameState.activeSkin === key;
    const card = document.createElement('div');
    card.className = `skin-card ${active ? 'active' : ''} ${!unlocked ? 'disabled' : ''}`;
    card.innerHTML = `
      <div class="skin-icon">${data.icon}</div>
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
    }
  } else {
    gameState.activeSkin = key;
  }
  applySkinTheme();
  renderSkins();
  updateUI();
}
function applySkinTheme() {
  document.body.className = '';
  const skin = SKINS_DATA[gameState.activeSkin];
  if (skin) {
    document.body.classList.add(skin.themeClass);
  }
}

function renderAchievements() {
  const list = document.getElementById('achievementsList');
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
      spawnParticle(window.innerWidth / 2, 100, `🏆 Conquista: ${ach.title}`);
      changed = true;
    }
  });
  if (changed) renderAchievements();
}

// --- CLIQUE NO PIRULITO ---
const lollipopBtn = document.getElementById('lollipop');
lollipopBtn.addEventListener('click', (e) => {
  const power = getClickPower();
  gameState.pirulitos += power;
  gameState.totalEarned += power;
  gameState.totalClicks += 1;

  // Texto a flutuar
  const clickText = document.createElement('div');
  clickText.className = 'click-text';
  clickText.innerText = `+${formatNum(power)}`;
  clickText.style.left = `${e.clientX - 20}px`;
  clickText.style.top = `${e.clientY - 30}px`;
  document.body.appendChild(clickText);
  setTimeout(() => clickText.remove(), 800);

  // Efeito visual
  spawnParticle(e.clientX, e.clientY);

  // Fechar menu se estiver aberto
  const bottomPanel = document.getElementById('bottomPanel');
  if (bottomPanel && bottomPanel.classList.contains('open')) {
    bottomPanel.classList.remove('open');
  }

  updateUI();
});

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
  document.getElementById('areaTitle').innerText = AREAS_DATA[currentAreaIndex].title;
}

document.getElementById('prevAreaBtn').addEventListener('click', () => {
  currentAreaIndex = (currentAreaIndex - 1 + AREAS_DATA.length) % AREAS_DATA.length;
  updateAreaView();
});

document.getElementById('nextAreaBtn').addEventListener('click', () => {
  currentAreaIndex = (currentAreaIndex + 1) % AREAS_DATA.length;
  updateAreaView();
});

// --- ARENA DE BOSSES ---
const startBossBtn = document.getElementById('startBossBtn');
const bossAvatar = document.getElementById('bossAvatar');

startBossBtn.addEventListener('click', () => {
  if (bossActive) return;
  bossActive = true;
  bossMaxHp = Math.floor(100 * Math.pow(1.5, gameState.bossesKilled));
  bossCurrentHp = bossMaxHp;
  bossTimeLeft = 30;

  bossAvatar.className = 'boss-avatar';
  startBossBtn.style.display = 'none';

  updateBossUI();

  bossTimerInterval = setInterval(() => {
    bossTimeLeft--;
    document.getElementById('bossTimer').innerText = `Tempo: ${bossTimeLeft}s`;
    if (bossTimeLeft <= 0) {
      endBoss(false);
    }
  }, 1000);
});

bossAvatar.addEventListener('click', (e) => {
  if (!bossActive) return;
  const dmg = getClickPower();
  bossCurrentHp -= dmg;
  spawnParticle(e.clientX, e.clientY, `-${formatNum(dmg)}`);
  if (bossCurrentHp <= 0) {
    bossCurrentHp = 0;
    endBoss(true);
  }
  updateBossUI();
});

function updateBossUI() {
  const hpPct = Math.max(0, (bossCurrentHp / bossMaxHp) * 100);
  document.getElementById('bossHpBar').style.width = `${hpPct}%`;
  document.getElementById('bossHpText').innerText = `${formatNum(bossCurrentHp)} / ${formatNum(bossMaxHp)} HP`;
}

function endBoss(won) {
  clearInterval(bossTimerInterval);
  bossActive = false;
  bossAvatar.className = 'boss-avatar-idle';
  startBossBtn.style.display = 'block';

  if (won) {
    gameState.bossesKilled += 1;
    const reward = Math.floor(bossMaxHp * 10);
    gameState.pirulitos += reward;
    gameState.totalEarned += reward;
    alert(`🎉 Vitória! Você derrotou o Boss e ganhou ${formatNum(reward)} pirulitos!`);
  } else {
    alert('❌ O tempo acabou! O Boss escapou.');
  }
  updateUI();
}

// --- BOTÃO BOTTOM SHEET & ABAS ---
const menuToggleBtn = document.getElementById('menuToggleBtn');
const bottomPanel = document.getElementById('bottomPanel');
const closeMenuDrag = document.getElementById('closeMenuDrag');

menuToggleBtn.addEventListener('click', () => {
  bottomPanel.classList.toggle('open');
});

closeMenuDrag.addEventListener('click', () => {
  bottomPanel.classList.remove('open');
});

document.querySelectorAll('.nav-tabs .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content .tab-pane').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabTarget = btn.getAttribute('data-tab');
    document.getElementById(`tab-${tabTarget}`).classList.add('active');
  });
});

// --- ROLETA DA SORTE ---
const wheelCanvas = document.getElementById('wheelCanvas');
const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
const wheelRewards = ['+100 🍭', '+1.000 🍭', '+10.000 🍭', '2x Boost', '+1 Prestígio', 'Tente De Novo'];
const wheelColors = ['#ff4081', '#ab47bc', '#42a5f5', '#26a69a', '#ffca28', '#ff7043'];

function drawWheel() {
  if (!wheelCtx) return;
  const numSlices = wheelRewards.length;
  const arc = (Math.PI * 2) / numSlices;

  wheelCtx.clearRect(0, 0, 220, 220);
  for (let i = 0; i < numSlices; i++) {
    const angle = i * arc;
    wheelCtx.beginPath();
    wheelCtx.fillStyle = wheelColors[i % wheelColors.length];
    wheelCtx.moveTo(110, 110);
    wheelCtx.arc(110, 110, 100, angle, angle + arc);
    wheelCtx.lineTo(110, 110);
    wheelCtx.fill();

    wheelCtx.save();
    wheelCtx.fillStyle = '#fff';
    wheelCtx.font = 'bold 12px sans-serif';
    wheelCtx.translate(110 + Math.cos(angle + arc / 2) * 65, 110 + Math.sin(angle + arc / 2) * 65);
    wheelCtx.rotate(angle + arc / 2 + Math.PI / 2);
    wheelCtx.fillText(wheelRewards[i], -wheelCtx.measureText(wheelRewards[i]).width / 2, 0);
    wheelCtx.restore();
  }
}
drawWheel();

document.getElementById('spinBtn').addEventListener('click', () => {
  gameState.wheelSpins += 1;
  const prizeIndex = Math.floor(Math.random() * wheelRewards.length);
  alert(`🎰 Você girou a roleta e ganhou: ${wheelRewards[prizeIndex]}!`);

  if (prizeIndex === 0) gameState.pirulitos += 100;
  if (prizeIndex === 1) gameState.pirulitos += 1000;
  if (prizeIndex === 2) gameState.pirulitos += 10000;
  if (prizeIndex === 3) gameState.boostEndTime = Date.now() + (4 * 60 * 1000);
  if (prizeIndex === 4) gameState.prestigeLevel += 1;

  updateUI();
});

// --- AD BOOST ---
document.getElementById('adBoostBtn').addEventListener('click', () => {
  gameState.boostEndTime = Date.now() + (4 * 60 * 1000);
  alert('📺 Bónus de 2x ativado por 4 minutos!');
  updateUI();
});

// --- PRESTÍGIO ---
document.getElementById('prestigeBtn').addEventListener('click', () => {
  const potentialPrestige = Math.floor(Math.cbrt(gameState.totalEarned / 1000000));
  if (potentialPrestige <= 0) {
    alert('Você precisa acumular pelo menos 1.000.000 de pirulitos totais para fazer prestígio!');
    return;
  }

  if (confirm(`Tem certeza que deseja reiniciar para ganhar +${potentialPrestige} de Prestígio?`)) {
    gameState.prestigeLevel += potentialPrestige;
    gameState.pirulitos = 0;
    for (let key in gameState.upgrades) gameState.upgrades[key] = 0;
    updateUI();
  }
});

// --- RESET DE DADOS ---
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm('Tem certeza absoluta que deseja apagar todo o seu progresso?')) {
    localStorage.removeItem('lollipopSave');
    gameState = JSON.parse(JSON.stringify(defaultState));
    applySkinTheme();
    renderUpgrades();
    renderFlavors();
    renderSkins();
    renderAchievements();
    updateUI();
  }
});

// --- LOOP DO JOGO E AUTO-SAVE ---
setInterval(() => {
  const pps = getPps();
  if (pps > 0) {
    const gainPerTick = pps / 10;
    gameState.pirulitos += gainPerTick;
    gameState.totalEarned += gainPerTick;
    updateUI();
  }
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
    } catch (e) {
      console.error('Erro ao carregar save', e);
    }
  }
  applySkinTheme();
  renderUpgrades();
  renderFlavors();
  renderSkins();
  renderAchievements();
  updateUI();
}

loadGame();
