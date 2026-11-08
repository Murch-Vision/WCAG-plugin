/**
 * SSRF хамгаалалт: скан үйлчилгээ хэрэглэгчийн өгсөн URL-ыг нээдэг тул дотоод сүлжээ
 * (localhost, 10.x, 192.168.x, cloud metadata 169.254.169.254 г.м.) руу хандуулахгүй.
 *
 * Хоёр түвшинд шалгана:
 *  1. Скан эхлэхээс өмнө URL-ын host-ыг DNS-ээр задлаж бүх хаягийг шалгана (assertPublicUrl)
 *  2. Хөтөч доторх бүх хүсэлтийг (redirect, iframe, зураг, fetch) Playwright route-оор шалгана (guardPage)
 *
 * Хязгаар: Chromium DNS-ийг өөрөө дахин задалдаг тул DNS rebinding-ийг 100% хаахгүй.
 * Үйлдвэрлэлд скан үйлчилгээг дотоод сүлжээнээс тусгаарласан (egress firewall) сүлжээнд ажиллуулна уу.
 */
import { lookup } from 'node:dns/promises';
import net from 'node:net';

function ipv4ToInt(ip) {
  return ip.split('.').reduce((a, b) => (a << 8) + (+b), 0) >>> 0;
}

const V4_BLOCKS = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [ipv4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKS.some(([base, mask]) => ((n & mask) >>> 0) === base);
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    // fc00::/7 (unique local), fe80::/10 (link-local), ff00::/8 (multicast)
    return /^(f[cd][0-9a-f]{2}|fe[89ab][0-9a-f]|ff[0-9a-f]{2}):/.test(v);
  }
  return true; // танигдахгүй — аюулгүйн үүднээс хаана
}

export class BlockedUrlError extends Error {
  constructor(msg) { super(msg); this.code = 'URL_BLOCKED'; }
}

/** http(s) эсэх, хэрэглэгчийн нэр/нууц үггүй эсэхийг шалгаж нормчилсон URL буцаана */
export function normalizeTargetUrl(input) {
  let u;
  try { u = new URL(String(input).trim().match(/^[a-z][a-z0-9+.-]*:/i) ? String(input).trim() : `https://${String(input).trim()}`); } catch { throw new BlockedUrlError('URL буруу байна'); }
  if (!/^https?:$/.test(u.protocol)) throw new BlockedUrlError('Зөвхөн http(s) хаяг шалгана');
  if (u.username || u.password) throw new BlockedUrlError('URL-д нэвтрэх нэр/нууц үг оруулж болохгүй');
  u.hash = '';
  return u.href;
}

const cache = new Map(); // host -> Promise<boolean (private?)>

async function hostIsPrivate(host) {
  const h = host.replace(/^\[|\]$/g, '');
  if (net.isIP(h)) return isPrivateAddress(h);
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (!cache.has(h)) {
    cache.set(h, lookup(h, { all: true, verbatim: true })
      .then((addrs) => addrs.length === 0 || addrs.some((a) => isPrivateAddress(a.address)))
      .catch(() => false)); // DNS алдаа — хөтөч өөрөө нээж чадахгүй тул энд хаах шаардлагагүй
    setTimeout(() => cache.delete(h), 60_000).unref?.();
  }
  return cache.get(h);
}

/** @throws {BlockedUrlError} */
export async function assertPublicUrl(url, { allowPrivate = false } = {}) {
  const href = normalizeTargetUrl(url);
  if (allowPrivate) return href;
  const { hostname } = new URL(href);
  if (await hostIsPrivate(hostname)) throw new BlockedUrlError(`Дотоод сүлжээний хаяг (${hostname}) шалгахыг хориглосон`);
  return href;
}

/** Playwright page/context-ийн бүх хүсэлтийг шүүнэ */
export async function guardContext(context, { allowPrivate = false, onBlocked } = {}) {
  if (allowPrivate) return;
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (!/^https?:/i.test(url)) return route.continue();
    let host;
    try { host = new URL(url).hostname; } catch { return route.abort('blockedbyclient'); }
    if (await hostIsPrivate(host)) {
      onBlocked?.(url);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}
