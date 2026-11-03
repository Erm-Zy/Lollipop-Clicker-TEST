// Original vector illustrations shared by every page. IDs stay unique per render.
let illustrationId = 0;
const uid = () => `candy-art-${++illustrationId}`;
const flavorColors = {
  morango: ["#ff73a8", "#df326d", "#fff2d9"],
  limao: ["#cced74", "#64b65d", "#fff8ce"],
  blueberry: ["#a8a0ff", "#6550b5", "#e9f5ff"],
  uva: ["#cd8fe9", "#8f3da5", "#f9e3ff"],
  laranja: ["#ffc66f", "#f07839", "#fff4ce"],
  melancia: ["#ff8797", "#df4262", "#a9ec9d"],
  abacaxi: ["#ffe98a", "#efb745", "#fff8df"],
  chocolate: ["#b67f62", "#744733", "#ffdfb6"],
  algodao: ["#9ae5ea", "#d283df", "#fff2fb"],
  arcoiris: ["#bfa0f3", "#6d6fce", "#ffe797"],
  lendario: ["#ffe495", "#c99238", "#fff6d9"],
};
const skinColors = {
  classic: null,
  neon: ["#6cf5d5", "#24a7bd", "#e9fff8"],
  rainbow: ["#b8a0fb", "#e65ba0", "#ffe794"],
  gold: ["#ffe49b", "#cf933c", "#fff9de"],
  cosmic: ["#afa1f7", "#57469a", "#e7ddff"],
  fire: ["#ffac71", "#e24f4f", "#ffe5a3"],
  ice: ["#aff3fb", "#539ed2", "#f1ffff"],
};
const star = (x, y, size, color = "#fff0b5") =>
  `<path d="M${x} ${y - size}l${size * 0.3} ${size * 0.7} ${size * 0.7} ${size * 0.3}-${size * 0.7} ${size * 0.3}-${size * 0.3} ${size * 0.7}-${size * 0.3}-${size * 0.7}-${size * 0.7}-${size * 0.3} ${size * 0.7}-${size * 0.3}Z" fill="${color}"/>`;

export function lollipopSVG(
  flavor = "morango",
  skin = "classic",
  small = false,
) {
  const id = uid();
  const [light, dark, cream] =
    skinColors[skin] || flavorColors[flavor] || flavorColors.morango;
  const cosmic = skin === "cosmic";
  const extra =
    skin === "gold"
      ? '<path d="m98 54 14-32 23 20 21-28 17 28 26-17 13 34Z" fill="#ffe7a2" stroke="#9b603e" stroke-width="5" stroke-linejoin="round"/><circle cx="156" cy="36" r="5" fill="#f294ab"/>'
      : skin === "fire"
        ? '<path d="M98 67c-13-28 18-42 11-63 32 11 24 41 42 40 17-3 14-20 16-32 39 25 37 50 18 63Z" fill="#ffcf72" stroke="#b64655" stroke-width="4"/>'
        : "";
  const sparkle =
    cosmic || skin === "gold" || skin === "ice"
      ? `${star(95, 103, 8, cream)}${star(198, 143, 7, cream)}${star(181, 78, 4, cream)}`
      : "";
  return `<svg class="lollipop-illustration" viewBox="0 0 310 390" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${id}-sweet" cx="32%" cy="24%" r="82%"><stop stop-color="${light}"/><stop offset=".65" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
      <linearGradient id="${id}-stick" x1="0" x2="1"><stop stop-color="#c6aecb"/><stop offset=".42" stop-color="#fff8e9"/><stop offset=".78" stop-color="#eedccf"/><stop offset="1" stop-color="#b69ab9"/></linearGradient>
      <clipPath id="${id}-clip"><circle cx="155" cy="133" r="106"/></clipPath>
    </defs>
    <ellipse cx="159" cy="367" rx="67" ry="11" fill="#3b194a" opacity=".17"/>
    <g transform="rotate(-12 155 163)">
      <rect x="145" y="191" width="21" height="176" rx="10" fill="url(#${id}-stick)" stroke="#78496b" stroke-width="3"/>
      ${extra}
      <circle cx="155" cy="138" r="112" fill="#703752"/>
      <circle cx="155" cy="131" r="111" fill="${light}" stroke="#67314f" stroke-width="4"/>
      <circle cx="155" cy="132" r="104" fill="url(#${id}-sweet)"/>
      <g clip-path="url(#${id}-clip)">
        <path d="M155 132c-8-2-13 4-10 12 5 13 25 11 31-1 12-24-11-46-34-35-34 16-29 59 5 69 49 14 86-40 60-81-33-53-111-33-124 24-18 78 66 124 127 81 75-53 44-158-37-177C69-1-4 103 42 183" fill="none" stroke="${cream}" stroke-width="22" stroke-linecap="round"/>
        ${flavor === "melancia" && skin === "classic" ? '<g fill="#744653"><ellipse cx="101" cy="115" rx="3" ry="7" transform="rotate(-30 101 115)"/><ellipse cx="191" cy="173" rx="3" ry="7" transform="rotate(32 191 173)"/></g>' : ""}
        ${sparkle}
      </g>
      <path d="M75 92c13-25 37-42 66-45" fill="none" stroke="#fff9ee" opacity=".64" stroke-width="10" stroke-linecap="round"/>
      <path d="M229 165c-12 26-32 43-57 49" fill="none" stroke="${dark}" opacity=".35" stroke-width="6" stroke-linecap="round"/>
      <circle cx="111" cy="70" r="5" fill="#fff8e8" opacity=".85"/>
      <path d="m152 238-35-13 2 39 35-13 35 11-1-39-34 15Z" fill="#a8e4ce" stroke="#497d80" stroke-width="3" stroke-linejoin="round"/>
      <path d="m120 230 23 13-22 14m65-28-22 14 23 13" fill="none" stroke="#dff7d8" stroke-width="3" opacity=".7"/>
      <ellipse cx="154" cy="244" rx="9" ry="13" fill="#74bda9" stroke="#497d80" stroke-width="3"/>
    </g>
    ${small ? "" : `${star(40, 103, 7, "#ffe1a4")}${star(268, 73, 11, "#ffe1a4")}${star(256, 257, 6, "#a0dfc4")}`}
  </svg>`;
}

