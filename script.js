let state = {
  lollipops: 0,
  totalEarned: 0,
  manualClicks: 0,
  goldenCaught: 0,
  perClick: 1,
  perSecond: 0,
  sound: true,
  vibration: true,
  lastSave: Date.now(),
  upgrades: {
    finger:   { name: "Super Dedo",      icon: "👆", baseCost: 15,    count: 0, addClick: 1,  addPps: 0 },
    wrapper:  { name: "Embalagem Dupla", icon: "🍬", baseCost: 100,   count: 0, addClick: 5,  addPps: 0 },
    autolick: { name: "Licker Bot",      icon: "🤖", baseCost: 50,    count: 0, addClick: 0,  addPps: 1 },
    factory:  { name: "Fábrica Doce",    icon: "🏭", baseCost: 400,   count: 0, addClick: 0,  addPps: 12 },
    truck:    { name: "Caminhão Doce",   icon: "🚚", baseCost: 2000,  count: 0, addClick: 0,  addPps: 70 },
    planet:   { name: "Mundo do Açúcar", icon: "🪐", baseCost: 15000, count: 0, addClick: 0,  addPps: 450 }
  }
};

// Variáveis do Anúncio e Bónus 3x
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

lollipopEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  doClick(e.clientX, e.clientY);
});

function doClick(x, y) {
  // Aplica o multiplicador do bónus de anúncio (3x)
  const earned = state.perClick * boostMultiplier;
  state.lollipops += earned;
  state.totalEarned += earned;
  state.manualClicks++;

  playPopSound();
  if (state.vibration && navigator.vibrate) navigator.vibrate(10);

  spawnParticles(x, y);
  createFloatingText(x, y, `+${formatNum(earned)}`);
  updateUI();
}

function createFloatingText(x, y, text) {
  const el = document.createElement('div');
  el.className = 'click-text';
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

// LÓGICA DO VÍDEO RECOMPENSADO
function watchRewardAd() {
  if (Date.now() < boostEndTime) {
    alert("O seu Bónus de 3x Cliques já está ativo!");
    return;
  }

  // AQUI ENTRARÁ O SDK DO ADMOB / ADSENSE QUANDO FOR PARA PRODUÇÃO
  const watched = confirm("🎬 [SIMULAÇÃO DE ANÚNCIO]\n\nAssistir ao vídeo de 15s para ativar 3x Cliques por 30 segundos?");
  
  if (watched) {
    startBoost(30, 3);
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
        adBtn.innerText = `🎬 Assistir Vídeo (3x Cliques / 30s)`;
        adBtn.classList.remove('active-boost');
        boostMultiplier = 1;
        clearInterval(boostInterval);
        updateUI();
      }
    }
  }, 1000);

  updateUI();
}

function buildShopUI() {
  // Mantém o botão de anúncio no topo
  const adBtnHTML = `
    <button class="action-btn btn-ad ${Date.now() < boostEndTime ? 'active-boost' : ''}" id="btn-ad-boost" onclick="watchRewardAd()">
      ${Date.now() < boostEndTime ? '🔥 3X CLIQUES ATIVO' : '🎬 Assistir Vídeo (3x Cliques / 30s)'}
    </button>
  `;
  
  paneShop.innerHTML = adBtnHTML;

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

function buyUpgrade(key) {
  const cost = getUpgradeCost(key);
  if (state.lollipops >= cost) {
    state.lollipops -= cost;
    state.upgrades[key].count++;
    playUpgradeSound();
    recalcStats();
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
  ppsEl.innerText = `${formatNum(state.perSecond)} por segundo`;

  for (const key in state.upgrades) {
    const card = document.getElementById(`up-${key}`);
    if (card) {
      const cost = getUpgradeCost(key);
      if (state.lollipops < cost) card.classList.add('disabled');
      else card.classList.remove('disabled');
    }
  }

  document.getElementById('stat-total').innerText = formatNum(state.totalEarned);
  document.getElementById('stat-clicks').innerText = formatNum(state.manualClicks);
  document.getElementById('stat-cpc').innerText = formatNum(state.perClick * boostMultiplier);
  document.getElementById('stat-golden').innerText = state.goldenCaught;
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

  event.target.classList.add('active');
  document.getElementById(`pane-${tabName}`).classList.add('active');
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
      const offlineGain = Math.floor(offlineSecs * state.perSecond * 0.5);
      state.lollipops += offlineGain;
      state.totalEarned += offlineGain;
      alert(`Bem-vindo de volta! Enquanto esteve fora, seus assistentes produziram +${formatNum(offlineGain)} pirulitos!`);
    }
  }
  recalcStats();
  buildShopUI();
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
    state.lollipops += state.perSecond;
    state.totalEarned += state.perSecond;
    updateUI();
  }
}, 1000);

setInterval(saveGame, 10000);

loadGame();
