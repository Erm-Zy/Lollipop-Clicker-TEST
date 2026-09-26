let state = {
  lollipops: 0,
  totalEarned: 0,
  manualClicks: 0,
  goldenCaught: 0,
  bossesDefeated: 0,
  prestigePoints: 0,
  perClick: 1,
  perSecond: 0,
  flavor: 'none',
  sound: true,
  vibration: true,
  lastSave: Date.now(),
  lastWheelSpin: 0,
  currentSkin: 'lollipop',
  unlockedSkins: ['lollipop'],
  currentParticle: 'circles',
  unlockedParticles: ['circles'],
  currentTheme: 'purple',
  unlockedThemes: ['purple'],
  achievements: {
    click1: false,
    clicks100: false,
    earn1k: false,
    earn50k: false,
    bots5: false,
    golden1: false,
    boss1: false,
    prestige1: false
  },
  upgrades: {
    finger:   { name: "Super Dedo",      icon: "👆", baseCost: 15,    count: 0, addClick: 1,  addPps: 0 },
    wrapper:  { name: "Embalagem Dupla", icon: "🍬", baseCost: 100,   count: 0, addClick: 5,  addPps: 0 },
    autolick: { name: "Licker Bot",      icon: "🤖", baseCost: 50,    count: 0, addClick: 0,  addPps: 1 },
    factory:  { name: "Fábrica Doce",    icon: "🏭", baseCost: 400,   count: 0, addClick: 0,  addPps: 12 },
    truck:    { name: "Caminhão Doce",   icon: "🚚", baseCost: 2000,  count: 0, addClick: 0,  addPps: 70 },
    planet:   { name: "Mundo do Açúcar", icon: "🪐", baseCost: 15000, count: 0, addClick: 0,  addPps: 450 }
  }
};

const skinOptions = {
  lollipop:  { name: "Original",   icon: "🍭", cost: 0 },
  chocolate: { name: "Chocolate",  icon: "🍫", cost: 500 },
  star:      { name: "Estrela",    icon: "⭐", cost: 2500 },
  neon:      { name: "Neon",       icon: "⚡", cost: 10000 },
  galaxy:    { name: "Galáxia",    icon: "🌌", cost: 50000 },
  gold:      { name: "Ouro Pure",  icon: "🪙", cost: 250000 }
};

const particleOptions = {
  circles: { name: "Círculos", icon: "⚪", cost: 0 },
  stars:   { name: "Estrelas", icon: "⭐", cost: 1000 },
  hearts:  { name: "Corações", icon: "❤️", cost: 5000 },
  coins:   { name: "Moedas",   icon: "🪙", cost: 20000 }
};

const themeOptions = {
  purple: { name: "Roxo",   icon: "🌙", cost: 0,      cssClass: "theme-purple" },
  pink:   { name: "Rosa",   icon: "💖", cost: 2000,   cssClass: "theme-pink" },
  space:  { name: "Espaço", icon: "🌌", cost: 15000,  cssClass: "theme-space" },
  gold:   { name: "Ouro",   icon: "✨", cost: 100000, cssClass: "theme-gold" }
};

const achievementList = {
  click1:   { name: "Primeiro Toque", desc: "Dê o seu primeiro clique", icon: "👆" },
  clicks100: { name: "Dedos Rápidos", desc: "Faça 100 cliques manuais", icon: "⚡" },
  earn1k:   { name: "Colecionador Doce", desc: "Acumule 1.000 pirulitos no total", icon: "🍬" },
  earn50k:  { name: "Império do Açúcar", desc: "Acumule 50.000 pirulitos no total", icon: "👑" },
  bots5:    { name: "Automação", desc: "Compre 5 Licker Bots", icon: "🤖" },
  golden1:  { name: "Sorte Dourada", desc: "Apanhe 1 Pirulito Dourado", icon: "🌟" },
  boss1:    { name: "Dentista Herói", desc: "Derrote 1 Monstro da Cárie", icon: "⚔️" },
  prestige1:{ name: "Novo Recomeço", desc: "Efetue o seu primeiro Prestígio", icon: "👑" }
};

