import { ARTWORK, withArtwork } from "./assets.js";

const drawings = {
  c1: '<path d="M40 65V32q0-9 9-9t9 9v22q4-15 12-3 10-10 14 4 12-6 12 8v13q-1 26-24 26-22 0-33-15L25 71q-5-9 3-13 6-3 12 7Z"/><path d="m27 27-6-7m40-8 2-8m-46 42-9-2" fill="none"/>',
  c100: '<path d="M37 70V40q0-10 9-10t9 10v19q7-15 14-2 10-11 15 4 12-5 12 9v13q-7 24-30 19L34 89 20 75q-6-10 2-14 6-2 15 9Z"/><path d="M36 16h35M43 10h21" fill="none"/><circle cx="91" cy="25" r="14"/>',
  c1000:
    '<path d="m17 53 24-6 9-31 17 23 33-6-14 29 15 28-32-1-19 19-8-29-27-7Z"/><path d="M49 70V44q0-7 7-7t7 7v18l11-1 8 20-10 13-24-6-13-16q-2-9 5-7Z" fill="#fff2b6"/>',
  viciado:
    '<path d="M31 34h58v58q-29 17-58 0Z"/><ellipse cx="60" cy="34" rx="29" ry="10"/><path d="M31 42q6 18 15 0 8 24 15 1 9 16 14-1 9 19 14-1" fill="#ff91b5"/><path d="m56 53 14 16-14 20-13-20Z" fill="#fff4bd"/>',
  fabrica_doces:
    '<path d="M22 97V54l22 9V42l24 12V31h15v66Z"/><path d="M68 26q-9-17 10-15 6-17 19-4 18 10-3 17Z" fill="#ffe6f4"/><g fill="#fff0b0"><path d="M31 74h10v12H31Zm20 0h10v12H51Zm20 0h10v12H71Z"/></g>',
  magnata:
    '<path d="m21 44 21 14 18-28 18 28 21-14-10 49H31Z"/><path d="M33 90h54v10H33Z"/><path d="m60 54 9 13-9 12-9-12Z" fill="#ff78b7"/><circle cx="21" cy="37" r="7"/><circle cx="60" cy="22" r="7"/><circle cx="99" cy="37" r="7"/>',
  sabores_3:
    '<path d="M31 46q29-22 58 0l-29 56Z" fill="#ff94ad"/><path d="m30 43 18-4 12-19 12 19 18 4-30 7Z" fill="#a4e1ab"/><g fill="#fff0b6"><ellipse cx="48" cy="62" rx="3" ry="5"/><ellipse cx="72" cy="62" rx="3" ry="5"/><ellipse cx="60" cy="81" rx="3" ry="5"/></g>',
  sabores_todos:
    '<path d="M18 87a42 42 0 0 1 84 0H88a28 28 0 0 0-56 0Z" fill="#ffc98f"/><path d="M32 86a28 28 0 0 1 56 0H75a15 15 0 0 0-30 0Z" fill="#b6f5cf"/><path d="M16 87q-12-13-4-21 6-5 11 1 12-4 14 7 12 6 2 16Zm68 0q-12-13-4-21 6-5 11 1 12-4 14 7 12 6 2 16Z" fill="#fff0db"/>',
  fashionista:
    '<path d="M23 66q-4-41 38-42 43 5 36 39-2 13-24 9-13 0-10 13 0 17-18 12-23-6-22-31Z"/><g stroke="none"><circle cx="42" cy="45" r="8" fill="#ff83ad"/><circle cx="65" cy="42" r="8" fill="#a7e8c5"/><circle cx="81" cy="58" r="8" fill="#ccb0ff"/></g><path d="m68 91 25-44 9 8-24 44Z" fill="#ad85de"/>',
  roleta_1:
    '<circle cx="60" cy="60" r="39"/><path d="M60 21v78M21 60h78M32 32l56 56m0-56L32 88" stroke="#d47ba3"/><circle cx="60" cy="60" r="10" fill="#fff1c6"/><path d="m49 11 11 19 11-19Z" fill="#ff8cb4"/>',
  upgrades_10:
    '<path d="m48 20 24 0 4 13 13-1 12 21-10 10 3 13-21 15-10-9-15 5-16-17 7-13-8-10 7-21Z"/><circle cx="60" cy="59" r="19" fill="#ce8ec5"/><path d="m53 65 21-26 9 8-23 27Z" fill="#fff3bb"/>',
  boss_1:
    '<path d="m20 21 14 2 60 69-9 9-64-66Z"/><path d="m100 21-14 2-60 69 9 9 64-66Z" fill="#ffe3ac"/><path d="m19 78 23 23m59-23-23 23" fill="none" stroke-width="8"/>',
  tempo_10m:
    '<circle cx="60" cy="67" r="35"/><path d="M49 16h22v11H49Zm32 16 9-9 8 8-10 9Z"/><path d="M60 43v25l15 9" fill="none" stroke="#b16a9c" stroke-width="6" stroke-linecap="round"/>',
};
let serial = 0;
export function achievementSVG(id) {
  const uid = `badge-${++serial}`;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}" x2=".4" y2="1"><stop stop-color="#fff6cf"/><stop offset=".45" stop-color="#ffd66e"/><stop offset="1" stop-color="#e69a55"/></linearGradient></defs><g fill="url(#${uid})" stroke="#8e426a" stroke-width="3.2" stroke-linejoin="round">${drawings[id] || drawings.c1}</g><path d="m14 13 2 6 6 2-6 2-2 6-2-6-6-2 6-2m90 74 2 6 6 2-6 2-2 6-2-6-6-2 6-2" fill="#fff0ae"/></svg>`;
}
export function pawSVG() {
  return '<svg viewBox="0 0 80 80" aria-hidden="true"><g fill="#f6c4ff" stroke="#74406f" stroke-width="2"><ellipse cx="19" cy="26" rx="9" ry="12" transform="rotate(-20 19 26)"/><ellipse cx="37" cy="18" rx="9" ry="12"/><ellipse cx="57" cy="23" rx="9" ry="12" transform="rotate(15 57 23)"/><ellipse cx="68" cy="42" rx="8" ry="10"/><path d="M23 54q15-32 32-7 26 27-3 23-12-5-19 2-22 5-10-18Z"/></g></svg>';
}
export function sanctuaryHeader(kind) {
  const pet = kind === "pets",
    title = pet ? "Ninho dos Pets" : "Pequenas grandes conquistas";
  const fallback =
    '<svg viewBox="0 0 1152 768" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 0h1152v768H0Z" fill="#432049"/><path d="M0 610q180-150 400 40 420-200 752-20v138H0Z" fill="#72958e"/><path d="M0 95q40-70 100-20 50-70 130 0H0m922-5q50-90 120-20 80-70 110 25Z" fill="#9f508e"/><path d="M150 768q430-120 650-48" fill="none" stroke="#efbc91" stroke-width="50"/></svg>';
  const art = pet
    ? '<svg viewBox="0 0 200 105" aria-hidden="true"><path d="M37 67q63 60 126 0Z" fill="#bd7d55" stroke="#f9c797" stroke-width="5"/><path d="M40 64q60 30 120 0m-113 15q53 24 106 0" fill="none" stroke="#f7c98c" stroke-width="5"/><path d="M100 12C79 12 64 47 70 66q30 28 60 0c6-19-9-54-30-54Z" fill="#ff8eb8" stroke="#fff2c4" stroke-width="4"/><path d="M97 35q-21 0-15 18 9 14 23 1 8-11-3-13" fill="none" stroke="#fff2ba" stroke-width="6"/><path d="M67 53Q30 25 49 23q24 2 28 25m48 0q22-29 32-23 11 15-29 30" fill="#a6e6b0" stroke="#658f83" stroke-width="3"/></svg>'
    : `<svg viewBox="0 0 200 105" aria-hidden="true"><path d="M18 86 30 53q34-16 70 0 36-16 70 0l12 33q-49-12-82 6-33-18-82-6Z" fill="#ffeed2" stroke="#ac547d" stroke-width="4"/><path d="M47 16h17v18q-20 4-17-18m89 0h17q3 22-17 18" fill="none" stroke="#ffce6c" stroke-width="7"/><path d="M66 8h68v21q0 27-27 31v12h18v10H76V72h18V60Q66 56 66 29Z" fill="#ffd36d" stroke="#a35d58" stroke-width="3"/><path d="m100 18 5 11 12 2-9 8 2 12-10-6-11 6 2-12-8-8 12-2Z" fill="#fff3b9"/></svg>`;
  return `<div class="sanctuary-hero"><span class="sanctuary-scenery" aria-hidden="true">${withArtwork(fallback, ARTWORK.locations?.sanctuary)}</span><span class="sanctuary-emblem">${art}</span><div class="title-ribbon"><span aria-hidden="true"></span><h1>${title}</h1></div><p>${pet ? "Choque ovos e forme sua equipe!" : "Seu álbum de feitos"}</p></div>`;
}