const machinePalettes = [
  ["#b5dacf", "#5c9f9a", "#f6c078"],
  ["#e8a8bd", "#af658d", "#ffc86d"],
  ["#b9b0df", "#8171ab", "#f4aa9e"],
  ["#a3d9c4", "#4b9e91", "#efb4ce"],
  ["#f0c18e", "#b37967", "#a7dbbd"],
  ["#a9d4ed", "#6e99c6", "#c1e78e"],
  ["#e1a4cf", "#a869ac", "#a9ddd4"],
  ["#f2d79c", "#b98263", "#dd99c5"],
];
const buildingKeys = [
  "maquina",
  "calda",
  "fabrica",
  "misturador",
  "embaladora",
  "laboratorio",
  "linha",
  "superfabrica",
];
function gear(cx, cy, fill = "#f5d8a7") {
  return `<g class="gear"><path d="M${cx - 4} ${cy - 14}h8l2 5 5 2 5 4v7l-5 2-2 5-5 3h-8l-2-5-5-2-4-5v-7l5-2 2-5Z" fill="${fill}" stroke="#5b3b62" stroke-width="2"/><circle cx="${cx}" cy="${cy + 2}" r="5" fill="#6a4b72"/></g>`;
}

export function buildingSVG(key = "maquina", level = 0) {
  const idx = Math.max(0, buildingKeys.indexOf(key));
  const [light, shade, accent] = machinePalettes[idx];
  let machine;
  if (idx === 0) {
    machine = `<path d="M39 19h42l-8 19H47Z" fill="${accent}"/><rect x="28" y="38" width="64" height="44" rx="10" fill="${light}"/><path d="M28 56h64v26H28Z" fill="${shade}"/><circle cx="56" cy="56" r="16" fill="#f9e8ca"/><path d="M56 47c-9 0-9 16 0 16 13 0 13-22-1-22" fill="none" stroke="#e5739f" stroke-width="5"/>${gear(82, 66)}<path d="M45 83v9m31-9v9"/>`;
  } else if (idx === 1) {
    machine = `<path d="M32 36q28-18 56 0v36q-28 19-56 0Z" fill="${light}"/><ellipse cx="60" cy="36" rx="28" ry="10" fill="#f7d19b"/><path d="M37 34c11 5 35 5 46 0" fill="none" stroke="#d99572" stroke-width="7"/><path d="M46 30 40 14m19 13V9m17 21 7-14" stroke="${shade}" stroke-width="7" stroke-linecap="round"/><path d="M35 47c12 0 5 15 15 15s3-11 13-12 8 12 16 9V47" fill="${accent}" stroke="none"/><path d="M29 76h62v10H29Z" fill="${shade}"/><path d="M87 56h14v15H88" fill="none" stroke="${shade}" stroke-width="6"/>`;
  } else if (idx === 2 || idx === 7) {
    machine = `<path d="M24 86V39l23-14 23 14V22h25v64Z" fill="${light}"/><path d="m18 40 29-20 25 19M69 23h28" fill="none" stroke="${shade}" stroke-width="9" stroke-linejoin="round"/><path d="M78 22V9h12v13" fill="${accent}"/><g fill="#fff1ae"><rect x="33" y="49" width="14" height="17" rx="3"/><rect x="54" y="49" width="14" height="17" rx="3"/><rect x="77" y="41" width="10" height="13" rx="2"/></g><path d="M43 86V72h20v14" fill="${shade}"/><path class="steam" d="M80 3c-8-8 3-10 0-17" fill="none" stroke="#f6d6e9" stroke-width="6" stroke-linecap="round" opacity=".7"/>${idx === 7 ? '<path d="m43 19-4-14 13 7 10-11 6 14 13-3-7 18Z" fill="#ffe2a0"/>' : ""}`;
  } else if (idx === 3) {
    machine = `<path d="M29 50h64L82 81H41Z" fill="${light}"/><path d="M44 81h35v8H44Z" fill="${shade}"/><path d="M68 48V18h25v-8H58v39" fill="${shade}"/><path d="M53 40h26v9H53Z" fill="${accent}"/><path d="M37 58c13 8 32 8 46 0" fill="none" stroke="#f8dec6" stroke-width="5"/>${gear(62, 54, accent)}`;
  } else if (idx === 4 || idx === 6) {
    machine = `<rect x="12" y="64" width="98" height="22" rx="11" fill="${shade}"/><path d="M22 76h76" stroke="#f5d9bd" stroke-width="3" stroke-dasharray="5 6"/><path d="M26 64V23h66v41" fill="none" stroke="${light}" stroke-width="11"/><path d="M47 22h23v17H47Z" fill="${accent}"/><path d="M57 38v15" stroke="${shade}" stroke-width="7"/><path d="m36 62 8-12 14 1 9 11m9 0 8-12 14 1 6 11" fill="#f4b1cb"/>${idx === 6 ? gear(84, 31, accent) : '<path d="m37 56 7-6 14 1 8 10-17 4Z" fill="#f3d9a0"/>'}`;
  } else {
    machine = `<path d="M31 78h65v10H31Z" fill="${shade}"/><path d="M52 17h23v12l18 39q6 13-13 13H45q-16 0-11-13l18-39Z" fill="${light}"/><path d="m43 55-7 16q0 8 10 8h33q13 0 11-8l-7-16Z" fill="${accent}"/><path d="M49 18h29" stroke="${shade}" stroke-width="8"/><g fill="#fff8d4" stroke="none"><circle cx="53" cy="64" r="4"/><circle cx="73" cy="58" r="5"/><circle cx="67" cy="73" r="3"/></g><path class="steam" d="M94 43c9-15 16-1 6 5" fill="none" stroke="#b2e4b9" stroke-width="4"/>`;
  }
  return `<svg class="building-illustration" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><ellipse cx="60" cy="91" rx="48" ry="7" fill="#3c2147" opacity=".2"/><g stroke="#573751" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${machine}</g>${level >= 10 ? star(102, 18, 7, "#ffe19b") : ""}${level >= 100 ? star(16, 13, 6, "#a6edd2") : ""}</svg>`;
}