/* NAVEGAÇÃO DE ÁREAS */
let currentArea = 0;
const areas = [
  { id: 'view-main', title: '🍭 Mundo Principal' },
  { id: 'view-boss', title: '⚔️ Arena dos Chefões' },
  { id: 'view-worlds', title: '🪐 Novos Mundos' }
];

function changeArea(dir) {
  currentArea = (currentArea + dir + areas.length) % areas.length;
  areas.forEach((a, i) => {
    const el = document.getElementById(a.id);
    if (el) {
      if (i === currentArea) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
  const titleEl = document.getElementById('areaTitle');
  if (titleEl) titleEl.innerText = areas[currentArea].title;
}

let boostMultiplier = 1;
let boostEndTime = 0;
let boostInterval = null;

let bossActive = false;
let bossMaxHp = 50;
let bossCurrentHp = 50;
let bossTimer = 15;
let bossInterval = null;

/* ÁUDIO */
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPopSound() {
  if (!state.sound) return;
  initAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300 + Math.random() * 150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.06);
}

function playUpgradeSound() {
  if (!state.sound) return;
  initAudio();
  const now = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, now + idx * 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + idx * 0.05);
    osc.stop(now + idx * 0.05 + 0.15);
  });
}

/* CANVAS DE PARTÍCULAS DE CLIQUE */
const canvas = document.getElementById('fxCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function spawnParticles(x, y) {
  const colors = ['#ff4081', '#ffd54f', '#ffffff', '#e040fb'];
  const shapeEmoji = { stars: '⭐', hearts: '❤️', coins: '🪙' }[state.currentParticle];

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      shape: shapeEmoji || 'circle'
    });
  }
}

function updateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.3;
    p.alpha -= 0.02;
    ctx.globalAlpha = Math.max(0, p.alpha);

    if (p.shape === 'circle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `${p.size * 2}px sans-serif`;
      ctx.fillText(p.shape, p.x, p.y);
    }
    if (p.alpha <= 0) particles.splice(i, 1);
  }
  requestAnimationFrame(updateParticles);
}
requestAnimationFrame(updateParticles);

/* ELEMENTOS DOM */
const scoreEl = document.getElementById('score');
const ppsEl = document.getElementById('pps');
const lollipopEl = document.getElementById('lollipop');
const paneShop = document.getElementById('pane-shop');
const paneSkins = document.getElementById('pane-skins');
const paneAchieve = document.getElementById('pane-achievements');

if (lollipopEl) {
  lollipopEl.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    doClick(e.clientX, e.clientY);
  });
}

function getPrestigeMultiplier() {
  return 1 + (state.prestigePoints * 0.20);
}

function getAchievementMultiplier() {
  let count = 0;
  for (const key in state.achievements) {
    if (state.achievements[key]) count++;
  }
  return (1 + (count * 0.01)) * getPrestigeMultiplier();
}

function getEffectiveClickPower() {
  return Math.floor(state.perClick * boostMultiplier * getAchievementMultiplier());
}

function doClick(x, y) {
  let earned = getEffectiveClickPower();
  let isCrit = false;

  if (state.flavor === 'morango' && Math.random() < 0.05) {
    earned *= 3;
    isCrit = true;
  }

  state.lollipops += earned;
  state.totalEarned += earned;
  state.manualClicks++;

  playPopSound();
  if (state.vibration && navigator.vibrate) navigator.vibrate(10);

  spawnParticles(x, y);
  createFloatingText(x, y, isCrit ? `CRÍTICO! +${formatNum(earned)}` : `+${formatNum(earned)}`, isCrit);
  checkAchievements();
  updateUI();
}

