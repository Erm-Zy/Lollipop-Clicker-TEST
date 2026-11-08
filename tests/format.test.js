import test from "node:test";
import assert from "node:assert/strict";
import { format, cost, exact, percent, multiplier } from "../js/format.js";
test("canonical pt-BR amounts handle signs, units and unsafe displays without changing amounts", () => {
  for (const [n, s] of [
    [0, "0"],
    [999, "999"],
    [999999, "1 mi"],
    [1e6, "1 mi"],
    [1e9, "1 bi"],
    [1e12, "1 tri"],
    [0.00012, "0,00012"],
    [950, "950"],
    [1000, "1 mil"],
    [1500, "1,5 mil"],
    [1250000, "1,25 mi"],
    [1e10, "10 bi"],
    [2.7e12, "2,7 tri"],
    [-1500, "-1,5 mil"],
  ])
    assert.equal(format(n), s);
  assert.equal(format(Infinity), "—");
  assert.equal(format(NaN), "—");
  assert.match(format(1e100), /e\+100/);
  assert.equal(percent(12.5), "12,5%");
  assert.equal(multiplier(1.25), "×1,25");
  assert.equal(exact(999999), "999.999");
});
test("cost abbreviations round upwards with exact accessible amounts available near thresholds", () => {
  assert.equal(cost(1000001), "1,01 mi");
  assert.equal(cost(999999), "1 mi");
  assert.equal(cost(999), "999");
  assert.equal(cost(1e9), "1 bi");
  assert.equal(cost(1e12), "1 tri");
  const balance = 1000000,
    price = 1000001;
  assert.ok(balance < price);
  assert.equal(price, 1000001);
  assert.equal(exact(price), "1.000.001");
});
