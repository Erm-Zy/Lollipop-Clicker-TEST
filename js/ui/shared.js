import { initializeUpdates } from "../pwa/update.js";
import { configuredArtworkPaths } from "./assets.js";
import { createRuntime } from "../core/runtime.js";
import { getPps, getClickPower } from "../gameplay.js";
import { FLAVORS_DATA } from "../data.js";
import { createEffects } from "../effects.js";

import { format, exact } from "../format.js";
export { format } from "../format.js";
export function time(ms) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
export function setText(id, value) {
  setNodeText(document.getElementById(id), value);
}
export function setNodeText(element, value) {
  if (element && element.textContent !== String(value))
    element.textContent = value;
}
export function icon(name, className = "nav-icon") {
  const paths = {
    home: '<path d="m4 11 8-8 8 8v10h-6v-6h-4v6H4Z"/>',
    shop: '<path d="M3 8h18l-2-5H5ZM5 8v13h14V8M9 21v-7h6v7M3 8c0 4 5 4 5 0 0 4 4 4 4 0 0 4 4 4 4 0 0 4 5 4 5 0"/>',
    pets: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="3" cy="12" r="2"/><circle cx="21" cy="12" r="2"/><path d="M6 19c0-9 12-9 12 0 0 5-4 1-6 1s-6 4-6-1Z"/>',
    collection:
      '<path d="M3 12h18c0 10-18 10-18 0ZM6 21h12M8 9c-4-4 4-3 0-7m8 7c-4-4 4-3 0-7"/>',
    arena:
      '<path d="m4 3 17 17M20 3 3 20M3 3l1 6 5-5ZM21 3l-1 6-5-5ZM2 17l5 5M17 22l5-5"/>',
    prestige: '<path d="m3 7 5 4 4-8 4 8 5-4-3 13H6ZM6 23h12"/>',
    achievements:
      '<path d="M7 3h10v8a5 5 0 0 1-10 0ZM7 5H3v4c0 3 2 4 5 4m9-8h4v4c0 3-2 4-5 4M12 16v5M7 22h10"/>',
    statistics: '<path d="M4 3h16v19H4ZM8 8h8M8 12h8M8 16h4"/>',
    rewards:
      '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18M6 6l12 12M6 18 18 6"/><circle cx="12" cy="12" r="2"/>',
    settings:
      '<path d="m9 3-1 3-3 1-2 4 2 4 3 1 1 3h6l1-3 3-1 2-4-2-4-3-1-1-3Z"/><circle cx="12" cy="11" r="3"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  };
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.home}</svg>`;
}
const labels = {
  home: "Mundo",
  shop: "Loja",
  collection: "Receitas",
  pets: "Pets",
  arena: "Arena",
  prestige: "Prestígio",
  achievements: "Conquistas",
  statistics: "Diário",
  rewards: "Roleta",
  settings: "Ajustes",
};
export function hrefFor(page) {
  const nested = document.body.dataset.page !== "home";
  return page === "home"
    ? `${nested ? "../" : "./"}index.html`
    : `${nested ? "./" : "pages/"}${page}.html`;
}
function navLink(page, current, extra = "") {
  return `<a href="${hrefFor(page)}" class="hud-tile tone-${page} ${page === current ? "active" : ""} ${extra}" ${page === current ? 'aria-current="page"' : ""}>${icon(page)}<span>${labels[page]}</span></a>`;
}
const primaryPages = ["home", "shop", "pets"];
function moreMenu(page, suffix) {
  const secondary = !primaryPages.includes(page);
  return `<details class="more-menu ${secondary ? "current-section" : ""}"><summary class="hud-tile tone-more" aria-expanded="false" aria-controls="more-${suffix}" aria-label="Mais locais${secondary ? `: ${labels[page]}` : ""}">${icon("more")}<span>Mais${secondary ? ` · ${labels[page]}` : ""}</span></summary><div class="more-links" id="more-${suffix}"><strong>Explore seu mundo</strong>${Object.keys(
    labels,
  )
    .filter((id) => !primaryPages.includes(id))
    .map((id) => navLink(id, page))
    .join("")}</div></details>`;
}
function bindMenus() {
  const menus = [...document.querySelectorAll(".more-menu")];
  for (const menu of menus) {
    menu.addEventListener("toggle", () => {
      menu
        .querySelector("summary")
        .setAttribute("aria-expanded", String(menu.open));
      if (menu.open)
        for (const other of menus) if (other !== menu) other.open = false;
    });
  }
  document.addEventListener("click", (event) => {
    for (const menu of menus)
      if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
      for (const menu of menus)
        if (menu.open) {
          menu.open = false;
          menu.querySelector("summary").focus();
          event.preventDefault();
        }
  });
}
export async function bootPage(page) {
  document.body.dataset.page = page;
  const utility = (id) => navLink(id, page, "utility-tile");
  document.getElementById("gameHeader").innerHTML = `
    <a class="skip-link" href="#${document.querySelector("main")?.id || "mainContent"}">Pular para o jogo</a>
    <div class="game-header game-hud-top"><nav class="hud-utility utility-left" aria-label="Conquistas">${utility("achievements")}</nav>
    <a class="brand" ${page === "home" ? 'aria-current="page"' : ""} href="${hrefFor("home")}" aria-label="Lollipop Clicker, voltar ao Mundo"><span class="brand-candy" aria-hidden="true">✦</span><span>Lollipop<small>CLICKER</small></span></a>
    ${page !== "home" ? '<div class="header-wallet"><span class="wallet-mark" aria-hidden="true">◆</span><b data-balance>0</b><small>doces</small></div>' : ""}
    <nav class="hud-utility utility-right" aria-label="Ajustes">${utility("settings")}</nav></div>
    <div class="world-status"><span class="save-indicator" id="saveStatus">Preparando sua fábrica…</span><span id="headerBonus">Feito de açúcar e aventura.</span></div>
    <div id="ownershipNotice" class="ownership-notice" role="status" hidden></div>`;
  document.getElementById("bottomNav").innerHTML =
    `<div class="bottom-nav game-dock">${
      page === "home"
        ? ["prestige", "arena", "collection", "statistics"]
            .map((id) => navLink(id, page))
            .join("")
        : primaryPages.map((id) => navLink(id, page)).join("") +
          moreMenu(page, "game")
    }</div>`;
  document
    .getElementById("bottomNav")
    .setAttribute("aria-label", "Destinos do jogo");
  bindMenus();
  const header = document.getElementById("gameHeader");
  const measureHeader = () =>
    document.documentElement.style.setProperty(
      "--hud-height",
      `${header.offsetHeight}px`,
    );
  measureHeader();
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(measureHeader);
    observer.observe(header);
    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) observer.disconnect();
      },
      { once: true },
    );
  }
  let toastTimer;
  const toast = document.getElementById("toast");
  document.addEventListener("lollipop:toast", (event) => {
    if (!toast) return;
    toast.textContent = event.detail.message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 4500);
  });
  const runtime = await createRuntime();
  if (document.getElementById("fxCanvas"))
    runtime.effects = createEffects(
      document.getElementById("fxCanvas"),
      () => runtime.state,
    );
  let appearance = "";
  runtime.subscribe((state, info) => {
    const now = info.now || Date.now();
    const signature = `${state.activeTheme}/${state.activeFlavor}/${state.settings.animations}/${state.settings.reducedMotion}`;
    if (appearance !== signature) {
      appearance = signature;
      document.body.dataset.theme = state.activeTheme;
      document.body.dataset.flavor = state.activeFlavor;
      document.body.dataset.motion =
        state.settings.animations && !state.settings.reducedMotion
          ? "on"
          : "off";
    }
    document.body.dataset.readonly = String(!runtime.writable);
    document.querySelectorAll("[data-balance]").forEach((el) => {
      const value = format(state.pirulitos);
      if (el.textContent !== value) el.textContent = value;
      el.title = `${exact(state.pirulitos)} doces`;
    });
    document.querySelectorAll("[data-pps]").forEach((el) => {
      const value = `${format(getPps(state, now))} /s`;
      if (el.textContent !== value) el.textContent = value;
    });
    setText(
      "saveStatus",
      runtime.updating
        ? "Preparando atualização…"
        : !runtime.writable
          ? "Outra aba está jogando"
          : !runtime.canSave
            ? "Save protegido · veja Ajustes"
            : runtime.error
              ? "Falha ao salvar · exporte nos Ajustes"
              : "Salvo neste navegador",
    );
    setText(
      "headerBonus",
      state.boostEndTime > now
        ? `Açúcar em dobro! 2× · ${time(state.boostEndTime - now)}`
        : `Receita ativa: ${FLAVORS_DATA[state.activeFlavor].name} · +${format(getClickPower(state, now))} por toque`,
    );
    document.body.dataset.saveWarning = String(
      !runtime.writable || !runtime.canSave || !!runtime.error,
    );
    const notice = document.getElementById("ownershipNotice");
    notice.hidden =
      runtime.updating ||
      (runtime.writable && runtime.canSave && !runtime.error);
    const message = !runtime.writable
      ? `Este mundo está aberto em outra aba. Feche a outra aba e <a href="${location.href}">recarregue aqui</a> para jogar. Você ainda pode consultar suas receitas e exportar o save.`
      : `O salvamento está bloqueado ou protegido. Exporte esta sessão antes de sair ou trocar de página. <button id="exportSessionBtn" class="game-button secondary">Exportar esta sessão ↓</button> Abra <a href="${hrefFor("settings")}">Ajustes</a> para recuperar o save original.`;
    if (notice.innerHTML !== message) notice.innerHTML = message;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) runtime.effects?.clear();
  });
  document
    .getElementById("ownershipNotice")
    .addEventListener("click", (event) => {
      if (!event.target.closest("#exportSessionBtn")) return;
      const blob = new Blob([JSON.stringify(runtime.state, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "lollipop-sessao-atual.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      runtime.notify(
        "Sessão exportada. Você pode importar esse arquivo quando o armazenamento estiver disponível.",
      );
    });
  initializeUpdates(runtime);
  const artworkPaths = configuredArtworkPaths();
  if (
    artworkPaths.length &&
    "serviceWorker" in navigator &&
    !globalThis.Capacitor?.isNativePlatform?.()
  ) {
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.active?.postMessage({
          type: "lollipop:cache-art",
          paths: artworkPaths,
        }),
      )
      .catch(() => {});
  }
  if (runtime.loaded.prestigeReset) {
    const notice = document.createElement("aside");
    notice.className = "beta-reset-notice";
    const title = document.createElement("strong");
    title.textContent = "Nova progressão de Prestígio na beta";
    const message = document.createElement("p");
    message.textContent = runtime.loaded.warnings[0];
    const link = document.createElement("a");
    link.href = hrefFor("settings");
    link.textContent = "Exportar o backup antigo nos Ajustes";
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Fechar aviso";
    close.addEventListener("click", () => notice.remove());
    notice.append(title, message, link, close);
    document.getElementById("gameHeader").append(notice);
  }
  if (runtime.loaded.warnings.length)
    runtime.notify(runtime.loaded.warnings.join(" "));
  else if (
    runtime.loaded.offlineElapsed >= 60000 &&
    runtime.loaded.offlineEarned > 0
  )
    runtime.notify(
      `Enquanto você explorava: +${format(runtime.loaded.offlineEarned)} pirulitos produzidos!`,
    );
  return runtime;
}