function createFloatingText(x, y, text, isCrit = false) {
  const el = document.createElement('div');
  el.className = `click-text ${isCrit ? 'crit' : ''}`;
  el.innerText = text;
  el.style.left = `${x - 20}px`;
  el.style.top = `${y - 40}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function formatNum(num) {
  if (num < 1000) return Math.floor(num);
  const suffixes = ['', 'K', 'M', 'B', 'T', 'Qa'];
  const i = Math.floor(Math.log10(num) / 3);
  const formatted = (num / Math.pow(10, i * 3)).toFixed(1);
  return `${formatted}${suffixes[i]}`;
}

function getUpgradeCost(key) {
  const up = state.upgrades[key];
  return Math.floor(up.baseCost * Math.pow(1.15, up.count));
}

/* ARENA DE BATALHA DE BOSS (EQUILIBRADO COM PODER DE CLIQUE) */
function startBossBattle() {
  bossActive = true;
  const clickDmg = Math.max(1, getEffectiveClickPower());
  // Vida do Boss equilibrada para exigir ~18 a 20 cliques em 15 segundos
  const clicksNeeded = 18 + (state.bossesDefeated * 2);
  bossMaxHp = Math.max(20, clickDmg * clicksNeeded);
  bossCurrentHp = bossMaxHp;
  bossTimer = 15;

  const idleState = document.getElementById('boss-idle-state');
  const activeState = document.getElementById('boss-active-state');
  if (idleState) idleState.classList.add('hidden');
  if (activeState) activeState.classList.remove('hidden');

  updateBossUI();

  if (bossInterval) clearInterval(bossInterval);

  bossInterval = setInterval(() => {
    bossTimer--;
    const timerEl = document.getElementById('boss-timer');
    if (timerEl) timerEl.innerText = `Tempo restante: ${bossTimer}s`;

    if (bossTimer <= 0) {
      endBoss(false);
    }
  }, 1000);
}

function hitBossArena(e) {
  if (!bossActive) return;
  const dmg = Math.max(1, getEffectiveClickPower());
  damageBoss(dmg);
  spawnParticles(e.clientX, e.clientY);
  playPopSound();
  createFloatingText(e.clientX, e.clientY, `-${formatNum(dmg)}`, true);
}

function damageBoss(amount) {
  bossCurrentHp -= amount;
  updateBossUI();
  if (bossCurrentHp <= 0) {
    endBoss(true);
  }
}

function updateBossUI() {
  const hpBar = document.getElementById('boss-hp-bar');
  if (hpBar) {
    const pct = Math.max(0, (bossCurrentHp / bossMaxHp) * 100);
    hpBar.style.width = `${pct}%`;
  }
  const hpText = document.getElementById('boss-hp-text');
  if (hpText) {
    hpText.innerText = `${formatNum(Math.max(0, bossCurrentHp))} / ${formatNum(bossMaxHp)} HP`;
  }
}

function endBoss(defeated) {
  if (bossInterval) clearInterval(bossInterval);
  bossInterval = null;
  bossActive = false;

  const idleState = document.getElementById('boss-idle-state');
  const activeState = document.getElementById('boss-active-state');
  if (activeState) activeState.classList.add('hidden');
  if (idleState) idleState.classList.remove('hidden');

  if (defeated) {
    const reward = Math.max(250, Math.floor(state.perSecond * 80 + getEffectiveClickPower() * 100));
    state.lollipops += reward;
    state.totalEarned += reward;
    state.bossesDefeated++;
    playUpgradeSound();
    alert(`🎉 DERROTASTE O MONSTRO DA CÁRIE!\nGanhaste +${formatNum(reward)} pirulitos!`);
    checkAchievements();
  } else {
    alert("❌ O Monstro da Cárie escapou...");
  }
  updateUI();
}

/* SISTEMA DE PRESTÍGIO */
function getPrestigeGain() {
  if (state.totalEarned < 1000000) return 0;
  return Math.floor(Math.sqrt(state.totalEarned / 1000000) * 5);
}

function doPrestige() {
  const gain = getPrestigeGain();
  if (gain <= 0) {
    alert("Precisas de pelo menos 1.000.000 de Pirulitos acumulados na carreira para efetuar Prestígio!");
    return;
  }

  if (confirm(`Tem a certeza que deseja efetuar o Renascimento?\n\nIrás reiniciar os teus pirulitos e edifícios, mas ganharás +${gain} ✨ Açúcar Divino (+${gain * 20}% de produção permanente)!`)) {
    state.prestigePoints += gain;
    state.lollipops = 0;
    state.perClick = 1;
    state.perSecond = 0;

    for (const key in state.upgrades) {
      state.upgrades[key].count = 0;
    }

    state.achievements.prestige1 = true;
    playUpgradeSound();
    recalcStats();
    buildShopUI();
    updateUI();
    alert(`✨ Prestígio efetuado com sucesso! Agora tens ${state.prestigePoints} Açúcar Divino!`);
  }
}

/* EVENTO DE CHUVA DE AÇÚCAR */
function triggerSugarRain() {
  const count = 12;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      const candy = document.createElement('div');
      candy.className = 'falling-candy';
      const items = ['🍬', '🍭', '🍫', '🍩', '🧁'];
      candy.innerText = items[Math.floor(Math.random() * items.length)];
      candy.style.left = `${Math.random() * 80 + 10}%`;

      candy.onclick = (e) => {
        e.stopPropagation();
        const gain = Math.max(10, Math.floor(getEffectiveClickPower() * 5));
        state.lollipops += gain;
        state.totalEarned += gain;
        playPopSound();
        spawnParticles(e.clientX, e.clientY);
        createFloatingText(e.clientX, e.clientY, `+${formatNum(gain)}`);
        candy.remove();
        updateUI();
      };

      document.body.appendChild(candy);
      setTimeout(() => { if (candy.parentNode) candy.remove(); }, 4000);
    }, i * 350);
  }
}
/* ROLETA VISUAL CANVAS */
const wheelPrizes = [
  { label: '500 🍭', color: '#e91e63' },
  { label: '3x Boost', color: '#9c27b0' },
  { label: '5.000 🍭', color: '#3f51b5' },
  { label: 'Chuva Doce', color: '#00bcd4' },
  { label: '25.000 🍭', color: '#4caf50' },
  { label: '1.000 🍭', color: '#ff9800' }
];

let wheelAngle = 0;
let isSpinning = false;

function drawWheel() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const numOptions = wheelPrizes.length;
  const arcSize = (2 * Math.PI) / numOptions;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < numOptions; i++) {
    const angle = wheelAngle + i * arcSize;
    ctx.beginPath();
    ctx.fillStyle = wheelPrizes[i].color;
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, angle, angle + arcSize);
    ctx.lineTo(radius, radius);
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angle + arcSize / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(wheelPrizes[i].label, radius - 15, 5);
    ctx.restore();
  }
}

function spinDailyWheel() {
  if (isSpinning) return;
  const now = Date.now();
  const cooldowntime = 24 * 60 * 60 * 1000;

  if (now - state.lastWheelSpin < cooldowntime) {
    const remaining = cooldowntime - (now - state.lastWheelSpin);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    alert(`Aguarda ${hours}h ${mins}m para rodar novamente!`);
    return;
  }

  isSpinning = true;
  state.lastWheelSpin = now;
  let spinVelocity = Math.random() * 0.2 + 0.3;
  const friction = 0.985;

  function animateSpin() {
    wheelAngle += spinVelocity;
    spinVelocity *= friction;
    drawWheel();

    if (spinVelocity > 0.002) {
      requestAnimationFrame(animateSpin);
    } else {
      isSpinning = false;
      determineWheelWinner();
    }
  }
  animateSpin();
}

function determineWheelWinner() {
  const numOptions = wheelPrizes.length;
  const arcSize = (2 * Math.PI) / numOptions;
  let normalizedAngle = (1.5 * Math.PI - (wheelAngle % (2 * Math.PI))) % (2 * Math.PI);
  if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

  const winnerIndex = Math.floor(normalizedAngle / arcSize);
  applyWheelPrize(winnerIndex);
}

function applyWheelPrize(index) {
  playUpgradeSound();
  if (index === 0) { state.lollipops += 500; alert("Ganhaste +500 Pirulitos!"); }
  else if (index === 1) { startBoost(60, 3); alert("Ganhaste 3x Cliques durante 60s!"); }
  else if (index === 2) { state.lollipops += 5000; alert("Ganhaste +5.000 Pirulitos!"); }
  else if (index === 3) { triggerSugarRain(); alert("Ativaste a Chuva de Açúcar!"); }
  else if (index === 4) { state.lollipops += 25000; alert("GRANDE PRÉMIO! +25.000 Pirulitos!"); }
  else if (index === 5) { state.lollipops += 1000; alert("Ganhaste +1.000 Pirulitos!"); }
  updateUI();
}

/* MONETIZAÇÃO ADMOB / BOOST */
function watchRewardAd() {
  if (Date.now() < boostEndTime) {
    alert("O seu Bónus de 3x Cliques já está ativo!");
    return;
  }
  const duration = state.flavor === 'tuttifrutti' ? 45 : 30;
  if (confirm(`🎬 [MODO DE TESTE ADMOB]\n\nAssistir ao vídeo para ativar 3x Cliques por ${duration}s?`)) {
    startBoost(duration, 3);
  }
}

function startBoost(durationSeconds, multiplier) {
  boostMultiplier = multiplier;
  boostEndTime = Date.now() + (durationSeconds * 1000);

  if (boostInterval) clearInterval(boostInterval);

  boostInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((boostEndTime - Date.now()) / 1000));
    const adBtn = document.getElementById('btn-ad-boost');
    if (adBtn) {
      if (remaining > 0) {
        adBtn.innerText = `🔥 3X CLIQUES ATIVO (${remaining}s)`;
        adBtn.classList.add('active-boost');
      } else {
        const dur = state.flavor === 'tuttifrutti' ? '45s' : '30s';
        adBtn.innerText = `🎬 Assistir Vídeo (3x Cliques / ${dur})`;
        adBtn.classList.remove('active-boost');
        boostMultiplier = 1;
        clearInterval(boostInterval);
        updateUI();
      }
    }
  }, 1000);

  updateUI();
}

function setFlavor(flavorKey) {
  state.flavor = flavorKey;
  buildShopUI();
  updateUI();
}

function buildShopUI() {
  const isBoostActive = Date.now() < boostEndTime;
  const adDuration = state.flavor === 'tuttifrutti' ? '45s' : '30s';

  const flavorHTML = `
    <div class="flavor-section">
      <div class="flavor-title">🍓 Escolha o Sabor Principal</div>
      <div class="flavor-grid">
        <div class="flavor-card ${state.flavor === 'morango' ? 'active' : ''}" onclick="setFlavor('morango')">
          <div class="flavor-name">🍓 Morango</div>
          <div class="flavor-desc">5% Crit (3x)</div>
        </div>
        <div class="flavor-card ${state.flavor === 'menta' ? 'active' : ''}" onclick="setFlavor('menta')">
          <div class="flavor-name">🌿 Menta</div>
          <div class="flavor-desc">+25% Offline</div>
        </div>
        <div class="flavor-card ${state.flavor === 'tuttifrutti' ? 'active' : ''}" onclick="setFlavor('tuttifrutti')">
          <div class="flavor-name">🍬 Tutti-Frutti</div>
          <div class="flavor-desc">+15s Anúncio</div>
        </div>
      </div>
    </div>
  `;

  const adBtnHTML = `
    <button class="action-btn btn-ad ${isBoostActive ? 'active-boost' : ''}" id="btn-ad-boost" onclick="watchRewardAd()">
      ${isBoostActive ? '🔥 3X CLIQUES ATIVO' : `🎬 Assistir Vídeo (3x Cliques / ${adDuration})`}
    </button>
  `;

  paneShop.innerHTML = flavorHTML + adBtnHTML;

  for (const key in state.upgrades) {
    const up = state.upgrades[key];
    const cost = getUpgradeCost(key);

    const card = document.createElement('div');
    card.className = `upgrade-card ${state.lollipops < cost ? 'disabled' : ''}`;
    card.id = `up-${key}`;
    card.onclick = () => buyUpgrade(key);

    let desc = up.addClick > 0 ? `+${up.addClick} p/ clique` : `+${up.addPps} p/ seg`;

    card.innerHTML = `
      <div class="upgrade-icon">${up.icon}</div>
      <div class="upgrade-details">
        <div class="upgrade-title">${up.name} (${up.count})</div>
        <div class="upgrade-sub">${desc}</div>
      </div>
      <div class="upgrade-cost-tag">${formatNum(cost)} 🍭</div>
    `;
    paneShop.appendChild(card);
  }
}

function buildSkinsUI() {
  paneSkins.innerHTML = '';

  const title1 = document.createElement('div');
  title1.className = 'skin-section-title';
  title1.innerText = '🍭 Aparência do Clique';
  paneSkins.appendChild(title1);

  const grid1 = document.createElement('div');
  grid1.className = 'skin-grid';

  for (const key in skinOptions) {
    const item = skinOptions[key];
    const isUnlocked = state.unlockedSkins.includes(key);
    const isActive = state.currentSkin === key;

    const card = document.createElement('div');
    card.className = `skin-card ${isActive ? 'active' : ''} ${!isUnlocked && state.lollipops < item.cost ? 'disabled' : ''}`;
    card.onclick = () => selectSkin('skin', key);

    card.innerHTML = `
      <div class="skin-icon">${item.icon}</div>
      <div class="skin-name">${item.name}</div>
      <div class="${isUnlocked ? 'skin-status' : 'skin-cost'}">
        ${isActive ? 'EM USO' : isUnlocked ? 'USAR' : formatNum(item.cost) + ' 🍭'}
      </div>
    `;
    grid1.appendChild(card);
  }
  paneSkins.appendChild(grid1);

  const title2 = document.createElement('div');
  title2.className = 'skin-section-title';
  title2.innerText = '✨ Efeitos de Clique';
  paneSkins.appendChild(title2);

  const grid2 = document.createElement('div');
  grid2.className = 'skin-grid';

  for (const key in particleOptions) {
    const item = particleOptions[key];
    const isUnlocked = state.unlockedParticles.includes(key);
    const isActive = state.currentParticle === key;

    const card = document.createElement('div');
    card.className = `skin-card ${isActive ? 'active' : ''} ${!isUnlocked && state.lollipops < item.cost ? 'disabled' : ''}`;
    card.onclick = () => selectSkin('particle', key);

    card.innerHTML = `
      <div class="skin-icon">${item.icon}</div>
      <div class="skin-name">${item.name}</div>
      <div class="${isUnlocked ? 'skin-status' : 'skin-cost'}">
        ${isActive ? 'EM USO' : isUnlocked ? 'USAR' : formatNum(item.cost) + ' 🍭'}
      </div>
    `;
    grid2.appendChild(card);
  }
  paneSkins.appendChild(grid2);

  const title3 = document.createElement('div');
  title3.className = 'skin-section-title';
  title3.innerText = '🎨 Tema de Fundo';
  paneSkins.appendChild(title3);

  const grid3 = document.createElement('div');
  grid3.className = 'skin-grid';

  for (const key in themeOptions) {
    const item = themeOptions[key];
    const isUnlocked = state.unlockedThemes.includes(key);
    const isActive = state.currentTheme === key;

    const card = document.createElement('div');
    card.className = `skin-card ${isActive ? 'active' : ''} ${!isUnlocked && state.lollipops < item.cost ? 'disabled' : ''}`;
    card.onclick = () => selectSkin('theme', key);

    card.innerHTML = `
      <div class="skin-icon">${item.icon}</div>
      <div class="skin-name">${item.name}</div>
      <div class="${isUnlocked ? 'skin-status' : 'skin-cost'}">
        ${isActive ? 'EM USO' : isUnlocked ? 'USAR' : formatNum(item.cost) + ' 🍭'}
      </div>
    `;
    grid3.appendChild(card);
  }
  paneSkins.appendChild(grid3);
}

function selectSkin(type, key) {
  if (type === 'skin') {
    const item = skinOptions[key];
    if (!state.unlockedSkins.includes(key)) {
      if (state.lollipops >= item.cost) {
        state.lollipops -= item.cost;
        state.unlockedSkins.push(key);
        playUpgradeSound();
      } else return;
    }
    state.currentSkin = key;
    if (lollipopEl) lollipopEl.innerText = item.icon;
  } else if (type === 'particle') {
    const item = particleOptions[key];
    if (!state.unlockedParticles.includes(key)) {
      if (state.lollipops >= item.cost) {
        state.lollipops -= item.cost;
        state.unlockedParticles.push(key);
        playUpgradeSound();
      } else return;
    }
    state.currentParticle = key;
  } else if (type === 'theme') {
    const item = themeOptions[key];
    if (!state.unlockedThemes.includes(key)) {
      if (state.lollipops >= item.cost) {
        state.lollipops -= item.cost;
        state.unlockedThemes.push(key);
        playUpgradeSound();
      } else return;
    }
    state.currentTheme = key;
    applyTheme(item.cssClass);
  }

  buildSkinsUI();
  updateUI();
}

function applyTheme(cssClass) {
  const body = document.getElementById('gameBody');
  if (body) body.className = cssClass;
}

function buildAchievementsUI() {
  paneAchieve.innerHTML = '';
  for (const key in achievementList) {
    const item = achievementList[key];
    const isUnlocked = state.achievements[key];

    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : ''}`;

    card.innerHTML = `
      <div class="achievement-icon">${item.icon}</div>
      <div class="achievement-details">
        <div class="achievement-title">${item.name}</div>
        <div class="achievement-sub">${item.desc} (+1% Ganho Global)</div>
      </div>
      <div class="achievement-status">${isUnlocked ? '✓ OK' : '🔒'}</div>
    `;
    paneAchieve.appendChild(card);
  }
}

