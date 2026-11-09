import { bootPage, format, setText } from "../ui/shared.js";
import { exact } from "../format.js";
import { ACHIEVEMENTS_DATA } from "../data.js";
import { getAchievementProgress } from "../gameplay.js";
import { achievementSVG, sanctuaryHeader } from "../ui/cartoon.js";

const runtime = await bootPage("achievements");
document.getElementById("sanctuaryHeader").innerHTML =
  sanctuaryHeader("achievements");
const list = document.getElementById("achievementsList"),
  filterBar = document.getElementById("achievementFilters");
const categories = new Map(
  ACHIEVEMENTS_DATA.map((a) => [
    a.id,
    getAchievementProgress(runtime.state, a.id).category,
  ]),
);
let selected = ACHIEVEMENTS_DATA[0].id,
  selectedCategory = "Todas";
filterBar.innerHTML = ["Todas", ...new Set(categories.values())]
  .map(
    (c) =>
      `<button type="button" class="item-preview" data-achievement-category="${c}" aria-pressed="${c === "Todas"}">${c === "Coleção" ? "Receitas" : c}</button>`,
  )
  .join("");
list.innerHTML = ACHIEVEMENTS_DATA.map(
  (a) =>
    `<button type="button" class="achievement-tile" data-achievement="${a.id}" data-category="${categories.get(a.id)}" aria-pressed="${a.id === selected}" aria-controls="achievementDetail"><span class="achievement-art">${achievementSVG(a.id)}</span><span class="badge-award" aria-hidden="true"></span><span class="badge-caption">${a.title}</span></button>`,
).join("");
function select(id) {
  selected = id;
  for (const b of list.children)
    b.setAttribute("aria-pressed", String(b.dataset.achievement === id));
  document.getElementById("achievementDetailArt").innerHTML =
    achievementSVG(id);
  render(runtime.state, { now: Date.now() });
}
filterBar.addEventListener("click", (event) => {
  const b = event.target.closest("[data-achievement-category]");
  if (!b) return;
  selectedCategory = b.dataset.achievementCategory;
  for (const option of filterBar.children)
    option.setAttribute("aria-pressed", String(option === b));
  for (const tile of list.children)
    tile.hidden =
      selectedCategory !== "Todas" &&
      tile.dataset.category !== selectedCategory;
  if (list.querySelector(`[data-achievement="${selected}"]`).hidden)
    select([...list.children].find((b) => !b.hidden).dataset.achievement);
});
list.addEventListener("click", (event) => {
  const b = event.target.closest("[data-achievement]");
  if (b) select(b.dataset.achievement);
});
list.addEventListener("keydown", (event) => {
  if (
    ![
      "ArrowRight",
      "ArrowLeft",
      "ArrowDown",
      "ArrowUp",
      "Home",
      "End",
    ].includes(event.key)
  )
    return;
  const tiles = [...list.children].filter((b) => !b.hidden),
    i = tiles.indexOf(document.activeElement);
  if (i < 0) return;
  const top = tiles[0].getBoundingClientRect().top,
    columns = tiles.filter(
      (b) => Math.abs(b.getBoundingClientRect().top - top) < 2,
    ).length;
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tiles.length - 1
        : i +
          (event.key === "ArrowRight"
            ? 1
            : event.key === "ArrowLeft"
              ? -1
              : event.key === "ArrowDown"
                ? columns
                : -columns);
  event.preventDefault();
  const target = tiles[Math.max(0, Math.min(tiles.length - 1, next))];
  target.focus();
  select(target.dataset.achievement);
});
function render(state, info) {
  const unlockedIds = new Set(state.unlockedAchievements);
  setText(
    "achievementSummary",
    `${ACHIEVEMENTS_DATA.filter((a) => unlockedIds.has(a.id)).length} de ${ACHIEVEMENTS_DATA.length} desbloqueadas`,
  );
  for (const a of ACHIEVEMENTS_DATA) {
    const b = list.querySelector(`[data-achievement="${a.id}"]`),
      unlocked = unlockedIds.has(a.id);
    b.classList.toggle("unlocked", unlocked);
    b.classList.toggle("locked", !unlocked);
    const label = `${a.title}. ${unlocked ? "Conquistado" : "Ainda bloqueado"}. Ver progresso.`;
    if (b.getAttribute("aria-label") !== label)
      b.setAttribute("aria-label", label);
    const status = b.querySelector(".badge-award"),
      mark = unlocked ? "✓" : "⌑";
    if (status.textContent !== mark) status.textContent = mark;
  }
  const a = ACHIEVEMENTS_DATA.find((a) => a.id === selected),
    unlocked = unlockedIds.has(a.id),
    p = getAchievementProgress(state, a.id, info.now);
  setText("achievementTitle", a.title);
  setText("achievementRequirement", a.desc);
  const percent = unlocked
      ? 100
      : Math.min(100, Math.max(0, (p.current / p.target) * 100)),
    bar = document.getElementById("achievementProgress");
  bar.setAttribute("aria-label", `Progresso: ${a.title}`);
  bar.setAttribute("aria-valuenow", String(Math.floor(percent)));
  bar.setAttribute(
    "aria-valuetext",
    `${exact(Math.min(p.current, p.target))} de ${exact(p.target)}${unlocked ? ", conquistado" : ""}`,
  );
  bar.firstElementChild.style.width = percent + "%";
  setText(
    "achievementProgressLabel",
    `${format(Math.min(p.current, p.target))} / ${format(p.target)}`,
  );
  setText(
    "achievementStatus",
    unlocked ? "✓ Conquistado · permanente" : "Em progresso",
  );
  document
    .getElementById("achievementDetail")
    .classList.toggle("unlocked", unlocked);
}
document.getElementById("achievementDetailArt").innerHTML =
  achievementSVG(selected);
runtime.subscribe(render);
