// Run: node test_labels.mjs — copy-label sanity check; fails on any assertion.
import test from 'node:test'
import { strict as strictAssert } from 'node:assert/strict'
import { LABELS } from './src/labels.js'

const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
  console.log('ok:', msg)
}

// Every key must carry a non-empty plain headline.
Object.entries(LABELS).forEach(([key, entry]) => {
  assert(String(entry?.plain ?? '').trim().length > 0, `${key}: plain headline non-empty`)
})

// Technical terms that are science guardrails must survive verbatim.
assert(LABELS.methodPlain.tech.includes('α = 0.05'), 'method keeps Mann-Kendall alpha')
assert(LABELS.kpiWarming.tech.includes('a flag, never a filter'), 'significance flag wording kept')
assert(LABELS.chartWarming.tech.includes('°C/yr'), 'warming-rate unit kept')
assert(LABELS.chartDrivers.tech.includes('association, not causation'), 'causation guardrail kept')
assert(LABELS.finderBackCausation.plain.includes('Association, not causation'), 'causation phrase kept')
assert(LABELS.chartDrivers.tech.includes('RF · SHAP'), 'driver tech kept')
assert(LABELS.thTrend.tech.includes('Theil-Sen °C/yr'), 'slope header tech kept')
assert(LABELS.thDangerDays.tech.includes('45-year total above 42 °C'), 'danger header tech kept')

// No arbitrary sub-12px sizes leak into label strings (labels carry no classes, but keep it clean).
Object.values(LABELS).forEach((entry) => {
  assert(!String(entry.plain).includes('text-['), 'plain copy free of font-size literals')
  assert(!String(entry.tech).includes('text-['), 'tech copy free of font-size literals')
})

console.log('LABEL TESTS PASSED')
