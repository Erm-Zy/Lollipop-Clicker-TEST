import { WORLD_CHAPTERS, BOSS_STORIES } from "../world.js";
import { setNodeText } from "./shared.js";

export function mountJukebox(runtime) {
  const root = document.getElementById("candyJukebox");
  const mode = root.querySelector("#musicMode");
  const volume = root.querySelector("#musicVolume");
  const battle = root.querySelector("#musicBattleOverrides");
  const play = root.querySelector("#musicPlayBtn");
  const next = root.querySelector("#musicNextBtn");
  const list = root.querySelector("#jukeboxTracks");
  const rows = [];
  const labels = { general: "Música do vale", world: "Tema de capítulo", boss: "Tema de batalha", special: "Especial" };
  for (const track of runtime.audio.snapshot().catalog) {
    const row = document.createElement("li");
    row.className = "jukebox-track";
    row.dataset.track = track.id;
    const detail = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = track.title;
    const assignment = document.createElement("p");
    assignment.textContent = [track.artist, ...track.categories.map(category => labels[category]),
      ...(track.worlds ?? []).map(id => WORLD_CHAPTERS[id].name),
      ...(track.bosses ?? []).map(id => BOSS_STORIES[id].name)].filter(Boolean).join(" · ");
    const state = document.createElement("small");
    detail.append(title, assignment, state);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item-preview";
    button.dataset.musicTrack = track.id;
    button.textContent = "Selecionar";
    button.setAttribute("aria-label", `Selecionar ${track.title} no modo Manual`);
    row.append(detail, button);
    list.append(row);
    rows.push({ row, button, state, track });
  }
  const messages = {
    playing: "Em reprodução", loading: "Preparando a trilha…", paused: "Pausada enquanto o jogo está em segundo plano.",
    disabled: "Música desligada. Ative Música do vale para ouvir.",
    interaction: "Toque em Reproduzir para começar a música.",
    readonly: "A música acompanha a aba que está jogando.",
    unavailable: "O áudio está indisponível. O jogo continua normalmente.",
  };
  runtime.audio.subscribe(value => {
    mode.value = value.preferences.mode;
    volume.value = String(Math.round(value.preferences.volume * 100));
    volume.setAttribute("aria-valuetext", `${volume.value}%`);
    setNodeText(root.querySelector("#musicVolumeValue"), `${volume.value}%`);
    battle.checked = value.preferences.battleOverrides;
    for (const control of [mode, volume, battle]) control.disabled = !value.canControl;
    play.disabled = !value.canControl || !runtime.state.settings.music;
    next.disabled = play.disabled || !value.hasNext;
    next.title = value.hasNext ? "Escolher outra faixa da playlist atual" : value.playlistSize === 1 ? "Esta playlist tem só uma faixa" : "Nenhuma faixa disponível";
    setNodeText(root.querySelector("#nowPlaying"), `${value.status === "playing" ? "Tocando" : "Trilha selecionada"}: ${value.title}`);
    setNodeText(document.getElementById("musicSummary"), `${value.title} · ${messages[value.status]}`);
    setNodeText(root.querySelector("#musicStatus"), [messages[value.status], value.lastError,
      !value.canStore ? "Preferências temporárias: o armazenamento não está disponível." : ""].filter(Boolean).join(" "));
    for (const { row, button, state, track } of rows) {
      const discovered = value.discovered.includes(track.id);
      const selected = value.trackId === track.id;
      row.classList.toggle("selected", selected);
      button.disabled = !value.canControl || !discovered;
      button.setAttribute("aria-pressed", String(value.preferences.mode === "manual" && value.preferences.manualTrackId === track.id));
      setNodeText(state, !discovered ? `Descubra o capítulo ${track.discovery.chapter + 1} para ouvir`
        : selected ? value.status === "playing" ? "♫ Em reprodução" : "✓ Selecionada" : "✓ Descoberta");
    }
  });
  mode.addEventListener("change", () => runtime.audio.setPreferences({ mode: mode.value }, true));
  volume.addEventListener("input", () => runtime.audio.setPreferences({ volume: Number(volume.value) / 100 }));
  battle.addEventListener("change", () => runtime.audio.setPreferences({ battleOverrides: battle.checked }, true));
  play.addEventListener("click", () => runtime.audio.unlock(true));
  next.addEventListener("click", () => runtime.audio.next());
  list.addEventListener("click", event => {
    const button = event.target.closest("[data-music-track]");
    if (button && !button.disabled) runtime.audio.selectTrack(button.dataset.musicTrack);
  });
}
