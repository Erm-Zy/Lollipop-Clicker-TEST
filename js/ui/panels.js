// Small home-only modal layer. Real HTML destinations stay as link fallbacks.
export function mountGamePanels(runtime) {
  const dialog = document.getElementById("gamePanel");
  const titles = {
    shop: ["LOJA DE ENGENHOCAS", "Mais doces, menos trabalho"],
    rewards: ["TENDA DOS DESEJOS", "Uma pitada de sorte"],
    world: ["SUA PRODUÇÃO", "Um mundo que cresce"],
  };
  let current = "",
    opener = null,
    closing = false;
  const signal = () =>
    document.dispatchEvent(
      new CustomEvent("lollipop:panel", {
        detail: { page: current, open: dialog.open },
      }),
    );
  function display(id, trigger) {
    if (!titles[id]) return;
    current = id;
    if (trigger) opener = trigger;
    dialog.dataset.panel = id;
    document.getElementById("gamePanelKicker").textContent = titles[id][0];
    document.getElementById("gamePanelTitle").textContent = titles[id][1];
    dialog
      .querySelectorAll("[data-panel-content]")
      .forEach((el) => (el.hidden = el.dataset.panelContent !== id));
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add("game-panel-open");
    document.getElementById("closeGamePanel").focus({ preventScroll: true });
    dialog.scrollTop = 0;
    dialog.style.setProperty(
      "--panel-header-height",
      dialog.querySelector(".panel-heading").offsetHeight + "px",
    );
    signal();
    const key = trigger?.dataset.focusUpgrade;
    if (key)
      dialog
        .querySelector(`[data-upgrade="${key}"]`)
        ?.scrollIntoView({ block: "center" });
  }
  function finish() {
    clearTimeout(feedbackTimer);
    document.getElementById("panelFeedback").hidden = true;
    closing = true;
    if (dialog.open) dialog.close();
    closing = false;
    current = "";
    document.documentElement.classList.remove("game-panel-open");
    signal();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function close() {
    if (history.state?.lollipopPanel) history.back();
    else finish();
  }
  function open(id, trigger) {
    if (!titles[id]) return;
    const state = { ...history.state, lollipopPanel: id };
    if (dialog.open) history.replaceState(state, "", `#${id}`);
    else history.pushState(state, "", `#${id}`);
    display(id, trigger);
  }
  let feedbackTimer;
  document.addEventListener("lollipop:toast", (event) => {
    if (!dialog.open) return;
    const feedback = document.getElementById("panelFeedback");
    feedback.textContent = event.detail.message;
    feedback.hidden = false;
    // Only the visible modal announces the operation; the background is inert.
    document.getElementById("toast").hidden = true;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => (feedback.hidden = true), 4500);
  });
  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-game-panel]");
    if (
      !control ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    open(control.dataset.gamePanel, control);
  });
  document.getElementById("closeGamePanel").addEventListener("click", close);
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const items = [
      ...dialog.querySelectorAll(
        "a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]",
      ),
    ].filter((el) => el.tabIndex >= 0 && el.getClientRects().length);
    const first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("close", () => {
    if (!closing) {
      if (history.state?.lollipopPanel) history.back();
      else finish();
    }
  });
  dialog.addEventListener("click", (event) => {
    const r = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom)
    )
      close();
  });
  window.addEventListener("popstate", () => {
    const id = history.state?.lollipopPanel;
    if (titles[id]) display(id);
    else finish();
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      const id = history.state?.lollipopPanel;
      if (titles[id]) display(id);
      else finish();
    }
  });
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => {
      if (dialog.open)
        dialog.style.setProperty(
          "--panel-header-height",
          dialog.querySelector(".panel-heading").offsetHeight + "px",
        );
    });
    observer.observe(dialog.querySelector(".panel-heading"));
    window.addEventListener(
      "pagehide",
      (event) => {
        if (!event.persisted) observer.disconnect();
      },
      { once: true },
    );
  }
  // The real PWA banner stays outside the modal; keep its availability visible
  // inside the active layer too, without duplicating activation controls.
  const updateNote = document.getElementById("panelUpdateNotice");
  let watchedBanner = null,
    bannerObserver = null;
  function followUpdateBanner() {
    const banner = document.getElementById("pwaUpdate");
    if (banner !== watchedBanner) {
      bannerObserver?.disconnect();
      watchedBanner = banner;
      if (banner) {
        bannerObserver = new MutationObserver(followUpdateBanner);
        bannerObserver.observe(banner, {
          attributes: true,
          attributeFilter: ["hidden"],
        });
      }
    }
    updateNote.hidden = !banner || banner.hidden;
  }
  const bannerRootObserver = new MutationObserver(followUpdateBanner);
  bannerRootObserver.observe(document.body, { childList: true });
  followUpdateBanner();
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      bannerRootObserver.disconnect();
      bannerObserver?.disconnect();
    }
  });
  const requested = location.hash.slice(1);
  if (titles[requested]) {
    if (history.state?.lollipopPanel) display(requested);
    else {
      history.replaceState(
        history.state,
        "",
        location.pathname + location.search,
      );
      open(requested);
    }
  }
  runtime.subscribe(() => {
    const p = document.getElementById("panelSaveStatus");
    p.hidden = runtime.writable && runtime.canSave && !runtime.error;
    p.textContent =
      document.getElementById("saveStatus").textContent +
      " · Abra Ajustes para exportar ou recuperar.";
  });
  return { open, close };
}