function candyTree(x, y, scale = 1, tint = "#ed8eb5") {
  return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0v79" stroke="#f5dfb5" stroke-width="9"/><path d="M0 34-11 13m11 37 12-15" stroke="#c780a2" stroke-width="4"/><circle cy="-10" r="25" fill="${tint}" stroke="#7b497f" stroke-width="3"/><path d="M0-11c-5-5-12 3-6 8 9 7 21-3 14-12-12-16-32-3-26 12" fill="none" stroke="#fff0d0" stroke-width="5" stroke-linecap="round"/></g>`;
}
function cloud(x, y, scale = 1, color = "#f9d3e1") {
  return `<g class="candy-cloud" transform="translate(${x} ${y}) scale(${scale})"><path d="M0 22c-8-21 19-31 30-18 6-30 48-31 55-3 24-13 49 8 38 27H4Z" fill="${color}" opacity=".84"/></g>`;
}

export function worldSVG(stage = 0) {
  const id = uid();
  const tier = Math.max(0, Math.min(4, Math.floor(stage)));
  return `<svg class="world-illustration" viewBox="0 0 640 650" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="#60458f"/><stop offset=".56" stop-color="#b56ba0"/><stop offset="1" stop-color="#f4b19d"/></linearGradient><linearGradient id="${id}-hill" x2="0" y2="1"><stop stop-color="#a0cbb1"/><stop offset="1" stop-color="#618e94"/></linearGradient><linearGradient id="${id}-road" x2="1" y2="1"><stop stop-color="#fce2b5"/><stop offset="1" stop-color="#e3a4b1"/></linearGradient></defs>
    <rect width="640" height="650" fill="url(#${id}-sky)"/>
    <circle cx="477" cy="103" r="50" fill="#ffe1b0" opacity=".9"/><circle cx="464" cy="89" r="7" fill="#f4bb9f" opacity=".55"/><circle cx="495" cy="116" r="11" fill="#f4bb9f" opacity=".55"/>
    ${cloud(32, 71, 1.2)}${cloud(371, 161, 0.94)}${cloud(196, 19, 0.75, "#c2b2e7")}
    ${star(348, 82, 5)}${star(97, 178, 5)}${star(561, 50, 5)}${star(236, 123, 3)}
    <path d="M-20 325 74 208q18-22 37 0l87 117 91-160q17-26 35 0l108 182 101-126q20-25 38 0l96 140v244H-20Z" fill="#8f78a9"/>
    <path d="m61 226 13-18q18-22 37 0l15 22-22-4-13 10-10-12Zm204-15 24-46q17-26 35 0l25 45-21-7-21 16-16-14Zm258 23 10-13q20-25 38 0l15 20-20-5-12 10-10-15Z" fill="#e9b7cf"/>
    <path d="M-20 374Q93 285 209 369T441 349 661 331v274H-20Z" fill="#bd8dab"/>
    <path d="M-20 414Q96 316 212 400T448 381 665 406v244H-20Z" fill="url(#${id}-hill)"/>
    <path d="M-20 546q106-94 233-24t245-20 207 44v104H-20Z" fill="#779e91"/>
    <path d="M298 350q-124 39-31 88t-23 69-38 69 69 74h112q-125-71-72-101t55-52-79-59 73-88Z" fill="url(#${id}-road)"/>
    <path d="M301 352q-96 37-13 82t-23 75-26 65 84 76" fill="none" stroke="#fff0ca" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round" opacity=".6"/>
    ${candyTree(50, 325, 1.1)}${candyTree(571, 359, 1.2, "#b69bdd")}${candyTree(147, 407, 0.7, "#eab488")}${candyTree(508, 495, 0.83)}
    <g transform="translate(337 248) scale(1.55)">${buildingSVG(tier >= 2 ? "fabrica" : "maquina", tier * 10).replace("<svg ", '<svg x="0" y="0" width="120" height="100" ')}</g>
    ${tier >= 1 ? `<g transform="translate(54 421) scale(1.2)">${buildingSVG("calda", tier * 10).replace("<svg ", '<svg width="120" height="100" ')}</g>` : '<g transform="translate(96 453)"><path d="m-26 18 26-29 27 29v33h-53Z" fill="#e6bad1" stroke="#754a75" stroke-width="3"/><path d="M-7 51V27H8v24" fill="#946693"/><path d="m-32 19 31-35 34 35" fill="none" stroke="#f2dbb6" stroke-width="8" stroke-linejoin="round"/></g>'}
    ${tier >= 3 ? `<g transform="translate(381 435) scale(1.24)">${buildingSVG("laboratorio", 30).replace("<svg ", '<svg width="120" height="100" ')}</g>` : ""}
    <g fill="#f8d4a6" stroke="#ad7a81" stroke-width="2"><ellipse cx="33" cy="582" rx="23" ry="13"/><ellipse cx="586" cy="588" rx="32" ry="17"/></g>
    <g transform="translate(407 561)"><path d="M-13 12c-12-24 10-36 25-23 8 8 6 21-1 30Z" fill="#f1aec6" stroke="#7a4e75" stroke-width="3"/><circle cx="-3" cy="1" r="2.7" fill="#66436b"/><circle cx="6" cy="1" r="2.7" fill="#66436b"/><path d="m-1 10 5 1m-15 10-6 7m21-8 6 6" stroke="#77446c" stroke-width="3" stroke-linecap="round"/></g>
    <g fill="#f7c7cf"><ellipse cx="21" cy="635" rx="60" ry="41"/><ellipse cx="90" cy="658" rx="66" ry="49"/><ellipse cx="600" cy="637" rx="76" ry="42"/></g>
    <g fill="#fff0cc" opacity=".9"><circle cx="43" cy="615" r="4"/><circle cx="76" cy="644" r="3"/><circle cx="584" cy="628" r="4"/><circle cx="619" cy="615" r="3"/></g>
  </svg>`;
}

