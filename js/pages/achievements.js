import { bootPage, format, setText } from "../ui/shared.js";
import { ACHIEVEMENTS_DATA } from "../data.js";
import { getAchievementProgress } from "../gameplay.js";

const runtime = await bootPage("achievements");
const list = document.getElementById("achievementsList");
const filterBar = document.getElementById("achievementFilters");
let selectedCategory = "Todas";

function badgeSVG(category) {
  const drawings = {
    Cliques:
      '<path d="M28 41V25a4 4 0 0 1 8 0v10-3a4 4 0 0 1 7 0v2a4 4 0 0 1 7 2v8c0 8-4 13-12 13-5 0-9-2-12-6l-8-10a4 4 0 0 1 6-5Z"/>',
    Produção:
      '<path d="M17 49V28l12 6V22l12 8V16h7v33Z"/><path d="M23 40h4m7 0h4m5 0h4" stroke="#38204b"/>',
    Coleção:
      '<path d="m19 22 13-7 13 7-13 7Z"/><path d="M19 25v16l13 8 13-8V25l-13 8Z"/>',
    Aventura:
      '<path d="m20 45 25-25 5-1-1 5-25 25Z"/><path d="m19 39 12 12m-14 1 6-6" stroke-width="5"/>',
  };
  return `<svg viewBox="0 0 64 64" role="presentation" aria-hidden="true"><path d="m32 3 24 13v28L32 59 8 44V16Z" fill="#51325e" stroke="#aa72aa" stroke-width="2"/><g fill="#efd39a" stroke="#efd39a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[category] || drawings.Coleção}</g></svg>`;
}

const categories = [
  "Todas",
  ...new Set(
    ACHIEVEMENTS_DATA.map(
      (achievement) =>
        getAchievementProgress(runtime.state, achievement.id).category,
    ),
  ),
];
filterBar.innerHTML = categories
  .map(
    (category) =>
      `<button type="button" class="game-button secondary${category === selectedCategory ? " active" : ""}" data-achievement-category="${category}" aria-pressed="${category === selectedCategory}">${category === "Coleção" ? "Receitas" : category}</button>`,
  )
  .join("");
list.innerHTML = ACHIEVEMENTS_DATA.map((achievement) => {
  const { category } = getAchievementProgress(runtime.state, achievement.id);
  return `<article class="achievement-tile" data-achievement="${achievement.id}" data-category="${category}">
    <span class="achievement-art">${badgeSVG(category)}</span>
    <div class="achievement-detail"><p class="item-rarity">${category === "Coleção" ? "Receitas" : category}</p><h3>${achievement.title}</h3><p>${achievement.desc}</p>
    <div class="progress-track" role="progressbar" aria-label="Progresso: ${achievement.title}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
    <p class="achievement-progress-label"></p></div><span class="achievement-state"></span>
  </article>`;
}).join("");

filterBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-achievement-category]");
  if (!button) return;
  selectedCategory = button.dataset.achievementCategory;
  for (const option of filterBar.querySelectorAll("button")) {
    const selected = option === button;
    option.classList.toggle("active", selected);
    option.setAttribute("aria-pressed", String(selected));
  }
  for (const tile of list.children)
    tile.hidden =
      selectedCategory !== "Todas" &&
      tile.dataset.category !== selectedCategory;
});

runtime.subscribe((state, info) => {
  setText(
    "achievementSummary",
    `${state.unlockedAchievements.length} de ${ACHIEVEMENTS_DATA.length} conquistas desbloqueadas`,
  );
  for (const achievement of ACHIEVEMENTS_DATA) {
    const tile = list.querySelector(`[data-achievement="${achievement.id}"]`);
    const unlocked = state.unlockedAchievements.includes(achievement.id);
    const { current, target } = getAchievementProgress(
      state,
      achievement.id,
      info.now,
    );
    const percent = unlocked
      ? 100
      : Math.min(100, Math.max(0, (current / target) * 100));
    tile.classList.toggle("unlocked", unlocked);
    tile.classList.toggle("locked", !unlocked);
    const bar = tile.querySelector(".progress-track");
    bar.setAttribute("aria-valuenow", String(Math.floor(percent)));
    bar.firstElementChild.style.width = `${percent}%`;
    const label = unlocked
      ? "Conquista permanente"
      : `${format(Math.min(current, target))} / ${format(target)}`;
    const progressLabel = tile.querySelector(".achievement-progress-label");
    if (progressLabel.textContent !== label) progressLabel.textContent = label;
    const status = tile.querySelector(".achievement-state");
    const statusText = unlocked ? "✓ Conquistado" : "Em progresso";
    if (status.textContent !== statusText) status.textContent = statusText;
  }
});
