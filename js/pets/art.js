import { SPECIES, EGGS } from "./catalog.js";
import { ARTWORK, withArtwork } from "../ui/assets.js";

export function eggSVG(id) {
  const [light, dark] = EGGS[id].colors;
  const decoration =
    id === "acucarado"
      ? '<path d="m31 61 12 8m35-14 10 7M28 94l14-3m31 11 11-4" stroke="#fff2d9" stroke-width="7" stroke-linecap="round"/>'
      : id === "cristalizado"
        ? '<path d="m60 38 21 37-21 38-22-38Z" fill="#e4ffff" opacity=".8"/><path d="M60 38v75m-22-38h43" stroke="#79b8d7" stroke-width="2"/>'
        : '<path d="m60 48 6 13 14 2-10 10 2 14-12-7-13 7 3-14-10-10 14-2Z" fill="#ffe6a3"/><circle cx="35" cy="91" r="3" fill="#fff5d8"/><circle cx="82" cy="48" r="3" fill="#fff5d8"/>';
  return withArtwork(
    `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><ellipse cx="60" cy="126" rx="37" ry="7" fill="#20102e" opacity=".3"/><path d="M60 15c-18 0-44 47-44 74a44 35 0 0 0 88 0c0-27-26-74-44-74Z" fill="${dark}" stroke="#51344f" stroke-width="4"/><path d="M60 20C45 23 22 65 23 87c0 12 6 21 16 26-10-23 1-66 21-93Z" fill="${light}"/>${decoration}</svg>`,
    ARTWORK.eggs?.[id],
  );
}
const shapes = {
  candy:
    '<path d="m34 44-21-9 4 22-4 22 22-9m51-26 21-9-4 22 4 22-22-9" fill="currentColor"/><rect x="30" y="34" width="60" height="56" rx="22" fill="currentColor"/>',
  marsh:
    '<path d="M30 30q30-10 60 0v55q-30 19-60 0Z" fill="currentColor"/><ellipse cx="60" cy="30" rx="30" ry="10" fill="#fff1ef"/>',
  bear: '<circle cx="35" cy="32" r="13" fill="currentColor"/><circle cx="85" cy="32" r="13" fill="currentColor"/><ellipse cx="60" cy="68" rx="36" ry="38" fill="currentColor"/>',
  fox: '<path d="m24 62-4-42 32 20h16l32-20-4 42-36 38Z" fill="currentColor"/><path d="m26 63 34 14 34-14-34 35Z" fill="#fff1da"/>',
  guardian:
    '<path d="m29 38 31-14 31 14-5 48-26 22-26-22Z" fill="currentColor"/><path d="m60 35 6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2Z" fill="#fff3b0"/>',
  cube: '<path d="m27 38 51-12 19 17v50l-54 15-16-17Z" fill="currentColor"/><path d="m27 38 17 17 53-12M44 55v53" fill="none" stroke="#ecffff" stroke-width="4"/>',
  drop: '<path d="M60 18C51 37 26 58 26 78a34 29 0 0 0 68 0C94 58 69 37 60 18Z" fill="currentColor"/><path d="M52 42c-12 14-19 27-18 37" fill="none" stroke="#efffff" stroke-width="5" stroke-linecap="round"/>',
  rabbit:
    '<ellipse cx="43" cy="30" rx="10" ry="25" transform="rotate(-15 43 30)" fill="currentColor"/><ellipse cx="77" cy="30" rx="10" ry="25" transform="rotate(15 77 30)" fill="currentColor"/><ellipse cx="60" cy="75" rx="33" ry="31" fill="currentColor"/>',
  owl: '<path d="m27 30 22 12h22l22-12-5 29 10 31-19 15H41L22 90l10-31Z" fill="currentColor"/><circle cx="44" cy="63" r="17" fill="#fff2da"/><circle cx="76" cy="63" r="17" fill="#fff2da"/><path d="m55 80 5 9 5-9Z" fill="#edab6c"/>',
  dragon:
    '<path d="m32 68-22-29 2 38 22 13m54-22 22-29-2 38-22 13" fill="currentColor"/><path d="m34 45-2-26 22 20h12l22-20-2 26 7 37-33 23-33-23Z" fill="currentColor"/><path d="M36 91q24 16 48 0" fill="none" stroke="#fff2d6" stroke-width="6"/>',
  star: '<path d="m60 16 13 26 29 4-21 21 5 30-26-14-26 14 5-30-21-21 29-4Z" fill="currentColor"/>',
  comet:
    '<path d="m26 93 20-71 9 28 38-31-17 45 29 1-50 39Z" fill="currentColor" opacity=".65"/><circle cx="51" cy="79" r="29" fill="currentColor"/>',
  phoenix:
    '<path d="m60 44-15-25 3 31-32-19 13 40-14 12 34 10 11 20 11-20 34-10-14-12 13-40-32 19 3-31Z" fill="currentColor"/><path d="m43 79 17 23 17-23" fill="#ffe9a0"/>',
};
export function petSVG(id, stage = 0, mystery = false) {
  const species = SPECIES[id];
  if (!species) return "";
  const face =
    species.shape === "guardian"
      ? ""
      : '<g fill="#44314e"><ellipse cx="47" cy="64" rx="3" ry="5"/><ellipse cx="73" cy="64" rx="3" ry="5"/><path d="M53 77q7 6 14 0" fill="none" stroke="#44314e" stroke-width="3" stroke-linecap="round"/></g><g fill="#e57c9f" opacity=".55"><ellipse cx="36" cy="76" rx="6" ry="3"/><ellipse cx="84" cy="76" rx="6" ry="3"/></g>';
  const decoration =
    species.egg === "celestial"
      ? '<path d="m101 15 3 7 8 2-8 2-3 7-2-7-8-2 8-2Z" fill="#ffefa2"/>'
      : species.egg === "cristalizado"
        ? '<path d="m102 19 6 11-6 11-6-11Z" fill="#daffff"/>'
        : '<circle cx="102" cy="29" r="5" fill="#fff1bc"/>';
  const rings =
    stage > 0
      ? `<ellipse cx="60" cy="111" rx="${32 + stage * 5}" ry="7" fill="none" stroke="${stage === 3 ? "#ffe49b" : "#cfb4eb"}" stroke-width="3" ${stage === 1 ? 'stroke-dasharray="3 4"' : ""}/>`
      : "";
  const content = mystery
    ? '<path d="M39 42a23 23 0 1 1 35 20L60 72v8" fill="none" stroke="#d4bfdf" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="97" r="4" fill="#d4bfdf"/>'
    : `${rings}<g style="color:${species.color}" stroke="#593755" stroke-width="2.5" stroke-linejoin="round">${shapes[species.shape]}</g>${face}${decoration}`;
  const svg = `<svg class="pet-art" viewBox="0 0 120 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><ellipse cx="60" cy="113" rx="34" ry="6" fill="#20102e" opacity=".25"/>${content}</svg>`;
  return mystery ? svg : withArtwork(svg, ARTWORK.pets?.[id]);
}