export function bossSVG(level = 0) {
  const kind = Math.max(0, Math.floor(level)) % 3;
  const id = uid();
  const colors = [
    ["#e8a4cd", "#a7508b"],
    ["#ba8c74", "#71504f"],
    ["#b8e1ed", "#6c8fbf"],
  ][kind];
  let body;
  if (kind === 0) {
    body =
      '<path d="M64 234c-31-27-13-63 7-77-12-35 3-87 32-102 12-31 44-39 66-18 34-21 71-4 72 32 35 20 43 59 26 91 29 22 37 55 7 74Z" fill="url(#' +
      id +
      '-body)"/><path d="m105 64-10-24 24 10m93 20 19-23 4 29" fill="#fff0c4"/><path d="M70 156 39 134 27 149l29 30m201-17 34-22 12 16-32 28" fill="' +
      colors[0] +
      '"/>';
  } else if (kind === 1) {
    body =
      '<path d="m63 225 10-131 30-23 18-32 34 12 34-14 24 33 35 19 14 136Z" fill="url(#' +
      id +
      '-body)"/><path d="m85 98 28-12 20 11 24-11 25 10 24-12 31 13v22l-22 13-24-12-18 14-26-12-24 13-24-13-18 12Z" fill="#e9b59b" stroke="none"/><path d="m76 152-43-26-6 22 43 29m181-24 36-23 10 20-41 28" fill="' +
      colors[0] +
      '"/><path d="m113 53-4-21 20 11m61 3 16-20 8 25" fill="#efc6a3"/>';
  } else {
    body =
      '<path d="m64 230 14-120 27-33 3-29 33 8 19-28 24 27 32-8 6 32 25 29 14 122Z" fill="url(#' +
      id +
      '-body)"/><path d="m81 105 24-28 3-29 33 8 19-28 24 27 32-8 6 32 24 28-27 10-22-14-24 16-24-16-24 16-22-14Z" fill="#edffff"/><path d="m75 157-35-23-11 21 41 26m185-23 35-25 12 21-41 29" fill="' +
      colors[0] +
      '"/>';
  }
  return `<svg class="boss-illustration" viewBox="0 0 330 290" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-body" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient></defs><ellipse cx="164" cy="258" rx="109" ry="16" fill="#33223c" opacity=".28"/><g stroke="#513753" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">${body}<path d="m99 230-10 23h44l4-23m56 0 3 23h44l-11-23" fill="${colors[1]}"/><path d="m111 135 26 8m54 0 24-10" fill="none"/><ellipse cx="126" cy="158" rx="12" ry="15" fill="#fff6db" stroke="none"/><ellipse cx="201" cy="158" rx="12" ry="15" fill="#fff6db" stroke="none"/><ellipse cx="130" cy="161" rx="5" ry="8" fill="#513753" stroke="none"/><ellipse cx="197" cy="161" rx="5" ry="8" fill="#513753" stroke="none"/><path d="M139 190q24 27 49 0" fill="#613752"/><path d="m147 194 5 8 5-7m13 3 5 7 5-10" fill="#fff7d9" stroke="none"/><path d="m91 186 12 3m119-3 12-4" fill="none" stroke="#e990ae" stroke-width="7"/></g>${kind === 2 ? star(49, 89, 11, "#c4f2fa") + star(287, 64, 8, "#e7fbff") : star(280, 75, 9, "#ffe1a3")}</svg>`;
}

