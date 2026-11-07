import { eggQuote } from "./actions.js";

/** One bounded, foreground-only timeout; no persisted session or offline simulation. */
export function createAutoHatcher({
  runtime,
  openBatch,
  onChange = () => {},
  interval = 2400,
  hidden = () => document.hidden,
  schedule = setTimeout,
  unschedule = clearTimeout,
}) {
  let active = false,
    timer = 0,
    selection = null,
    disposed = false;
  const abort = new AbortController();
  function stop(reason = "Abertura automática parada.") {
    unschedule(timer);
    timer = 0;
    const wasActive = active;
    active = false;
    if (wasActive) onChange({ active: false, reason });
  }
  function allowed() {
    return (
      !disposed &&
      runtime.writable &&
      runtime.canSave &&
      !runtime.updating &&
      !hidden()
    );
  }
  function run() {
    timer = 0;
    if (!active) return;
    if (!allowed()) {
      stop(
        "Abertura parada: a página precisa estar ativa e com salvamento disponível.",
      );
      return;
    }
    const quote = eggQuote(runtime.state, selection.eggId, selection.count);
    if (!quote.ok) {
      stop(quote.reason);
      return;
    }
    if (!openBatch(selection.eggId, selection.count)) {
      stop(
        "Não foi possível salvar o lote. Confira os Ajustes antes de continuar.",
      );
      return;
    }
    if (!active) return;
    const next = eggQuote(
      runtime.state,
      selection.eggId,
      selection.count,
      Date.now() + interval,
    );
    if (!next.ok) {
      stop(next.reason);
      return;
    }
    timer = schedule(run, interval);
  }
  const unsubscribe = runtime.subscribe(() => {
    if (active && !allowed())
      stop("Abertura parada para proteger o progresso.");
  });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (hidden()) stop("Abertura parada ao ocultar a página.");
    },
    { signal: abort.signal },
  );
  document.addEventListener(
    "lollipop:native-pause",
    () => stop("Abertura parada ao pausar o aplicativo."),
    { signal: abort.signal },
  );
  window.addEventListener(
    "blur",
    () => stop("Abertura parada ao sair da janela do jogo."),
    { signal: abort.signal },
  );
  window.addEventListener(
    "pagehide",
    () => stop("Abertura parada ao navegar."),
    { signal: abort.signal },
  );
  return {
    get active() {
      return active;
    },
    stop,
    start(eggId, count) {
      if (active || !allowed() || !eggQuote(runtime.state, eggId, count).ok)
        return false;
      selection = { eggId, count };
      active = true;
      onChange({
        active: true,
        reason: "Abrindo automaticamente enquanto esta página estiver ativa.",
      });
      run();
      return active;
    },
    dispose() {
      stop();
      disposed = true;
      unsubscribe();
      abort.abort();
    },
  };
}
