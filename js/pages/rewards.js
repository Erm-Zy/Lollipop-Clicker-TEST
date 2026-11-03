import { bootPage, format, time, setText } from "../ui/shared.js";
import {
  WHEEL_REWARDS,
  WHEEL_COOLDOWN_MS,
  BOOST_COOLDOWN_MS,
} from "../data.js";
import { startWheel, startBoost } from "../gameplay.js";
const runtime = await bootPage("rewards");
const canvas = document.getElementById("wheelCanvas"),
  ctx = canvas.getContext("2d");
let frame = 0,
  lastResult = "",
  animating = "";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const target = (index) =>
  -Math.PI / 2 - ((index + 0.5) * Math.PI * 2) / WHEEL_REWARDS.length;
function draw(rotation = 0) {
  const n = canvas.width,
    c = n / 2,
    r = c - 12;
  ctx.clearRect(0, 0, n, n);
  WHEEL_REWARDS.forEach((reward, i) => {
    const arc = (Math.PI * 2) / WHEEL_REWARDS.length,
      a = rotation + i * arc;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, r, a, a + arc);
    ctx.closePath();
    ctx.fillStyle = reward.color;
    ctx.fill();
    ctx.strokeStyle = "#4b2456";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(a + arc / 2);
    ctx.fillStyle = "#fff9eb";
    ctx.font = "900 21px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(reward.short, r - 22, 6);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(c, c, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#fff0c9";
  ctx.fill();
  ctx.strokeStyle = "#4b2456";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#b4377e";
  ctx.textAlign = "center";
  ctx.font = "30px serif";
  ctx.fillText("✦", c, c + 10);
}
draw();
function animate(pending) {
  cancelAnimationFrame(frame);
  if (document.hidden || reduced.matches || !runtime.writable) return;
  function step() {
    if (!runtime.state.pendingWheel || document.hidden) return;
    const progress = Math.max(
      0,
      Math.min(
        1,
        (Date.now() - pending.startedAt) / (pending.endsAt - pending.startedAt),
      ),
    );
    draw((Math.PI * 12 + target(pending.index)) * (1 - (1 - progress) ** 4));
    if (progress < 1) frame = requestAnimationFrame(step);
  }
  frame = requestAnimationFrame(step);
}
document.getElementById("rewardLegend").innerHTML = WHEEL_REWARDS.map(
  (r) =>
    `<li><span style="background:${r.color}" aria-hidden="true"></span>${r.type === "pct" ? `${r.short} do saldo (mín. 100)` : r.label}</li>`,
).join("");
runtime.subscribe((state, info) => {
  const now = info.now || Date.now();
  const cooldown = state.lastWheelTime
    ? Math.max(0, state.lastWheelTime + WHEEL_COOLDOWN_MS - now)
    : 0;
  document.getElementById("spinBtn").disabled =
    !runtime.writable ||
    !runtime.canSave ||
    !!state.pendingWheel ||
    cooldown > 0;
  setText(
    "wheelTimer",
    state.pendingWheel
      ? "O destino está girando…"
      : cooldown
        ? `Novo giro em ${time(cooldown)}`
        : "Seu giro grátis está esperando.",
  );
  const signature = state.pendingWheel?.startedAt || "";
  if (signature !== animating) {
    animating = signature;
    if (state.pendingWheel) animate(state.pendingWheel);
    else cancelAnimationFrame(frame);
  }
  const result = state.lastWheelReward;
  if (result) {
    const key = JSON.stringify(result);
    if (key !== lastResult) {
      lastResult = key;
      draw(target(result.index));
      document.getElementById("wheelResult").hidden = false;
      setText(
        "wheelResult",
        `Último prêmio: ${result.type === "pct" ? `+${format(result.amount)} pirulitos` : result.label}`,
      );
    }
  } else if (!state.pendingWheel) draw();
  const boost = state.boostEndTime - now,
    boostWait = state.lastBoostTime
      ? Math.max(0, state.lastBoostTime + BOOST_COOLDOWN_MS - now)
      : 0;
  document.getElementById("adBoostBtn").disabled =
    !runtime.writable || boost > 0 || boostWait > 0;
  setText(
    "boostDescription",
    boost > 0
      ? `Bônus 2× ativo · ${time(boost)}`
      : boostWait
        ? `Novo bônus em ${time(boostWait)}`
        : "Produção e toques 2× por 30s · recarga de 5 min",
  );
});
document.getElementById("spinBtn").addEventListener("click", () => {
  const pending = runtime.act((state, now) => startWheel(state, now), {
    sound: "buy",
    requireSave: true,
  });
  if (pending) {
    document.getElementById("wheelResult").hidden = true;
    animate(pending);
  }
});
document.getElementById("adBoostBtn").addEventListener("click", () => {
  if (runtime.act((state, now) => startBoost(state, now), { sound: "win" }))
    runtime.notify(
      "Chuva de açúcar ativada! 30 segundos de produção e toques em dobro.",
    );
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) cancelAnimationFrame(frame);
  else if (runtime.state.pendingWheel) animate(runtime.state.pendingWheel);
});
window.addEventListener("pagehide", () => cancelAnimationFrame(frame));
