import './styles.css';
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
    renderList(elements.warnings, result.warnings);
    renderList(elements.errors, result.errors);
  });

  elements.clear.addEventListener('click', () => {
    elements.source.value = '';
    elements.plainOutput.value = '';
    elements.base64Output.value = '';
    elements.summary.textContent = 'Paste Shadowrocket links to begin.';
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
