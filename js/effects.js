import { SKINS_DATA } from './data.js';

export function createEffects(canvas, getState) {
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let particles = [];
  let frame = 0;
  let last = 0;
  function resize() {
    // CSS pixels keep memory and fill rate bounded even on high DPI phones.
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  function draw(now) {
    const step = Math.min(40, now - (last || now)) / 1000;
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.life -= step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      ctx.globalAlpha = Math.max(0, p.life / p.duration);
      ctx.fillStyle = p.color;
      if (p.text || p.symbol) {
        ctx.font = p.text ? 'bold 20px system-ui' : '17px system-ui';
        ctx.fillText(p.text || p.symbol, p.x, p.y);
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    particles = particles.filter(p => p.life > 0);
    frame = particles.length ? requestAnimationFrame(draw) : 0;
    if (!frame) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  return {
    spawn(x, y, text) {
      if (!ctx || reduced.matches || !getState().settings.particles || document.hidden) return;
      const key = getState().activeParticles;
      const skin = SKINS_DATA[key] || SKINS_DATA.classic;
      const symbols = { gold: '✨', cosmic: '⭐', fire: '🔥', ice: '❄️' };
      const additions = [];
      for (let i = 0; i < 5; i++) additions.push({
        x, y, vx: (Math.random() - 0.5) * 150, vy: -30 - Math.random() * 160,
        color: key === 'rainbow' ? `hsl(${Math.random() * 360} 85% 75%)` : skin.color,
        symbol: symbols[key], size: 2 + Math.random() * 3, duration: 0.65, life: 0.65
      });
      if (text) additions.push({ x: x - 20, y: y - 20, vx: 0, vy: -70, color: '#ffe5ac', text, duration: 0.8, life: 0.8 });
      particles = particles.concat(additions).slice(-60);
      if (!frame) { last = performance.now(); frame = requestAnimationFrame(draw); }
    },
    clear() { cancelAnimationFrame(frame); frame = 0; particles = []; ctx?.clearRect(0, 0, canvas.width, canvas.height); },
    dispose() { this.clear(); window.removeEventListener('resize', resize); }
  };
}