function checkAchievements() {
  if (state.manualClicks >= 1 && !state.achievements.click1) state.achievements.click1 = true;
  if (state.manualClicks >= 100 && !state.achievements.clicks100) state.achievements.clicks100 = true;
  if (state.totalEarned >= 1000 && !state.achievements.earn1k) state.achievements.earn1k = true;
  if (state.totalEarned >= 50000 && !state.achievements.earn50k) state.achievements.earn50k = true;
  if (state.upgrades.autolick.count >= 5 && !state.achievements.bots5) state.achievements.bots5 = true;
  if (state.goldenCaught >= 1 && !state.achievements.golden1) state.achievements.golden1 = true;
  if (state.bossesDefeated >= 1 && !state.achievements.boss1) state.achievements.boss1 = true;

  buildAchievementsUI();
}

function buyUpgrade(key) {
  const cost = getUpgradeCost(key);
  if (state.lollipops >= cost) {
    state.lollipops -= cost;
    state.upgrades[key].count++;
    playUpgradeSound();
    recalcStats();
    checkAchievements();
    updateUI();
    buildShopUI();
  }
}

function recalcStats() {
  let clickPower = 1;
  let ppsPower = 0;

  for (const key in state.upgrades) {
    const up = state.upgrades[key];
    clickPower += up.count * up.addClick;
    ppsPower += up.count * up.addPps;
  }

  state.perClick = clickPower;
  state.perSecond = ppsPower;
}

