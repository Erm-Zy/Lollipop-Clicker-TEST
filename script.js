let state = {
  lollipops: 0,
  totalEarned: 0,
  manualClicks: 0,
  goldenCaught: 0,
  perClick: 1,
  perSecond: 0,
  flavor: 'none', // 'morango', 'menta', 'tuttifrutti'
  sound: true,
  vibration: true,
  lastSave: Date.now(),
  achievements: {
    click1: false,
    clicks100: false,
    earn1k: false,
    earn50k: false,
    bots5: false,
    golden1: false
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

const achievementList = {
  click1:   { name: "Primeira Toque", desc: "Dê o seu primeiro clique", icon: "👆" },
  clicks100: { name: "Dedos Rápidos", desc: "Faça 100 cliques manuais", icon: "⚡" },
  earn1k:   { name: "Colecionador Doce", desc: "Acumule 1.000 pirulitos no total", icon: "🍬" },
  earn50k:  { name: "Império do Açúcar", desc: "Acumule 50.000 pirulitos no total", icon: "👑" },
  bots5:    { name: "Automação", desc: "Compre 5 Licker Bots", icon: "🤖" },
  golden1:  { name: "Sorte Dourada", desc: "Apanhe 1 Pirulito Dourado", icon: "🌟" }
};

let boostMultiplier = 1;
let boostEndTime = 0;
let boostInterval = null;

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
  for (let i = 0; i < 8; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1
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
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();

    if (p.alpha <= 0) particles.splice(i, 1);
  }
  requestAnimationFrame(updateParticles);
}
requestAnimationFrame(updateParticles);

const scoreEl = document.getElementById('score');
const ppsEl = document.getElementById('pps');
const lollipopEl = document.getElementById('lollipop');
const paneShop = document.getElementById('pane-shop');
const paneAchieve = document.getElementById('pane-achievements');

lollipopEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  doClick(e.clientX, e.clientY);
});

function getAchievementMultiplier() {
  let count = 0;
  for (const key in state.achievements) {
    if (state.achievements[key]) count++;
  }
  return 1 + (count * 0.01); // +1% por conquista
}

function doClick(x, y) {
  let earned = state.perClick * boostMultiplier * getAchievementMultiplier();
  let isCrit = false;

  // Sabor Morango: 5% de hipóteses de Clique Crítico (3x)
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

function watchRewardAd() {
  if (Date.now() < boostEndTime) {
    alert("O seu Bónus de 3x Cliques já está ativo!");
    return;
  }

  const duration = state.flavor === 'tuttifrutti' ? 45 : 30;
  const watched = confirm(`🎬 [MODO DE TESTE ADMOB]\n\nAssistir ao vídeo de teste para ativar 3x Cliques por ${duration} segundos?`);
  if (watched) {
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
  scoreEl.innerText = formatNum(state.lollipops);
  ppsEl.innerText = `${formatNum(state.perSecond * getAchievementMultiplier())} por segundo`;

  for (const key in state.upgrades) {
    const card = document.getElementById(`up-${key}`);
    if (card) {
      const cost = getUpgradeCost(key);
      if (state.lollipops < cost) card.classList.add('disabled');
      else card.classList.remove('disabled');
    }
  }

  const achBoost = ((getAchievementMultiplier() - 1) * 100).toFixed(0);

  document.getElementById('stat-total').innerText = formatNum(state.totalEarned);
  document.getElementById('stat-clicks').innerText = formatNum(state.manualClicks);
  document.getElementById('stat-cpc').innerText = formatNum(state.perClick * boostMultiplier * getAchievementMultiplier());
  document.getElementById('stat-golden').innerText = state.goldenCaught;
  document.getElementById('stat-achieve-boost').innerText = `+${achBoost}%`;
}

function spawnGoldenLollipop() {
  const golden = document.createElement('div');
  golden.className = 'golden-lollipop';
  golden.innerText = '🌟';
  document.body.appendChild(golden);

  golden.onclick = (e) => {
    e.stopPropagation();
    const bonus = Math.max(50, Math.floor(state.perSecond * 15 + state.perClick * 20));
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
  document.getElementById('btn-sound').innerText = `🔊 Som: ${state.sound ? 'LIGADO' : 'DESLIGADO'}`;
}

function toggleVibe() {
  state.vibration = !state.vibration;
  document.getElementById('btn-vibe').innerText = `📳 Vibração: ${state.vibration ? 'LIGADA' : 'DESLIGADA'}`;
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
    
    const now = Date.now();
    const offlineSecs = Math.floor((now - (state.lastSave || now)) / 1000);
    recalcStats();
    
    if (offlineSecs > 5 && state.perSecond > 0) {
      // Menta dá +25% no ganho offline (0.75 vs 0.50)
      const offlineRate = state.flavor === 'menta' ? 0.75 : 0.50;
      const offlineGain = Math.floor(offlineSecs * state.perSecond * offlineRate);
      state.lollipops += offlineGain;
      state.totalEarned += offlineGain;
      alert(`Bem-vindo de volta! Enquanto esteve fora, produziste +${formatNum(offlineGain)} pirulitos!`);
    }
  }
  recalcStats();
  buildShopUI();
  buildAchievementsUI();
  updateUI();
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
