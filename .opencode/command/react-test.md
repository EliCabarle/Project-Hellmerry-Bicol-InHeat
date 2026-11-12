---
description: Write or expand React component tests using React Testing Library following the RED-GREEN-REFACTOR cycle. Optionally target a component, e.g. /react-test Counter
---

# react-test — Test-Driving React Components With RTL

Write tests for the component or behavior in `$ARGUMENTS`. If no target is given, cover components that changed work-in-progress.

## Framework Detection

- Detect the test runner: `vitest`, `jest`, or `@testing-library/react` + user-event.
- Check `package.json`, run `npm test` (or the detected runner) to confirm.

## Red-Green-Refactor Cycle

**RED** — Write one failing test for the behavior:

- Prefer user-visible queries: `getByRole`, `getByLabelText`, `getByPlaceholderText`, `getByText` with exact matches.
- Avoid testing implementation details. Do not assert on class names, style, internal state, or spies unless indispensable.
- Run the test, capture the failure — it should fail for the intended reason.

**GREEN** — Implement the minimal code change to pass it.

- No scope creep. Pass this one test, then the next.

**REFACTOR** — Clean code with tests green.

## Interaction & Async

- Use `userEvent` (not `fireEvent`) for realistic interaction.
- `await screen.findBy*` for async appearance; `waitFor` for asyncState transitions.
- Wrap updates in `act()` as the framework requires.

## Accessibility

- Include at least one `getByRole` interaction test per interactive component.
- Assert a11y invariants where applicable (label association, `aria-expanded` toggling).

## A11y Scanning (Optional)

If `jest-axe` / `vitest-axe` is installed, run it on rendered components.

## Skill References

- `react-testing` — RTL patterns, MSW, and test/feature boundaries
- `tdd-workflow` — full workflow with coverage targets
- `accessibility` / `frontend-a11y` — accessible queries and assertions

## Verification

Run the test runner once, show pass/fail summary. Do not stop with a failing
suite you introduced — keep the cycle until green.