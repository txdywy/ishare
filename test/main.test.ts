// @vitest-environment jsdom
import QRCode from 'qrcode';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { initApp } from '../src/main';

vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn(async () => undefined),
  },
}));

function renderApp() {
  document.body.innerHTML = `
    <textarea id="source"></textarea>
    <button id="convert">Convert</button>
    <button id="clear">Clear</button>
    <button id="copyPlain">Copy plain</button>
    <button id="copyBase64">Copy base64</button>
    <output id="summary"></output>
    <textarea id="plainOutput"></textarea>
    <textarea id="base64Output"></textarea>
    <div id="qrList"></div>
    <ul id="warnings"></ul>
    <ul id="errors"></ul>
  `;

  initApp(document);

  return {
    source: document.querySelector<HTMLTextAreaElement>('#source')!,
    convert: document.querySelector<HTMLButtonElement>('#convert')!,
    clear: document.querySelector<HTMLButtonElement>('#clear')!,
    summary: document.querySelector<HTMLOutputElement>('#summary')!,
    plainOutput: document.querySelector<HTMLTextAreaElement>('#plainOutput')!,
    base64Output: document.querySelector<HTMLTextAreaElement>('#base64Output')!,
    qrList: document.querySelector<HTMLDivElement>('#qrList')!,
    warnings: document.querySelector<HTMLUListElement>('#warnings')!,
    errors: document.querySelector<HTMLUListElement>('#errors')!,
  };
}

describe('initApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('converts pasted links and renders copy-ready outputs', async () => {
    const app = renderApp();
    app.source.value = 'ss://YWVzLTEyOC1nY206dGVzdA@ss.example.invalid:8388#Name';

    app.convert.click();

    expect(app.summary.textContent).toBe('Converted 1 link.');
    expect(app.plainOutput.value).toBe('ss://YWVzLTEyOC1nY206dGVzdA@ss.example.invalid:8388#Name');
    expect(Buffer.from(app.base64Output.value, 'base64').toString('utf8')).toBe(app.plainOutput.value);
    expect(app.qrList.children).toHaveLength(1);
    await vi.waitFor(() => {
      expect(QRCode.toCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        app.plainOutput.value,
        expect.objectContaining({ errorCorrectionLevel: 'M' }),
      );
    });
    expect(app.warnings.children).toHaveLength(0);
    expect(app.errors.children).toHaveLength(0);
  });

  test('clears input, output, warnings, and errors', () => {
    const app = renderApp();
    app.source.value = 'bad input';

    app.convert.click();
    app.clear.click();

    expect(app.source.value).toBe('');
    expect(app.plainOutput.value).toBe('');
    expect(app.base64Output.value).toBe('');
    expect(app.summary.textContent).toBe('Paste Shadowrocket links to begin.');
    expect(app.qrList.children).toHaveLength(0);
    expect(app.warnings.children).toHaveLength(0);
    expect(app.errors.children).toHaveLength(0);
  });
});
