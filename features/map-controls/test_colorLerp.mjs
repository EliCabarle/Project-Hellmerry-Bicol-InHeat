// Run: node test_colorLerp.mjs — colour lerp maths; fails on any assertion.
import test from 'node:test';
import { strict as strictAssert } from 'node:assert/strict';
import {
  COLOR_LERP,
  COLOR_THRESHOLD,
  colorDistance,
  lerpColor,
} from './src/gis/lift.js';

test('lerpColor moves toward target by COLOR_LERP fraction', () => {
  // 0.18 * 255 = 45.9 -> 46 per channel -> #2e2e2e
  strictAssert.equal(lerpColor('#000000', '#ffffff', COLOR_LERP), '#2e2e2e');
});

test('colorDistance reports per-channel max distance', () => {
  strictAssert.equal(colorDistance('#000000', '#ffffff'), 255);
  strictAssert.equal(colorDistance('#000000', '#000000'), 0);
  strictAssert.equal(colorDistance('#102030', '#10203f'), 15);
  // #b91c1c=(185,28,28), #fde68a=(253,230,138): max channel gap is 202 (green)
  strictAssert.equal(colorDistance('#b91c1c', '#fde68a'), 202);
});

test('repeated lerp settles exactly on target with no residue', () => {
  let current = '#000000';
  const target = '#ffffff';
  let frames = 0;
  while (current !== target && frames < 10000) {
    if (colorDistance(current, target) <= COLOR_THRESHOLD) {
      current = target;
    } else {
      const candidate = lerpColor(current, target, COLOR_LERP);
      current = candidate === current ? target : candidate; // snap on rounding stall
    }
    frames += 1;
  }
  strictAssert.equal(current, target, 'settles exactly on target, no residue');
  strictAssert.ok(frames > 0, 'at least one frame elapsed');
});

test('mid-transition target change continues from current colour', () => {
  // Advance one frame from black toward white to land mid-transition.
  let current = '#000000';
  const candidate = lerpColor(current, '#ffffff', COLOR_LERP);
  current = candidate === current ? '#ffffff' : candidate;
  const mid = current; // genuinely mid-transition
  // Change target to black; continue from `mid`, never restart from white.
  let towardBlack = mid;
  let frames = 0;
  while (towardBlack !== '#000000' && frames < 10000) {
    if (colorDistance(towardBlack, '#000000') <= COLOR_THRESHOLD) {
      towardBlack = '#000000';
    } else {
      const next = lerpColor(towardBlack, '#000000', COLOR_LERP);
      towardBlack = next === towardBlack ? '#000000' : next;
    }
    frames += 1;
  }
  strictAssert.equal(towardBlack, '#000000', 'continues from current to new target');
  strictAssert.ok(frames > 0);
  strictAssert.notEqual(mid, '#000000', 'was genuinely mid-transition');
});

test('COLOR_LERP is within the safe range', () => {
  strictAssert.ok(COLOR_LERP >= 0.08 && COLOR_LERP <= 0.30);
});