function updateUI() {
  if (scoreEl) scoreEl.innerText = formatNum(state.lollipops);
  if (ppsEl) ppsEl.innerText = `${formatNum(state.perSecond * getAchievementMultiplier())} por segundo`;

  for (const key in state.upgrades) {
    const card = document.getElementById(`up-${key}`);
    if (card) {
      const cost = getUpgradeCost(key);
      if (state.lollipops < cost) card.classList.add('disabled');
      else card.classList.remove('disabled');
    }
  }

  const gainPrestige = getPrestigeGain();
  const prestigeGainEl = document.getElementById('prestige-gain-display');
  if (prestigeGainEl) prestigeGainEl.innerText = `+${gainPrestige} ✨`;

  const prestigeCurrentEl = document.getElementById('prestige-current');
  if (prestigeCurrentEl) prestigeCurrentEl.innerText = state.prestigePoints;

  const prestigeTextEl = document.getElementById('prestige-boost-text');
  if (prestigeTextEl) prestigeTextEl.innerText = `+${(state.prestigePoints * 20)}%`;

  const achBoost = ((getAchievementMultiplier() - 1) * 100).toFixed(0);

  const bossStat = document.getElementById('stat-bosses');
  if (bossStat) bossStat.innerText = state.bossesDefeated;

  const prestigeLvlStat = document.getElementById('stat-prestige-lvl');
  if (prestigeLvlStat) prestigeLvlStat.innerText = state.prestigePoints;

  const totalEl = document.getElementById('stat-total');
  if (totalEl) totalEl.innerText = formatNum(state.totalEarned);

  const clicksEl = document.getElementById('stat-clicks');
  if (clicksEl) clicksEl.innerText = formatNum(state.manualClicks);

  const cpcEl = document.getElementById('stat-cpc');
  if (cpcEl) cpcEl.innerText = formatNum(getEffectiveClickPower());

  const goldenEl = document.getElementById('stat-golden');
  if (goldenEl) goldenEl.innerText = state.goldenCaught;

  const boostEl = document.getElementById('stat-achieve-boost');
  if (boostEl) boostEl.innerText = `+${achBoost}%`;
}

