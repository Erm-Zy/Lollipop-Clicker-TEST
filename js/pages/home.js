import { WORLD_CHAPTERS, getWorldStage } from "../world.js";
import { bootPage, format, time, setText } from "../ui/shared.js";
import { mountShop } from "../ui/shop.js";
import { lollipopSVG, buildingSVG, worldSVG } from "../ui/art.js";
import * as game from "../gameplay.js";
import {
  UPGRADES_DATA,
  FLAVORS_DATA,
  ACHIEVEMENTS_DATA,
  BOOST_COOLDOWN_MS,
} from "../data.js";

const runtime = await bootPage("home");
const candy = document.getElementById("lollipop");
let candyLook = "",
  worldStage = -1,
  buildingSignature = "",
  pressAnimation;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
mountShop(
  runtime,
  document.getElementById("upgradesList"),
  document.getElementById("buyControls"),
  (key, result) => {
    setText(
      "worldLog",
      `${UPGRADES_DATA[key].name}: +${result.quantity} engenhoca${result.quantity > 1 ? "s" : ""} trabalhando!`,
    );
  },
);
runtime.subscribe((state, info) => {
  const now = info.now || Date.now();
  setText("scoreDisplay", format(state.pirulitos));
  setText("ppsDisplay", `${format(game.getPps(state, now))} /s`);
  setText(
    "clickPowerDisplay",
    `+${format(game.getClickPower(state, now))} por toque`,
  );
  setText("flavorName", FLAVORS_DATA[state.activeFlavor].name);
  candy.disabled = !runtime.writable;
  const look = `${state.activeFlavor}/${state.activeSkin}`;
  if (look !== candyLook) {
    candyLook = look;
    candy.innerHTML = lollipopSVG(state.activeFlavor, state.activeSkin);
  }
  const count = game.getTotalUpgradesCount(state);
  const stage = getWorldStage(state);
  if (stage !== worldStage) {
    worldStage = stage;
    document.getElementById("worldScene").innerHTML = worldSVG(stage);
    document.body.dataset.world = stage;
  }
  document.querySelector(".world-zone").classList.toggle("running", count > 0);
  setText("worldTitle", WORLD_CHAPTERS[stage].name);
  setText("mobileWorldName", WORLD_CHAPTERS[stage].name);
  setText("worldChapter", `CAPÍTULO 0${stage + 1}`);
  setText(
    "worldProgress",
    stage < 3
      ? `${count} / ${WORLD_CHAPTERS[stage + 1].minimum} engenhocas para expandir o mundo`
      : WORLD_CHAPTERS[stage].story,
  );
  setText(
    "buildingCount",
    `${format(count)} engenhoca${count !== 1 ? "s" : ""}`,
  );
  const signature = Object.values(state.upgrades).join("/");
  if (signature !== buildingSignature) {
    buildingSignature = signature;
    document.getElementById("buildingLots").innerHTML = Object.entries(
      UPGRADES_DATA,
    )
      .map(
        ([key, data]) =>
          `<a href="pages/shop.html#${key}" class="building-lot ${state.upgrades[key] ? "built running" : "locked"}" aria-label="${data.name}, ${state.upgrades[key]} possuídas"><span class="lot-art">${buildingSVG(key, state.upgrades[key])}</span><span class="lot-name">${data.name}</span><b>${state.upgrades[key] ? `×${format(state.upgrades[key])}` : "a descobrir"}</b></a>`,
      )
      .join("");
  }
  const next = ACHIEVEMENTS_DATA.find(
    (a) => !state.unlockedAchievements.includes(a.id),
  );
  setText(
    "nextAchievement",
    next ? next.title : "Todos os segredos descobertos!",
  );
  const boostLeft = state.boostEndTime - now;
  const cooldown = state.lastBoostTime
    ? Math.max(0, state.lastBoostTime + BOOST_COOLDOWN_MS - now)
    : 0;
  document.getElementById("adBoostBtn").disabled =
    !runtime.writable || boostLeft > 0 || cooldown > 0;
  setText(
    "boostTitle",
    boostLeft > 0 ? "Sua receita está turbinada!" : "Chuva de açúcar!",
  );
  setText(
    "boostDescription",
    boostLeft > 0
      ? `Produção e toques 2× · ${time(boostLeft)}`
      : cooldown
        ? `Recarga: ${time(cooldown)}`
        : "2× por 30 segundos · recarga de 5 min",
  );
  setText(
    "boostAction",
    boostLeft > 0 ? "2×" : cooldown ? "AGUARDE" : "ATIVAR",
  );
  const event = document.getElementById("sugarEvent");
  event.hidden = !state.sugarEvent || !runtime.writable;
});
candy.addEventListener("click", (e) => {
  const gain = runtime.act((state, now) => game.click(state, now), {
    sound: "click",
    persist: false,
  });
  if (gain) {
    const box = candy.getBoundingClientRect();
    runtime.effects?.spawn(
      e.detail ? e.clientX : box.x + box.width / 2,
      e.detail ? e.clientY : box.y + box.height / 2,
      `+${format(gain)}`,
    );
    if (!reducedMotion.matches) {
      pressAnimation?.cancel();
      pressAnimation = candy.animate(
        [
          { transform: "scale(.94,.91) rotate(-4deg)" },
          { transform: "scale(1.03,1.02) rotate(2deg)" },
          { transform: "scale(1)" },
        ],
        { duration: 170, easing: "ease-out" },
      );
    }
  }
});
document.getElementById("adBoostBtn").addEventListener("click", () => {
  if (
    runtime.act((state, now) => game.startBoost(state, now), { sound: "win" })
  )
    runtime.notify(
      "Chuva de açúcar! Produção e cliques em dobro por 30 segundos.",
    );
});
document.getElementById("sugarEvent").addEventListener("click", () => {
  const reward = runtime.act((state, now) => game.claimSugarEvent(state, now), {
    sound: "win",
  });
  if (reward) runtime.notify(`Cristal coletado! +${format(reward)} pirulitos.`);
});
