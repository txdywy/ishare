import './styles.css';
import QRCode from 'qrcode';
import { convertInput } from './converter';

interface AppElements {
  source: HTMLTextAreaElement;
  convert: HTMLButtonElement;
  clear: HTMLButtonElement;
  copyPlain: HTMLButtonElement;
  copyBase64: HTMLButtonElement;
  summary: HTMLOutputElement;
  plainOutput: HTMLTextAreaElement;
  base64Output: HTMLTextAreaElement;
  qrList: HTMLDivElement;
  warnings: HTMLUListElement;
  errors: HTMLUListElement;
}

export function initApp(root: ParentNode = document) {
  const elements = getElements(root);

  elements.convert.addEventListener('click', () => {
    const result = convertInput(elements.source.value);

    elements.plainOutput.value = result.plain;
    elements.base64Output.value = result.base64;
    elements.summary.textContent = formatSummary(result.links.length);
    renderQRCodes(elements.qrList, result.links);
    renderList(elements.warnings, result.warnings);
    renderList(elements.errors, result.errors);
  });

  elements.clear.addEventListener('click', () => {
    elements.source.value = '';
    elements.plainOutput.value = '';
    elements.base64Output.value = '';
    elements.summary.textContent = 'Paste Shadowrocket links to begin.';
    elements.qrList.replaceChildren();
    renderList(elements.warnings, []);
    renderList(elements.errors, []);
  });

  elements.copyPlain.addEventListener('click', () => copyText(elements.plainOutput.value));
  elements.copyBase64.addEventListener('click', () => copyText(elements.base64Output.value));
}

function getElements(root: ParentNode): AppElements {
  return {
    source: getElement(root, 'source', HTMLTextAreaElement),
    convert: getElement(root, 'convert', HTMLButtonElement),
    clear: getElement(root, 'clear', HTMLButtonElement),
    copyPlain: getElement(root, 'copyPlain', HTMLButtonElement),
    copyBase64: getElement(root, 'copyBase64', HTMLButtonElement),
    summary: getElement(root, 'summary', HTMLOutputElement),
    plainOutput: getElement(root, 'plainOutput', HTMLTextAreaElement),
    base64Output: getElement(root, 'base64Output', HTMLTextAreaElement),
    qrList: getElement(root, 'qrList', HTMLDivElement),
    warnings: getElement(root, 'warnings', HTMLUListElement),
    errors: getElement(root, 'errors', HTMLUListElement),
  };
}

function getElement<T extends Element>(root: ParentNode, id: string, constructor: new () => T): T {
  const element = root.querySelector(`#${id}`);

  if (!(element instanceof constructor)) {
    throw new Error(`Missing #${id}`);
  }

  return element;
}

function formatSummary(count: number) {
  return count === 1 ? 'Converted 1 link.' : `Converted ${count} links.`;
}

function renderQRCodes(container: HTMLDivElement, links: string[]) {
  container.replaceChildren(
    ...links.map((link, index) => {
      const card = document.createElement('article');
      card.className = 'qr-card';

      const title = document.createElement('h4');
      title.textContent = getLinkName(link, index);

      const canvas = document.createElement('canvas');
      void QRCode.toCanvas(canvas, link, { errorCorrectionLevel: 'M', margin: 2, width: 220 });

      const value = document.createElement('p');
      value.className = 'qr-value';
      value.textContent = link;

      const copyButton = document.createElement('button');
      copyButton.className = 'ghost';
      copyButton.type = 'button';
      copyButton.textContent = '复制该节点';
      copyButton.addEventListener('click', () => copyText(link));

      card.replaceChildren(title, canvas, value, copyButton);
      return card;
    }),
  );
}

function getLinkName(link: string, index: number) {
  const fragment = link.split('#')[1];

  return fragment ? decodeURIComponent(fragment) : `节点 ${index + 1}`;
}

function renderList(list: HTMLUListElement, items: string[]) {
  list.replaceChildren(
    ...items.map((item) => {
      const element = document.createElement('li');
      element.textContent = item;
      return element;
    }),
  );
}

async function copyText(text: string) {
  if (!text || !navigator.clipboard) {
    return;
  }

  await navigator.clipboard.writeText(text);
}

if (typeof document !== 'undefined' && document.querySelector('#source')) {
  initApp(document);
}
