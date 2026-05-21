export interface ConversionResult {
  links: string[];
  plain: string;
  base64: string;
  warnings: string[];
  errors: string[];
}

const knownSchemes = ['vmess://', 'vless://', 'trojan://', 'trojan-go://', 'ss://', 'ssr://'];
const trojanGoWarning = 'Converted trojan-go:// to trojan:// and dropped Trojan-Go-only compatibility assumptions.';
const ssrWarning = 'SSR is legacy and may not import in every v2rayNG build; kept it unchanged.';

type ConversionContext = Pick<ConversionResult, 'warnings' | 'errors'>;

export function convertInput(input: string): ConversionResult {
  const source = normalizeInput(input);
  const links: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  splitLines(source).forEach((line, index) => {
    const converted = convertLine(line, index + 1, { warnings, errors });

    if (converted) {
      links.push(converted);
    }
  });

  const plain = links.join('\n');

  return {
    links,
    plain,
    base64: encodeBase64(plain),
    warnings,
    errors,
  };
}

function normalizeInput(input: string) {
  const trimmed = input.trim();

  if (containsKnownScheme(trimmed)) {
    return trimmed;
  }

  const decoded = tryDecodeBase64(trimmed);

  return decoded && containsKnownScheme(decoded) ? decoded.trim() : trimmed;
}

function splitLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function containsKnownScheme(input: string) {
  return knownSchemes.some((scheme) => input.includes(scheme));
}

function convertLine(line: string, lineNumber: number, context: ConversionContext) {
  try {
    if (line.startsWith('vmess://')) {
      return convertVmess(line);
    }

    if (line.startsWith('vless://')) {
      return convertVless(line);
    }

    if (line.startsWith('trojan://') || line.startsWith('trojan-go://')) {
      return convertTrojan(line, context);
    }

    if (line.startsWith('ss://')) {
      return convertShadowsocks(line);
    }

    if (line.startsWith('ssr://')) {
      addUnique(context.warnings, ssrWarning);
      return line;
    }
  } catch {
    context.errors.push(`Line ${lineNumber}: unsupported or invalid share link.`);
    return null;
  }

  context.errors.push(`Line ${lineNumber}: unsupported or invalid share link.`);
  return null;
}

function convertVmess(line: string) {
  const payload = line.slice('vmess://'.length);
  const config = JSON.parse(decodeBase64(payload)) as Record<string, unknown>;
  const normalized = {
    ...config,
    v: String(config.v ?? '2'),
    ps: String(config.ps ?? ''),
    add: String(config.add ?? ''),
    port: String(config.port ?? ''),
    id: String(config.id ?? ''),
    aid: '0',
    scy: String(config.scy ?? 'auto'),
    net: String(config.net ?? 'tcp'),
    type: String(config.type ?? 'none'),
  } as Record<string, unknown>;

  if (typeof normalized.path === 'string' && normalized.path !== '') {
    normalized.path = ensureLeadingSlash(normalized.path);
  }

  return `vmess://${encodeBase64(JSON.stringify(normalized))}`;
}

function convertVless(line: string) {
  const url = new URL(line);
  const params = url.searchParams;
  const generated = new URLSearchParams();
  const orderedKeys = ['encryption', 'security', 'type', 'host', 'sni', 'path', 'serviceName', 'alpn', 'fp', 'pbk', 'sid', 'spx', 'flow', 'allowInsecure'];

  generated.set('encryption', params.get('encryption') ?? 'none');
  copyOrderedParams(params, generated, orderedKeys);
  copyRemainingParams(params, generated);

  return `vless://${url.username}@${url.hostname}:${url.port}?${stringifyParams(generated)}${formatFragment(url.hash)}`;
}

function convertTrojan(line: string, context: ConversionContext) {
  const isTrojanGo = line.startsWith('trojan-go://');
  const url = new URL(isTrojanGo ? line.replace(/^trojan-go:\/\//, 'trojan://') : line);
  const params = url.searchParams;
  const generated = new URLSearchParams();
  const orderedKeys = ['security', 'sni', 'type', 'host', 'path', 'serviceName', 'alpn', 'allowInsecure'];

  generated.set('security', params.get('security') ?? 'tls');
  copyOrderedParams(params, generated, orderedKeys);
  copyRemainingParams(params, generated);

  if (isTrojanGo) {
    addUnique(context.warnings, trojanGoWarning);
  }

  return `trojan://${encodeURIComponent(decodeURIComponent(url.username))}@${url.hostname}:${url.port}?${stringifyParams(generated)}${formatFragment(url.hash)}`;
}

function convertShadowsocks(line: string) {
  const withoutScheme = line.slice('ss://'.length);
  const hashIndex = withoutScheme.indexOf('#');
  const body = hashIndex === -1 ? withoutScheme : withoutScheme.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : withoutScheme.slice(hashIndex + 1);
  const queryIndex = body.indexOf('?');
  const bodyWithoutQuery = queryIndex === -1 ? body : body.slice(0, queryIndex);
  const query = queryIndex === -1 ? '' : body.slice(queryIndex + 1);
  const atIndex = bodyWithoutQuery.lastIndexOf('@');

  if (atIndex === -1) {
    const decoded = decodeBase64(bodyWithoutQuery);
    return convertShadowsocks(`ss://${decoded}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`);
  }

  const userInfo = bodyWithoutQuery.slice(0, atIndex);
  const serverInfo = bodyWithoutQuery.slice(atIndex + 1);
  const credentials = userInfo.includes(':') ? decodeURIComponent(userInfo) : decodeBase64(userInfo);
  const [method, ...passwordParts] = credentials.split(':');
  const password = passwordParts.join(':');
  const normalizedUserInfo = isAead2022(method)
    ? `${encodeURIComponent(method)}:${encodeURIComponent(password)}`
    : encodeBase64Url(`${method}:${password}`);

  return `ss://${normalizedUserInfo}@${serverInfo}${query ? `?${normalizeQuery(query)}` : ''}${fragment ? `#${encodeURIComponent(decodeURIComponent(fragment))}` : ''}`;
}

function copyOrderedParams(source: URLSearchParams, target: URLSearchParams, orderedKeys: string[]) {
  orderedKeys.forEach((key) => {
    const value = source.get(key);

    if (value !== null) {
      target.set(key, key === 'path' ? ensureLeadingSlash(value) : value);
    }
  });
}

function copyRemainingParams(source: URLSearchParams, target: URLSearchParams) {
  source.forEach((value, key) => {
    if (!target.has(key)) {
      target.set(key, key === 'path' ? ensureLeadingSlash(value) : value);
    }
  });
}

function stringifyParams(params: URLSearchParams) {
  return Array.from(params.entries())
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

function normalizeQuery(query: string) {
  const params = new URLSearchParams(query);

  return stringifyParams(params);
}

function formatFragment(hash: string) {
  if (!hash) {
    return '';
  }

  return `#${encodeURIComponent(decodeURIComponent(hash.slice(1)))}`;
}

function ensureLeadingSlash(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function isAead2022(method: string) {
  return method.startsWith('2022-blake3-');
}

function decodeBase64(input: string) {
  const normalized = padBase64(input.replace(/-/g, '+').replace(/_/g, '/'));
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function tryDecodeBase64(input: string) {
  try {
    return decodeBase64(input);
  } catch {
    return null;
  }
}

function encodeBase64(input: string) {
  const bytes = new TextEncoder().encode(input);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function encodeBase64Url(input: string) {
  return encodeBase64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function padBase64(input: string) {
  const remainder = input.length % 4;

  return remainder === 0 ? input : input + '='.repeat(4 - remainder);
}
