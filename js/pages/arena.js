import { bootPage, format, time, setText } from "../ui/shared.js";
import {
  startBoss,
  hitBoss,
  getBossMaxHp,
  getClickPower,
} from "../gameplay.js";
import { bossSVG } from "../ui/art.js";
import { BOSS_DURATION_MS, MAX_VALUE } from "../data.js";

const runtime = await bootPage("arena");
const avatar = document.getElementById("bossAvatar");
const start = document.getElementById("startBossBtn");
const stories = [
  [
    "Geleião do Pomar",
    "Ele se esconde entre as frutas e coleciona todo açúcar que encontra.",
  ],
  [
    "Capitão Caramelo",
    "Sua armadura de caramelo é dura. Seu orgulho é ainda mais duro.",
  ],
  [
    "Dragão de Suspiro",
    "Um sopro de glacê e uma montanha de doces guardada a sete chaves.",
  ],
];
let shownLevel = -1;
let previousBoss = null;
let previousVictories = runtime.state.bossesKilled;
const exact = new Intl.NumberFormat("pt-BR");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function render(state, info = {}) {
  const now = Math.max(info.now ?? Date.now(), state.lastTick);
  const boss = state.boss;
  const level = state.bossesKilled;
  const [name, story] = stories[level % stories.length];
  if (shownLevel !== level) {
    shownLevel = level;
    avatar.innerHTML = bossSVG(level);
    setText("bossName", name);
    setText("bossStory", story);
  }
  const max = boss?.maxHp || getBossMaxHp(state);
  const hp = boss?.hp ?? max;
  const fraction = Math.max(0, Math.min(1, hp / max));
  document.getElementById("bossHpBar").style.width = `${fraction * 100}%`;
  document
    .querySelector(".boss-hp-track")
    .setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  setText(
    "bossLevel",
    `GUARDIÃO ${level + 1} · ${state.bossesKilled} VITÓRIAS`,
  );
  setText("bossHpText", `${format(hp)} / ${format(max)} HP`);
  setText(
    "bossTimer",
    boss
      ? `Tempo restante: ${time(boss.endsAt - now)}`
      : `${BOSS_DURATION_MS / 1000} segundos para vencer`,
  );
  setText("bossDamage", `Seu ataque: ${format(getClickPower(state, now))}`);
  const reward = Math.min(MAX_VALUE, Math.floor(max * 15));
  setText("bossReward", `Vitória: ${format(reward)} doces`);
  document.getElementById("bossReward").title = `Recompensa de vitória: ${exact.format(reward)} doces, limitada ao espaço disponível no saldo.`;
  const cooldown = Math.max(0, (state.bossCooldownUntil || 0) - now);
  start.disabled = !runtime.writable || Boolean(boss) || cooldown > 0;
  avatar.disabled = !runtime.writable || !boss;
  avatar.classList.toggle("fighting", Boolean(boss));
  avatar.setAttribute("aria-label", `Atacar ${name} · ${format(getClickPower(state, now))} de dano por toque`);
  setText("bossHint", boss
    ? "Toque no guardião ou use Espaço e Enter. Vença antes que o tempo acabe para receber a recompensa."
    : cooldown > 0
      ? `Próximo desafio em ${time(cooldown)}. Sua fábrica continua produzindo durante o descanso.`
      : "Confira a recompensa e desafie o guardião. A batalha só começa quando você escolher.");
  setText(
    "startBossBtn",
    boss
      ? "Batalha em andamento"
      : cooldown > 0
        ? `Descanso dos guardiões · ${time(cooldown)}`
        : "Desafiar guardião",
  );
  if (previousBoss && !boss && state.bossesKilled === previousVictories && now >= previousBoss.endsAt) {
    const result = document.getElementById("battleResult");
    if (result.hidden) {
      setText(
        "battleResult",
        "O tempo acabou! O guardião escapou. Sua fábrica segue crescendo — volte mais forte.",
      );
      result.hidden = false;
    }
  }
  previousBoss = boss ? { endsAt: boss.endsAt } : null;
  previousVictories = state.bossesKilled;
}

start.addEventListener("click", () => {
  if (runtime.act((state, now) => startBoss(state, now), { sound: "click" })) {
    document.getElementById("battleResult").hidden = true;
    runtime.notify("O desafio começou! Toque no guardião para atacar.");
    avatar.focus({ preventScroll: true });
  }
});
avatar.addEventListener("click", (event) => {
  if (avatar.disabled) return;
  const result = runtime.act((state, now) => hitBoss(state, now), {
    sound: "click",
    persist: false,
  });
  if (!result) return;
  const rect = avatar.getBoundingClientRect();
  runtime.effects?.spawn(
    event.detail ? event.clientX : rect.left + rect.width / 2,
    event.detail ? event.clientY : rect.top + rect.height / 2,
    `−${format(result.damage)}`,
  );
  if (!reducedMotion.matches && runtime.state.settings.animations && !runtime.state.settings.reducedMotion) {
    avatar.classList.remove("hit");
    requestAnimationFrame(() => avatar.classList.add("hit"));
  }
  if (result.won) {
    runtime.flush();
    const message = `Vitória! +${format(result.reward)} doces. O próximo guardião já ouviu falar de você.`;
    setText("battleResult", message);
    document.getElementById("battleResult").hidden = false;
    runtime.notify(message);
    runtime.audio.play("win");
  }
});
avatar.addEventListener("animationend", () => avatar.classList.remove("hit"));
runtime.subscribe(render);
