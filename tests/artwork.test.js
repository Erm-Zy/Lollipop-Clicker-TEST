import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  ARTWORK,
  isArtworkPath,
  configuredArtworkPaths,
  lollipopArtwork,
  withArtwork,
} from "../js/ui/assets.js";
import * as art from "../js/ui/art.js";
import { FLAVORS_DATA, SKINS_DATA, UPGRADES_DATA } from "../js/data.js";

test("art registry uses the existing catalog IDs and numeric boss/world selectors", () => {
  for (const [group, catalog] of [
    ["flavors", FLAVORS_DATA],
    ["skins", SKINS_DATA],
    ["buildings", UPGRADES_DATA],
  ])
    assert.deepEqual(Object.keys(ARTWORK[group]), Object.keys(catalog));
  assert.deepEqual(Object.keys(ARTWORK.bosses), ["0", "1", "2"]);
  assert.deepEqual(Object.keys(ARTWORK.worlds), ["0", "1", "2", "3"]);
});
test("configured artwork is local, exists on disk and can be packaged offline", () => {
  const entries = [
    ARTWORK.main,
    ...["flavors", "skins", "buildings", "bosses", "worlds"].flatMap((group) =>
      Object.values(ARTWORK[group]),
    ),
  ];
  for (const path of entries) {
    if (path === null) continue;
    assert.ok(isArtworkPath(path), `Caminho inválido: ${path}`);
    assert.ok(existsSync(path), `Imagem configurada ausente: ${path}`);
  }
  assert.deepEqual(configuredArtworkPaths(), [
    ...new Set(entries.filter(isArtworkPath)),
  ]);
});
test("remote paths, traversal and markup cannot become image URLs", () => {
  const svg = '<svg viewBox="0 0 10 10"><path/></svg>';
  for (const path of [
    null,
    "",
    "https://example.com/a.png",
    "../a.png",
    "assets/images/../a.png",
    "assets/images/A.PNG",
    'assets/images/a.png" onload="x',
    "data:image/png;base64,x",
  ])
    assert.equal(withArtwork(svg, path), svg);
});
test("unconfigured SVG output matches the pre-integration artwork for every combination", () => {
  // Snapshot of rendering at 7fe208f; normalizes generated gradient IDs only.
  const saved = structuredClone(ARTWORK);
  try {
    for (const [key, value] of Object.entries(ARTWORK))
      if (value && typeof value === "object")
        for (const id of Object.keys(value)) value[id] = null;
      else ARTWORK[key] = null;
    const out = [];
    for (const f of Object.keys(FLAVORS_DATA))
      for (const s of Object.keys(SKINS_DATA)) out.push(art.lollipopSVG(f, s));
    for (const k of Object.keys(UPGRADES_DATA))
      for (const l of [0, 10, 100]) out.push(art.buildingSVG(k, l));
    for (let l = 0; l < 6; l++) out.push(art.bossSVG(l));
    for (let s = 0; s < 4; s++) out.push(art.worldSVG(s));
    for (const k of Object.keys(SKINS_DATA))
      for (const c of ["skin", "theme", "particles"])
        out.push(art.collectionSVG(k, c));
    assert.equal(
      createHash("sha256")
        .update(out.join("\n").replaceAll(/candy-art-\d+/g, "art-id"))
        .digest("hex"),
      "caf277fd0aa085ebeb49bd4489ac2e5d3f447e1a138fadfa4a763e910ff39938",
    );
  } finally {
    Object.assign(ARTWORK, saved);
  }
});
test("custom main and flavors do not require or override unconfigured skin combinations", () => {
  const saved = structuredClone(ARTWORK);
  try {
    ARTWORK.main = "assets/images/lollipops/main/main.png";
    ARTWORK.flavors.uva = "assets/images/lollipops/flavors/uva.png";
    ARTWORK.skins.neon = null;
    assert.equal(lollipopArtwork("morango", "classic"), ARTWORK.main);
    assert.equal(lollipopArtwork("uva", "classic"), ARTWORK.flavors.uva);
    assert.equal(lollipopArtwork("uva", "neon"), null);
    ARTWORK.skins.neon = "assets/images/lollipops/skins/neon.png";
    assert.equal(lollipopArtwork("uva", "neon"), ARTWORK.skins.neon);
  } finally {
    Object.assign(ARTWORK, saved);
  }
});
test("optional image retains SVG classes, viewport, aspect ratio and fallback without inline events", () => {
  const svg =
    '<svg class="building-illustration" viewBox="0 0 120 100"><g class="gear"/></svg>';
  const output = withArtwork(svg, "assets/images/buildings/maquina.png");
  assert.ok(
    output.startsWith(
      '<svg class="building-illustration" viewBox="0 0 120 100">',
    ),
  );
  assert.ok(output.includes('<g data-art-fallback><g class="gear"/></g>'));
  assert.ok(output.includes('preserveAspectRatio="xMidYMid meet"'));
  assert.ok(output.includes('opacity="0"'));
  assert.ok(!/onerror=|onload=/.test(output));
});