export function collectionSVG(key = "classic", category = "skin") {
  if (category === "flavor" || Object.hasOwn(flavorColors, key))
    return lollipopSVG(key, "classic", true);
  if (category === "skin") return lollipopSVG("morango", key, true);
  const colors = skinColors[key] || flavorColors.morango;
  if (category === "theme") {
    return `<svg class="collection-illustration" viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4" y="4" width="172" height="122" rx="19" fill="${colors[1]}"/><circle cx="136" cy="36" r="17" fill="#ffe2ad"/>${cloud(22, 24, 0.48, colors[2])}<path d="M4 94q42-45 88-9t84-12v34q0 19-19 19H23q-19 0-19-19Z" fill="${colors[0]}"/>${candyTree(49, 76, 0.4, colors[2])}<path d="M100 94q-31 16-4 32h22q-31-22-6-32" fill="#ffe1be"/></svg>`;
  }
  return `<svg class="collection-illustration" viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="90" cy="67" r="43" fill="${colors[1]}" opacity=".3"/>${star(90, 61, 24, colors[0])}${star(43, 35, 9, colors[2])}${star(139, 95, 11, colors[0])}${star(139, 34, 6, colors[2])}<g fill="${colors[0]}"><circle cx="46" cy="96" r="5"/><circle cx="119" cy="16" r="4"/><circle cx="24" cy="68" r="3"/></g></svg>`;
}
