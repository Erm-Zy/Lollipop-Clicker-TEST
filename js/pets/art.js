import { SPECIES, EGGS } from "./catalog.js";
import { ARTWORK, withArtwork } from "../ui/assets.js";

let serial = 0;
const shade = (color) =>
  "#" +
  color
    .slice(1)
    .match(/../g)
    .map((c) =>
      Math.round(parseInt(c, 16) * 0.7)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const sparkle = (x, y, s = 7, color = "#ffe99d") =>
  `<path d="M${x} ${y - s}q0 ${s} ${s} ${s}q-${s} 0-${s} ${s}q0-${s}-${s}-${s}q${s} 0 ${s}-${s}" fill="${color}"/>`;
export function eggSVG(id) {
  if (!EGGS[id]) return "";
  const uid = `egg-${++serial}`,
    [light, dark] = EGGS[id].colors;
  const motif =
    id === "acucarado"
      ? `<g stroke="#fff4c9" stroke-width="7" stroke-linecap="round"><path d="m43 75 10 6m42-19 8 9M38 110l13-4m42 28 10-5m-39-32 9 4"/></g>`
      : id === "cristalizado"
        ? '<path d="m74 34 35 63-35 56-35-56Z" fill="#d9ffff" stroke="#5bc3ef" stroke-width="3"/><path d="m74 34-9 63 9 56 15-56Z" fill="#93e7ff"/><path d="m39 97 35-18 35 18-35 12Z" fill="#fff" opacity=".55"/>'
        : '<ellipse cx="74" cy="98" rx="64" ry="16" fill="none" stroke="#ffd785" stroke-width="5" transform="rotate(-24 74 98)"/><path d="m74 52 8 19 21 3-15 15 4 21-18-10-19 10 4-21-15-15 22-3Z" fill="#ffe485" stroke="#fff3bc" stroke-width="2"/>';
  const crystal =
    id === "cristalizado"
      ? '<path d="m23 146 4-31 17 21-3 23m73-21 9-27 9 41-20 5" fill="#c9ffff" stroke="#82caee" stroke-width="2"/>'
      : "";
  return withArtwork(
    `<svg class="egg-art" viewBox="0 0 150 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}" x1=".2" y1="0" x2=".85" y2="1"><stop stop-color="${light}"/><stop offset=".45" stop-color="${dark}"/><stop offset="1" stop-color="${id === "celestial" ? "#5f32a5" : dark}"/></linearGradient><linearGradient id="${uid}-cloud" x2="0" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs><ellipse cx="75" cy="165" rx="57" ry="9" fill="#260d32" opacity=".4"/><g stroke="#69305e" stroke-width="3" stroke-linejoin="round"><path d="M75 13C48 13 24 70 24 112c0 53 102 53 102 0 0-42-24-99-51-99Z" fill="url(#${uid})"/><path d="M68 20C47 34 30 85 31 110" fill="none" stroke="${light}" stroke-width="7" opacity=".75" stroke-linecap="round"/></g>${motif}<path d="M57 34 50 43m-6 14-4 12" fill="none" stroke="#fff" stroke-width="6" opacity=".85" stroke-linecap="round"/>${crystal}<path d="M21 151c-11-18 10-30 21-14 2-20 26-20 32-5 9-21 32-17 34 1 19-8 33 12 19 24-18 17-91 17-106-6Z" fill="url(#${uid}-cloud)" stroke="${light}" stroke-width="2"/><path d="M34 154q40 14 80-2" fill="none" stroke="${light}" opacity=".55" stroke-width="5" stroke-linecap="round"/>${sparkle(17, 59)}${sparkle(131, 38, 8)}${sparkle(129, 119, 5, "#fff5dc")}</svg>`,
    ARTWORK.eggs?.[id],
  );
}
const shapes = {
  candy:
    '<path d="m35 45-24-14 6 28-6 24 26-12m48-26 24-14-6 28 6 24-26-12"/><rect x="29" y="33" width="62" height="61" rx="25"/>',
  marsh:
    '<path d="M30 34q30-16 60 0v53q-30 21-60 0Z"/><ellipse cx="60" cy="34" rx="30" ry="10" fill="#fff4f1"/>',
  bear: '<circle cx="35" cy="35" r="15"/><circle cx="85" cy="35" r="15"/><path d="M27 65c0-39 66-39 66 0v10c0 33-66 33-66 0Z"/>',
  fox: '<path d="M24 63 20 20 49 39q12-6 22 0l29-19-4 43c4 44-76 44-72 0Z"/><path d="m27 65 33 12 33-12c-3 32-63 32-66 0Z" fill="#fff0dc"/>',
  guardian:
    '<path d="M31 40q29-26 58 0l-4 43-25 24-25-24Z"/><path d="m60 40 7 15 16 2-12 11 3 16-14-7-14 7 3-16-12-11 16-2Z" fill="#fff0aa"/>',
  cube: '<path d="m26 39 51-14 19 19v48l-51 15-19-18Z"/><path d="m27 40 18 17 50-13M45 57v49" fill="none" stroke="#edffff" stroke-width="4"/><path d="m54 38 19-5 8 8-23 6Z" fill="#fff" opacity=".7"/>',
  drop: '<path d="M60 18C48 43 25 59 25 78c0 37 70 37 70 0C95 59 73 43 60 18Z"/>',
  rabbit:
    '<ellipse cx="42" cy="31" rx="12" ry="27" transform="rotate(-16 42 31)"/><ellipse cx="78" cy="31" rx="12" ry="27" transform="rotate(16 78 31)"/><ellipse cx="60" cy="76" rx="35" ry="31"/><path d="m40 17 5 20m35-20-5 20" stroke="#f696bb" stroke-width="6" stroke-linecap="round"/>',
  owl: '<path d="m26 29 23 13h22l23-13-5 32 8 26c-5 29-69 29-74 0l8-26Z"/><path d="M27 66q17-33 33-6 16-27 33 6-7 29-33 14-26 15-33-14Z" fill="#fff2d6"/><path d="m55 78 5 9 5-9Z" fill="#f1b34f"/>',
  dragon:
    '<path d="m32 65-24-25 3 36 23 13m54-24 24-25-3 36-23 13"/><path d="M33 44 32 20l23 20h10l23-20-1 24 8 34c-1 34-69 34-70 0Z"/><path d="m16 56 5 15 12 8m71-23-5 15-12 8" fill="none" stroke="#ffe1d0" stroke-width="3"/><path d="M40 89q20 14 40 0" fill="none" stroke="#ffedba" stroke-width="6"/>',
  star: '<path d="m60 15 14 27 30 5-22 22 5 31-27-14-27 14 5-31-22-22 30-5Z"/>',
  comet:
    '<path d="m25 88 22-67 8 30 38-32-16 43 30 2-52 41Z"/><circle cx="51" cy="79" r="29"/>',
  phoenix:
    '<path d="m60 43-15-25 3 31-33-19 13 40-14 13 35 11 11 20 11-20 35-11-14-13 13-40-33 19 3-31Z"/><path d="m44 82 16 20 16-20Z" fill="#fff0b3"/>',
};
const motifs = {
  balinha:
    '<path d="m16 42 12 7m-10 24 10-6m76-25-12 7m10 24-10-6" stroke="#ffe8a7" stroke-width="3"/>',
  marshmelinho:
    '<path d="M38 32q9-8 18-1 9-8 22 0" fill="none" stroke="#ffd0e4" stroke-width="5"/><path d="m78 40 6 3m-45 42 7 2" stroke="#e7a2b8" stroke-width="3"/>',
  goma: '<ellipse cx="60" cy="83" rx="15" ry="10" fill="#d7f9b2"/><circle cx="35" cy="34" r="6" fill="#fff2c9"/><circle cx="85" cy="34" r="6" fill="#fff2c9"/>',
  raposa_morango:
    '<path d="m47 34 13-15 13 15-13-3Z" fill="#96cf76"/><g fill="#ffe6a5"><ellipse cx="37" cy="48" rx="2" ry="3"/><ellipse cx="82" cy="47" rx="2" ry="3"/></g>',
  guardiao_pirulito:
    '<path d="M45 31q15-13 30 0" fill="none" stroke="#fff0a0" stroke-width="5"/><path d="m28 48-9 14 10 13m62-27 10 14-10 13" fill="#d8a5e4"/>',
  cubinho:
    '<path d="m71 28 4 11 11 3-11 4-4 10-4-10-10-4 10-3Z" fill="#efffff"/>',
  gotinha: '<path d="m61 29 9 16-9 14-9-14Z" fill="#f1ffff" opacity=".8"/>',
  coelho_quartzo:
    '<path d="m60 37 8 13-8 11-8-11Z" fill="#b5f5ff" stroke="#f3ffff" stroke-width="2"/>',
  raposa_geada:
    '<path d="m60 32 8 13-8 11-8-11Z" fill="#f3ffff"/><path d="m24 26 10 22m62-22-10 22" stroke="#efffff" stroke-width="3"/>',
  coruja_prismatica:
    '<path d="m60 29 8 14-8 11-8-11Z" fill="#aff8e2"/><path d="m29 83 13 8m49-8-13 8" stroke="#d4f3ff" stroke-width="4"/>',
  dragao_cristalino:
    '<path d="m55 33 5-14 7 14-7 5Z" fill="#f1ffff"/><path d="m35 91-5-11m55 11 5-11" stroke="#b7fbff" stroke-width="4"/>',
  estrelinha: '<path d="m60 21 9 22 25 7-28-3Z" fill="#fff7d7" opacity=".9"/>',
  cometinha:
    '<path d="m59 40 19-13-11 26" fill="#fff1b7"/><path d="m73 48 16-8-8 14" fill="#ffe8ca"/>',
  coelho_lunar:
    '<path d="M65 36a12 12 0 1 0 12 17 10 10 0 0 1-12-17Z" fill="#fff3ae"/>',
  raposa_nebulosa:
    '<path d="m60 29 4 10 11 3-11 3-4 10-4-10-11-3 11-3Z" fill="#ffdf9d"/><circle cx="37" cy="50" r="2" fill="#fff4da"/><circle cx="84" cy="50" r="2" fill="#fff4da"/>',
  fenix:
    '<path d="m53 39 7-19 7 19Z" fill="#ffe88f"/><path d="m23 45 13 24m61-24L84 69" stroke="#ffecaf" stroke-width="4"/>',
  guardiao_aurora:
    '<path d="m31 40 8-18 14 10 7-16 7 16 14-10 8 18Z" fill="#fff0ae" stroke="#e8b75d" stroke-width="2"/>',
  dragao_galactico:
    '<path d="m60 24 4 10 10 2-10 4-4 10-4-10-10-4 10-2Z" fill="#ffe58e"/><circle cx="39" cy="50" r="2" fill="#fff1c0"/><circle cx="82" cy="48" r="2" fill="#fff1c0"/>',
};
export function petSVG(id, stage = 0, mystery = false) {
  const p = SPECIES[id];
  if (!p) return "";
  const uid = `pet-${++serial}`;
  const face =
    p.shape === "guardian"
      ? ""
      : `<g fill="#4a244e"><ellipse cx="47" cy="65" rx="4.5" ry="6.5"/><ellipse cx="73" cy="65" rx="4.5" ry="6.5"/><path d="M53 78q7 8 14 0" fill="none" stroke="#4a244e" stroke-width="2.5" stroke-linecap="round"/></g><g fill="#fff"><circle cx="46" cy="62" r="1.8"/><circle cx="72" cy="62" r="1.8"/></g><g fill="#f480a8" opacity=".6"><ellipse cx="36" cy="77" rx="7" ry="4"/><ellipse cx="84" cy="77" rx="7" ry="4"/></g>`;
  const character = `<g stroke="#6a345d" stroke-width="2.8" stroke-linejoin="round" fill="url(#${uid})">${shapes[p.shape]}</g><path d="M39 49q4-6 11-8" stroke="#fff" opacity=".65" stroke-width="4" fill="none" stroke-linecap="round"/>${face}${motifs[id]}`;
  const svg = `<svg class="pet-art" viewBox="0 0 120 132" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="${uid}" x1=".25" y1="0" x2=".7" y2="1"><stop stop-color="#fff1dc"/><stop offset=".27" stop-color="${p.color}"/><stop offset=".65" stop-color="${p.color}"/><stop offset="1" stop-color="${shade(p.color)}"/></linearGradient><linearGradient id="${uid}-base" x2="0" y2="1"><stop stop-color="#fff0b9"/><stop offset=".5" stop-color="#e9ae6d"/><stop offset="1" stop-color="#a14b8c"/></linearGradient></defs><ellipse cx="60" cy="120" rx="43" ry="8" fill="#270c36" opacity=".3"/><ellipse cx="60" cy="114" rx="42" ry="9" fill="url(#${uid}-base)" stroke="#ffe3aa" stroke-width="1.5"/><g ${mystery ? 'opacity=".22"' : ""}>${character}</g>${mystery ? '<path d="M50 55a12 12 0 1 1 18 10L60 73v5" fill="none" stroke="#fff0db" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="88" r="3" fill="#fff0db"/>' : sparkle(12, 30, 5) + sparkle(105, 51, 4, p.egg === "cristalizado" ? "#d9ffff" : "#ffe59b")}${stage > 0 ? `<g fill="${stage === 3 ? "#ffe19a" : "#ecc4ff"}">${Array.from({ length: stage }, (_, i) => sparkle(51 + i * 9 - (stage - 1) * 4.5, 122, 3)).join("")}</g>` : ""}</svg>`;
  return mystery ? svg : withArtwork(svg, ARTWORK.pets?.[id]);
}