function spawnGoldenLollipop() {
  const golden = document.createElement('div');
  golden.className = 'golden-lollipop';
  golden.innerText = '🌟';
  document.body.appendChild(golden);

  golden.onclick = (e) => {
    e.stopPropagation();
    const bonus = Math.max(50, Math.floor(state.perSecond * 15 + getEffectiveClickPower() * 20));
    state.lollipops += bonus;
    state.totalEarned += bonus;
    state.goldenCaught++;
    playUpgradeSound();
    spawnParticles(e.clientX, e.clientY);
    createFloatingText(e.clientX, e.clientY, `BÔNUS! +${formatNum(bonus)}`);
    checkAchievements();
    golden.remove();
    updateUI();
  };

  setTimeout(() => { if (golden.parentNode) golden.remove(); }, 8000);
}

setInterval(() => {
  if (Math.random() < 0.6) spawnGoldenLollipop();
}, 45000);

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

  if (window.event && window.event.target) {
    window.event.target.classList.add('active');
  }
  const targetPane = document.getElementById(`pane-${tabName}`);
  if (targetPane) targetPane.classList.add('active');
}

function toggleSound() {
  state.sound = !state.sound;
  const btn = document.getElementById('btn-sound');
  if (btn) btn.innerText = `🔊 Som: ${state.sound ? 'LIGADO' : 'DESLIGADO'}`;
}

