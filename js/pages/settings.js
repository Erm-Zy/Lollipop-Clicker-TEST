import { bootPage, setText } from "../ui/shared.js";
import { createState } from "../gameplay.js";
import { validateState } from "../storage.js";
const runtime = await bootPage("settings");
const settings = [
  ["toggleMusicBtn", "music"],
  ["toggleSfxBtn", "sfx"],
  ["toggleParticlesBtn", "particles"],
  ["toggleAnimationsBtn", "animations"],
];
runtime.subscribe((state) => {
  for (const [id, key] of settings) {
    const btn = document.getElementById(id);
    setText(id, state.settings[key] ? "Ligado" : "Desligado");
    btn.setAttribute("aria-pressed", String(state.settings[key]));
    btn.disabled = !runtime.writable;
  }
  for (const id of ["importSaveBtn", "resetDataBtn", "restoreBackupBtn"])
    document.getElementById(id).disabled = !runtime.writable;
  setText(
    "storageState",
    runtime.canSave
      ? "Seu progresso fica neste navegador. Exporte um arquivo para guardar uma cópia fora daqui."
      : "Seu save original não será sobrescrito. Exporte o arquivo bruto ou restaure um backup válido.",
  );
});
for (const [id, key] of settings)
  document.getElementById(id).addEventListener("click", () => {
    runtime.act(
      (state) => {
        state.settings[key] = !state.settings[key];
        return true;
      },
      { sound: false },
    );
    if (!runtime.state.settings.particles) runtime.effects?.clear();
  });
document.getElementById("exportSaveBtn").addEventListener("click", () => {
  runtime.flush();
  const blob = new Blob([runtime.exportRaw()], { type: "application/json" }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `lollipop-${runtime.canSave ? "save-v3" : "recuperacao-bruta"}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  runtime.notify("Seu backup está pronto. Guarde-o com carinho!");
});
document
  .getElementById("importSaveBtn")
  .addEventListener("click", () =>
    document.getElementById("importSaveInput").click(),
  );
document
  .getElementById("importSaveInput")
  .addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000)
        throw new Error("Este arquivo é grande demais para um save.");
      const raw = JSON.parse(await file.text());
      validateState(raw, Date.now());
      if (
        !confirm(
          "Substituir o progresso pelo arquivo importado? O save atual será guardado como backup de recuperação.",
        )
      )
        return;
      const result = runtime.replaceState(raw, { confirmed: true });
      if (!result.ok) throw new Error(result.error);
      runtime.notify("Seu mundo foi importado com sucesso!");
    } catch (error) {
      runtime.notify(`Não foi possível importar: ${error.message}`);
    } finally {
      e.target.value = "";
    }
  });
document.getElementById("restoreBackupBtn").addEventListener("click", () => {
  try {
    let candidate;
    for (const key of [
      "lollipopSave.backup",
      "lollipopSave.legacy-v2",
      "lollipopSave.legacy-v1",
    ]) {
      const raw = runtime.storage.getItem(key);
      if (!raw) continue;
      try {
        validateState(JSON.parse(raw), Date.now());
        candidate = JSON.parse(raw);
        break;
      } catch {
        /* Find the next intact backup. */
      }
    }
    if (!candidate)
      throw new Error(
        "Nenhum backup local válido foi encontrado. Importe um arquivo exportado.",
      );
    if (
      !confirm(
        "Restaurar o backup local? O save atual será preservado separadamente antes da substituição.",
      )
    )
      return;
    const result = runtime.replaceState(candidate, { confirmed: true });
    if (!result.ok) throw new Error(result.error);
    runtime.notify("Backup restaurado. Sua aventura pode continuar.");
  } catch (error) {
    runtime.notify(error.message);
  }
});
document.getElementById("resetDataBtn").addEventListener("click", () => {
  if (
    !confirm("Apagar todo o progresso? Exporte uma cópia antes de continuar.")
  )
    return;
  if (
    !confirm(
      "Confirmação final: zerar saldo, prestígio, coleção, conquistas e máquinas?",
    )
  )
    return;
  const result = runtime.replaceState(createState(Date.now()), {
    confirmed: true,
  });
  runtime.notify(
    result.ok
      ? "Um mundo novinho espera por você. O save anterior ficou guardado para recuperação."
      : result.error,
  );
});
