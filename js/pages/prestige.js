import { bootPage, format, setText } from "../ui/shared.js";
import { getPrestigeGain, prestige } from "../gameplay.js";

const runtime = await bootPage("prestige");
const button = document.getElementById("prestigeBtn");
function render(state) {
  const gain = getPrestigeGain(state);
  const nextLevel = state.prestigeClaimed + 1;
  const requirement = nextLevel ** 3 * 1000000;
  const previous = state.prestigeClaimed ** 3 * 1000000;
  const progress = Math.max(
    0,
    Math.min(
      1,
      (state.totalEarned - previous) / Math.max(1, requirement - previous),
    ),
  );
  setText("prestigeLevel", format(state.prestigeLevel));
  setText("prestigeBonus", `+${format(state.prestigeLevel * 15)}%`);
  setText(
    "prestigeGainText",
    `+${format(gain)} ${gain === 1 ? "nível" : "níveis"} de prestígio`,
  );
  setText(
    "prestigeRequirement",
    gain > 0
      ? `Seu legado já pode render ${format(gain)} ${gain === 1 ? "novo nível" : "novos níveis"}. Pronto para recomeçar?`
      : `Próximo nível: ${format(state.totalEarned)} / ${format(requirement)} doces produzidos no total.`,
  );
  document.getElementById("prestigeProgressFill").style.width =
    `${progress * 100}%`;
  document
    .querySelector(".prestige-progress")
    .setAttribute("aria-valuenow", String(Math.round(progress * 100)));
  document.getElementById("prestigePending").hidden = !state.pendingWheel;
  button.disabled =
    !runtime.writable || gain <= 0 || Boolean(state.pendingWheel);
}
button.addEventListener("click", () => {
  const gain = getPrestigeGain(runtime.state);
  if (gain <= 0 || runtime.state.pendingWheel) return;
  if (
    !confirm(
      `Renascer e ganhar +${gain} de prestígio? Seu saldo, máquinas, batalha e bônus temporários serão reiniciados. Sua coleção, conquistas e estatísticas serão mantidas.`,
    )
  )
    return;
  const result = runtime.act((state, now) => prestige(state, now), {
    sound: "win",
  });
  if (result)
    runtime.notify(
      `Seu legado brilhou! +${format(result)} de prestígio. Um mundo novo espera por você.`,
    );
});
runtime.subscribe(render);
