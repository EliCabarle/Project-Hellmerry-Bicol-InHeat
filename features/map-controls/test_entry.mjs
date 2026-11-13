// Run: node test_entry.mjs — stagger constants + delay schedule; fails on any assertion.
import test from "node:test";
import { strict as strictAssert } from "node:assert/strict";
import {
  STAGGER_MS,
  STAGGER_CAP,
  ENTRY_DURATION_MS,
  ENTRY_FROM,
  entryDelays,
} from "./src/gis/entry.js";

test("stagger constants", () => {
  strictAssert.equal(STAGGER_MS, 18);
  strictAssert.equal(STAGGER_CAP, 900);
  strictAssert.equal(ENTRY_DURATION_MS, 300);
  strictAssert.equal(ENTRY_FROM, 0);
});

test("entryDelays: n<=1 returns [0]", () => {
  strictAssert.deepEqual(entryDelays(0), [0]);
  strictAssert.deepEqual(entryDelays(1), [0]);
});

test("entryDelays: length matches n", () => {
  strictAssert.equal(entryDelays(5).length, 5);
  strictAssert.equal(entryDelays(114).length, 114);
});

test("entryDelays: delays strictly increasing (non-reduced)", () => {
  const d = entryDelays(10);
  for (let i = 1; i < d.length; i++) {
    strictAssert.ok(d[i] >= d[i - 1], `delay[${i}] >= delay[${i - 1}]`);
  }
  strictAssert.equal(d[0], 0);
});

test("entryDelays: clamped inside STAGGER_CAP for all sizes", () => {
  for (const n of [1, 5, 10, 50, 114, 1000]) {
    const d = entryDelays(n);
    const lastStart = d[d.length - 1];
    // last area must start by STAGGER_CAP - ENTRY_DURATION_MS
    strictAssert.ok(
      lastStart <= STAGGER_CAP - ENTRY_DURATION_MS,
      `n=${n} last start ${lastStart} > ${STAGGER_CAP - ENTRY_DURATION_MS}`,
    );
    // whole wave finishes within STAGGER_CAP
    strictAssert.ok(
      lastStart + ENTRY_DURATION_MS <= STAGGER_CAP,
      `n=${n} wave end ${lastStart + ENTRY_DURATION_MS} > ${STAGGER_CAP}`,
    );
  }
});

test("entryDelays: 114 areas max delay is 600 ms (scaled, not dropped)", () => {
  const d = entryDelays(114);
  // unscaled would be 113 * 18 = 2034 ms; scaled to maxStart = STAGGER_CAP - ENTRY_DURATION_MS = 600 ms
  strictAssert.equal(d[113], 600);
  strictAssert.ok(d[112] < 600);
});

test("entryDelays: reduced motion => all delays 0", () => {
  const d = entryDelays(114, { reduced: true });
  for (const delay of d) strictAssert.equal(delay, 0);
});