function toggleVibe() {
  state.vibration = !state.vibration;
  const btn = document.getElementById('btn-vibe');
  if (btn) btn.innerText = `📳 Vibração: ${state.vibration ? 'LIGADA' : 'DESLIGADA'}`;
}

function saveGame() {
  state.lastSave = Date.now();
  localStorage.setItem('lollipop_clicker_save', JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem('lollipop_clicker_save');
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };

    if (!state.unlockedSkins) state.unlockedSkins = ['lollipop'];
    if (!state.unlockedParticles) state.unlockedParticles = ['circles'];
    if (!state.unlockedThemes) state.unlockedThemes = ['purple'];
    if (!state.lastWheelSpin) state.lastWheelSpin = 0;
    if (!state.bossesDefeated) state.bossesDefeated = 0;
    if (!state.prestigePoints) state.prestigePoints = 0;

    recalcStats();
  }

  if (skinOptions[state.currentSkin] && lollipopEl) {
    lollipopEl.innerText = skinOptions[state.currentSkin].icon;
  }
  if (themeOptions[state.currentTheme]) {
    applyTheme(themeOptions[state.currentTheme].cssClass);
  }

  recalcStats();
  buildShopUI();
  buildSkinsUI();
  buildAchievementsUI();
  updateUI();
  setTimeout(drawWheel, 500);
}

function resetGame() {
  if (confirm("Tem certeza de que deseja reiniciar todo o seu progresso?")) {
    localStorage.removeItem('lollipop_clicker_save');
    location.reload();
  }
}

setInterval(() => {
  if (state.perSecond > 0) {
    const gain = state.perSecond * getAchievementMultiplier();
    state.lollipops += gain;
    state.totalEarned += gain;
    updateUI();
  }
}, 1000);

setInterval(saveGame, 10000);

loadGame();
