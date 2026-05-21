import { describe, expect, test } from 'vitest';
import { convertInput } from '../src/converter';

const vmessJson = {
  v: '2',
  ps: 'VMess Test',
  add: 'vmess.example.invalid',
  port: '443',
  id: '11111111-1111-4111-8111-111111111111',
  aid: '64',
  scy: 'auto',
  net: 'ws',
  type: 'none',
  host: 'cdn.example.invalid',
  path: 'ws',
  tls: 'tls',
  sni: 'vmess.example.invalid',
};

function base64(text: string) {
  return Buffer.from(text, 'utf8').toString('base64');
}

describe('convertInput', () => {
  test('normalizes a Shadowrocket-style mixed subscription into v2rayNG import links', () => {
    const vmess = `vmess://${base64(JSON.stringify(vmessJson)).replace(/=+$/, '')}`;
    const vless = 'vless://33333333-3333-4333-8333-333333333333@reality.example.invalid:443?security=reality&type=tcp&sni=www.example.com&fp=chrome&pbk=TEST_PUBLIC_KEY_DO_NOT_USE&sid=abcd1234&flow=xtls-rprx-vision#Reality Node';
    const trojanGo = 'trojan-go://test-password@trojan.example.invalid:443/?sni=trojan.example.invalid&type=ws&host=cdn.example.invalid&path=/trojan#Trojan Go';
    const ssLegacy = `ss://${base64('aes-128-gcm:test-password@ss.example.invalid:8388')}#SS Legacy`;
    const input = [vmess, vless, trojanGo, ssLegacy].join('\n');

    const result = convertInput(input);

    expect(result.errors).toEqual([]);
    expect(result.links).toHaveLength(4);
    expect(result.links[0]).toMatch(/^vmess:\/\//);
    expect(JSON.parse(Buffer.from(result.links[0].slice('vmess://'.length), 'base64').toString('utf8'))).toMatchObject({
      ps: 'VMess Test',
      add: 'vmess.example.invalid',
      port: '443',
      aid: '0',
      net: 'ws',
      path: '/ws',
      tls: 'tls',
      sni: 'vmess.example.invalid',
    });
    expect(result.links[1]).toBe('vless://33333333-3333-4333-8333-333333333333@reality.example.invalid:443?encryption=none&security=reality&type=tcp&sni=www.example.com&fp=chrome&pbk=TEST_PUBLIC_KEY_DO_NOT_USE&sid=abcd1234&flow=xtls-rprx-vision#Reality%20Node');
    expect(result.links[2]).toBe('trojan://test-password@trojan.example.invalid:443?security=tls&sni=trojan.example.invalid&type=ws&host=cdn.example.invalid&path=%2Ftrojan#Trojan%20Go');
    expect(result.links[3]).toBe('ss://YWVzLTEyOC1nY206dGVzdC1wYXNzd29yZA@ss.example.invalid:8388#SS%20Legacy');
    expect(result.plain).toBe(result.links.join('\n'));
    expect(Buffer.from(result.base64, 'base64').toString('utf8')).toBe(result.plain);
    expect(result.warnings).toContain('Converted trojan-go:// to trojan:// and dropped Trojan-Go-only compatibility assumptions.');
  });

  test('decodes Shadowrocket base64 VLESS authority into a v2rayNG REALITY link', () => {
    const input = 'vless://OmNlYTQwYzkwLTZlYjYtNDMxOS04YzllLTc1ZjMyNWIxZjZmY0AxNTAuMjMwLjMyLjI0MTo0ODA0MQ?remarks=vl-reality-vision-ous&tls=1&peer=apple.com&udp=1&xtls=2&pbk=4RbHv_Ousk5_Vyetvv6nAMIt55DiOQFd4ftm9bPtm38&sid=ee33f007&ech=cloudflare.com%2Budp://1.1.1.1';

    const result = convertInput(input);

    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      'vless://cea40c90-6eb6-4319-8c9e-75f325b1f6fc@150.230.32.241:48041?encryption=none&security=reality&type=tcp&sni=apple.com&pbk=4RbHv_Ousk5_Vyetvv6nAMIt55DiOQFd4ftm9bPtm38&sid=ee33f007&flow=xtls-rprx-vision#vl-reality-vision-ous',
    ]);
  });

  test('decodes whole base64 subscriptions before converting links', () => {
    const subscription = 'vless://22222222-2222-4222-8222-222222222222@vless.example.invalid:443?type=ws&security=tls&host=cdn.example.invalid&path=%2Fvless#VLESS Test';

    const result = convertInput(base64(subscription));

    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      'vless://22222222-2222-4222-8222-222222222222@vless.example.invalid:443?encryption=none&security=tls&type=ws&host=cdn.example.invalid&path=%2Fvless#VLESS%20Test',
    ]);
  });

  test('passes through SSR links with a legacy warning', () => {
    const ssr = 'ssr://c3NyLmV4YW1wbGUuaW52YWxpZDo0NDM6YXV0aF9hZXMxMjhfbWQ1OmFlcy0yNTYtY2ZiOnRsczEuMl90aWNrZXRfYXV0aDpkR1Z6ZEMxd1lYTnpkMjl5WkEvP3JlbWFya3M9VXpOU0lGUmxjM1E';

    const result = convertInput(ssr);

    expect(result.links).toEqual([ssr]);
    expect(result.warnings).toEqual(['SSR is legacy and may not import in every v2rayNG build; kept it unchanged.']);
    expect(result.errors).toEqual([]);
  });

  test('reports unsupported lines without blocking valid links', () => {
    const input = 'not a proxy\nss://YWVzLTEyOC1nY206dGVzdA@ss.example.invalid:8388#Name';

    const result = convertInput(input);

    expect(result.links).toEqual(['ss://YWVzLTEyOC1nY206dGVzdA@ss.example.invalid:8388#Name']);
    expect(result.errors).toEqual(['Line 1: unsupported or invalid share link.']);
  });
});
