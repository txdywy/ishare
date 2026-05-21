# QR Code Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local per-node QR code generation for converted v2rayNG-compatible links.

**Architecture:** Keep conversion logic unchanged and add QR rendering at the UI boundary. `src/main.ts` will render one QR card per converted link using a local QR library, with QR output cleared by the existing clear flow.

**Tech Stack:** Vite, TypeScript, Vitest, jsdom, `qrcode` for local browser QR rendering.

---

## File Structure

- Modify `package.json` / `package-lock.json`: add the local QR generation dependency.
- Modify `index.html`: add a QR section in the output panel.
- Modify `src/main.ts`: import QR library, track QR container, render QR cards after conversion, clear cards on reset.
- Modify `src/styles.css`: style QR cards responsively.
- Modify `test/main.test.ts`: mock QR rendering and verify per-link QR behavior.

---

### Task 1: Add QR DOM behavior with TDD

**Files:**
- Modify: `test/main.test.ts`
- Modify: `src/main.ts`
- Modify: `index.html`

- [ ] **Step 1: Write the failing test**

Add a mocked `qrcode` module and assertions that converting one link renders one QR canvas/card in `test/main.test.ts`:

```ts
import QRCode from 'qrcode';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn(async () => undefined),
  },
}));
```

Add `div id="qrList"` to the test fixture and assert:

```ts
expect(app.qrList.children).toHaveLength(1);
expect(QRCode.toCanvas).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), app.plainOutput.value, expect.objectContaining({ errorCorrectionLevel: 'M' }));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/main.test.ts`

Expected: FAIL because `#qrList` is missing or QR rendering is not implemented.

- [ ] **Step 3: Add minimal implementation**

In `index.html`, add:

```html
<div class="qr-section" aria-live="polite">
  <h3>节点二维码</h3>
  <div id="qrList" class="qr-list"></div>
</div>
```

In `src/main.ts`, add `qrList` to `AppElements`, clear it on reset, and after conversion render one canvas per `result.links` using `QRCode.toCanvas(canvas, link, { errorCorrectionLevel: 'M', margin: 2, width: 220 })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/main.test.ts`

Expected: PASS.

---

### Task 2: Style and verify QR cards

**Files:**
- Modify: `src/styles.css`
- Modify: `test/main.test.ts`

- [ ] **Step 1: Write clearing regression test**

Extend the clear test in `test/main.test.ts`:

```ts
expect(app.qrList.children).toHaveLength(0);
```

- [ ] **Step 2: Run test to verify it fails if clear path is incomplete**

Run: `npm test -- test/main.test.ts`

Expected: PASS only if Task 1 already clears QR cards; otherwise FAIL and fix clear flow.

- [ ] **Step 3: Add QR styling**

Add styles for `.qr-section`, `.qr-list`, `.qr-card`, `.qr-card canvas`, and `.qr-value` so cards are readable and responsive inside the existing output panel.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: all tests pass and production build succeeds.

---

### Task 3: Browser verify, commit, and push

**Files:**
- All modified files

- [ ] **Step 1: Browser verification**

Run the dev server and use the existing page to paste a single converted-compatible or Shadowrocket VLESS link. Click convert and verify:

- The plain URI output is populated.
- The QR section renders one QR card.
- Clear removes the QR card.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json index.html src/main.ts src/styles.css test/main.test.ts docs/superpowers/plans/2026-05-21-qr-code-generation.md
git commit -m "Add per-node QR code generation"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

Expected: `main` pushes successfully and Pages deployment is triggered.

---

## Self-Review

- Spec coverage: per-node QR generation, local-only QR rendering, clear behavior, tests, build, browser verification, commit/push are covered.
- Placeholder scan: no TBD/TODO placeholders remain.
- Type consistency: `qrList`, QR card, and `QRCode.toCanvas` names are consistent across tasks.
