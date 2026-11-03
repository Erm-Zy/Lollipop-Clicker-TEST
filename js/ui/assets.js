// Arte opcional: caminhos locais, relativos à raiz do projeto. null mantém o SVG.
// Não é preciso desenhar todas as combinações de sabor e skin.
export const ARTWORK = {
  main: null,
  flavors: {
    morango: null,
    limao: null,
    blueberry: null,
    uva: null,
    laranja: null,
    melancia: null,
    abacaxi: null,
    chocolate: null,
    algodao: null,
    arcoiris: null,
    lendario: null,
  },
  skins: {
    classic: null,
    neon: null,
    rainbow: null,
    gold: null,
    cosmic: null,
    fire: null,
    ice: null,
  },
  buildings: {
    maquina: null,
    calda: null,
    fabrica: null,
    misturador: null,
    embaladora: null,
    laboratorio: null,
    linha: null,
    superfabrica: null,
  },
  // Tipos usados em bossSVG(level % 3): Geleião, Capitão, Dragão.
  bosses: { 0: null, 1: null, 2: null },
  // Estágios usados em worldSVG(stage): Colina, Vila, Vale, Reino.
  worlds: { 0: null, 1: null, 2: null, 3: null },
};

export function isArtworkPath(path) {
  return (
    typeof path === "string" &&
    /^assets\/images\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(png|webp)$/.test(path)
  );
}
export function configuredArtworkPaths() {
  return [
    ...new Set(
      [
        ARTWORK.main,
        ...Object.values(ARTWORK)
          .filter((value) => value && typeof value === "object")
          .flatMap(Object.values),
      ].filter(isArtworkPath),
    ),
  ];
}
export function lollipopArtwork(flavor, skin) {
  if (skin !== "classic") return ARTWORK.skins[skin] || null;
  return (
    ARTWORK.flavors[flavor] ||
    (flavor === "morango" ? ARTWORK.main || ARTWORK.skins.classic : null)
  );
}
const failed = new Set();
let observer;
function watchImages() {
  if (observer || typeof document === "undefined") return;
  function attach(image) {
    if (image.hasAttribute("href")) return;
    const url = image.getAttribute("data-art-url");
    const fallback = image.parentElement?.querySelector(
      ":scope > g[data-art-fallback]",
    );
    image.addEventListener(
      "load",
      () => {
        image.setAttribute("opacity", "1");
        if (fallback) fallback.style.display = "none";
      },
      { once: true },
    );
    image.addEventListener(
      "error",
      () => {
        failed.add(url);
        if (fallback) fallback.style.display = "";
        image.remove();
      },
      { once: true },
    );
    image.setAttribute("href", url);
  }
  // SVG image load events do not reliably reach document capture listeners.
  // Observe inserted elements only, and attach directly before assigning the URL.
  // This observer is never started when all optional images are disabled.
  observer = new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches("image[data-art-image]")) attach(node);
        for (const image of node.querySelectorAll("image[data-art-image]"))
          attach(image);
      }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
/** Keep the original SVG viewport, CSS classes and button hit area. */
export function withArtwork(svg, path) {
  if (!isArtworkPath(path)) return svg;
  const url = new URL("../../" + path, import.meta.url).href;
  if (failed.has(url)) return svg;
  watchImages();
  const start = svg.indexOf(">") + 1,
    end = svg.lastIndexOf("</svg>");
  return (
    svg.slice(0, start) +
    `<g data-art-fallback>${svg.slice(start, end)}</g><image data-art-image data-art-url="${url}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" opacity="0" pointer-events="none"/>` +
    svg.slice(end)
  );
}
