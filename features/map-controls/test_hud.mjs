// Run: node test_hud.mjs — HUD collapse/expand tokens and logic; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import {
  HUD_COLLAPSE_MS,
  LEAVE_DEBOUNCE_MS,
  PIN_BY_DEFAULT,
  COLLAPSED_LEGEND_WIDTH,
  resolveExpanded,
} from './src/components/hudReveal.js'

test('HUD_COLLAPSE_MS is in safe range 120–250 ms', () => {
  strictAssert.ok(HUD_COLLAPSE_MS >= 120 && HUD_COLLAPSE_MS <= 250,
    `HUD_COLLAPSE_MS=${HUD_COLLAPSE_MS} outside safe range`)
})

test('LEAVE_DEBOUNCE_MS is in safe range 80–200 ms', () => {
  strictAssert.ok(LEAVE_DEBOUNCE_MS >= 80 && LEAVE_DEBOUNCE_MS <= 200,
    `LEAVE_DEBOUNCE_MS=${LEAVE_DEBOUNCE_MS} outside safe range`)
})

test('PIN_BY_DEFAULT is false', () => {
  strictAssert.equal(PIN_BY_DEFAULT, false)
})

test('COLLAPSED_LEGEND_WIDTH is 180 px', () => {
  strictAssert.equal(COLLAPSED_LEGEND_WIDTH, 180)
})

test('resolveExpanded truth table', () => {
  // pinned=true overrides everything
  strictAssert.equal(resolveExpanded({ pinned: true, hovered: false, focused: false }), true)
  strictAssert.equal(resolveExpanded({ pinned: true, hovered: true, focused: true }), true)
  strictAssert.equal(resolveExpanded({ pinned: true, hovered: false, focused: true }), true)

  // not pinned: hover or focus expands
  strictAssert.equal(resolveExpanded({ pinned: false, hovered: true, focused: false }), true)
  strictAssert.equal(resolveExpanded({ pinned: false, hovered: false, focused: true }), true)
  strictAssert.equal(resolveExpanded({ pinned: false, hovered: true, focused: true }), true)

  // nothing active: collapsed
  strictAssert.equal(resolveExpanded({ pinned: false, hovered: false, focused: false }), false)

  // default params (all undefined) -> false
  strictAssert.equal(resolveExpanded({}), false)
})