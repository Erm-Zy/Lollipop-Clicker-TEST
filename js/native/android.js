import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
if (Capacitor.isNativePlatform()) {
  const files = registerPlugin("BetaFiles");
  const stateChange = ({ isActive }) =>
    document.dispatchEvent(
      new CustomEvent(
        isActive ? "lollipop:native-resume" : "lollipop:native-pause",
      ),
    );
  const back = ({ canGoBack }) => {
    const menu = document.querySelector("details[open]");
    if (menu) {
      menu.open = false;
      return;
    }
    document.dispatchEvent(new CustomEvent("lollipop:native-pause"));
    if (canGoBack) {
      history.back();
      return;
    }
    if (
      !location.pathname.endsWith("/index.html") &&
      location.pathname !== "/"
    ) {
      location.href = "../index.html";
      return;
    }
    if (confirm("Sair do mundo dos doces? Seu progresso será guardado."))
      App.exitApp();
    else document.dispatchEvent(new CustomEvent("lollipop:native-resume"));
  };
  let subscriptions = [];
  function listen() {
    subscriptions = [
      App.addListener("appStateChange", stateChange),
      App.addListener("backButton", back),
    ];
  }
  listen();
  window.addEventListener("pagehide", () => {
    for (const subscription of subscriptions)
      subscription.then((handle) => handle.remove());
    subscriptions = [];
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) listen();
  });
  document.addEventListener(
    "lollipop:state",
    () => requestAnimationFrame(() => SplashScreen.hide().catch(() => {})),
    { once: true },
  );
  setTimeout(() => SplashScreen.hide().catch(() => {}), 12000);
  // Each touch pointer counts once, including simultaneous fingers. Compatibility clicks are suppressed.
  const touched = new WeakMap();
  document.addEventListener(
    "pointerdown",
    (event) => {
      const button = event.target.closest?.("#lollipop,#bossAvatar");
      if (!button || button.disabled) return;
      if (event.pointerType !== "touch") {
        touched.delete(button);
        return;
      }
      event.preventDefault();
      touched.set(button, performance.now());
      button.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          clientX: event.clientX,
          clientY: event.clientY,
          detail: 1,
        }),
      );
    },
    { passive: false },
  );
  document.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest?.("#lollipop,#bossAvatar");
      if (
        button &&
        event.isTrusted &&
        event.detail > 0 &&
        performance.now() - (touched.get(button) ?? -10000) < 1000
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith("blob:")) {
      fetch(this.href)
        .then((r) => r.text())
        .then((content) => files.exportSave({ name: this.download, content }))
        .catch(() => alert("Não foi possível exportar. Tente novamente."));
      return;
    }
    return click.call(this);
  };
  function badge() {
    if (document.body.dataset.page !== "settings") return;
    const info = document.createElement("section");
    info.className = "beta-info";
    info.innerHTML =
      '<strong>Lollipop Clicker · 3.0.0-beta.1</strong><p>Beta Android privada · progresso local neste aplicativo.</p><p>O save do navegador não é transferido automaticamente. Exporte no navegador e importe o arquivo aqui.</p><button class="game-button secondary">Relatar um problema ↗</button><small>Abre o GitHub com versão e página. Nenhum save é enviado.</small>';
    info.querySelector("button").onclick = () =>
      files
        .openReport()
        .catch(() =>
          alert("Abra o repositório no navegador para relatar o problema."),
        );
    document.querySelector("main").append(info);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", badge, { once: true });
  else badge();
}
