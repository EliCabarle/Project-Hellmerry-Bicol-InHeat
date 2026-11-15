// View-mode helpers — the Public/Analyst split.
//
// Public view speaks plain English: "Municipalities", no p-values, no SHAP
// jargon. Analyst view keeps the exact scientific wording. Only the words
// change here — computed values and units are never touched.

// "LGUs" -> "Municipalities" for the public copy. Returns the input unchanged
// for the analyst view.
export const termSwap = (text, term) =>
  term === 'LGUs' ? text : String(text ?? '').replace(/\bLGUs?\b/g, 'Municipalities')

// The template generator bakes statistical parentheticals into the prose —
// "(p < 0.001)", "(r=-0.38)". They are analyst detail; the sentence still
// reads correctly without them, so drop the parenthetical, not the clause.
export const publicNarration = (text) =>
  String(text ?? '').replace(/\s*\(\s*[pr]\s*[=<>≈]\s*[-−]?\d*\.?\d+\s*\)/g, '')
