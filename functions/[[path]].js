/**
 * ores.cc — Cloudflare Pages Function：先记账，再 301 到 OE 主站。
 *
 * 路由：functions/[[path]].js 是 catch-all，所有路径都经过这里。
 *   https://ores.cc/        → 计数 → 301 https://oe-brand.app.workbuddy.host/#/
 *   https://ores.cc/p/3     → 计数 → 301 https://oe-brand.app.workbuddy.host/#/p/3   （路径不再丢失）
 *
 * 统计口径与各子站的前端 track.js 一致：site / fp(IP+UA) / path / src(来源分类)
 */

const STATS = 'https://stats.oebuylink.com/track';
const SITE = 'ores-cc';
const TARGET = 'https://oe-brand.app.workbuddy.host/#/';

function fingerprint(ip, ua) {
  let h = 0;
  const s = (ip || 'unknown') + '|' + (ua || '').slice(0, 80);
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 'fp' + Math.abs(h).toString(36);
}

function classifySource(referer) {
  if (!referer) return 'direct';
  let host;
  try { host = new URL(referer).hostname.toLowerCase(); } catch { return 'referral'; }
  if (['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.'].some((e) => host.includes(e))) return 'search';
  if (['facebook.', 'twitter.', 'instagram.', 'pinterest.', 't.me', 'telegram', 'discord.', 'whatsapp.', 'wa.me']
      .some((s) => host.includes(s))) return 'social';
  if (host.endsWith('oebuylink.com') || host.endsWith('ores.cc')) return 'internal';
  return 'referral';
}

function trackUrl(request, url) {
  const ip = request.headers.get('cf-connecting-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || '0.0.0.0';
  const q = new URLSearchParams({
    site: SITE,
    fp: fingerprint(ip, request.headers.get('user-agent') || ''),
    path: url.pathname || '/',
    src: classifySource(request.headers.get('referer') || ''),
  });
  return STATS + '?' + q.toString();
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1) 计数：不阻塞跳转
  try {
    const p = fetch(trackUrl(request, url), { signal: AbortSignal.timeout(900) }).catch(() => {});
    if (context.waitUntil) context.waitUntil(p);
  } catch (e) { /* 统计失败不影响跳转 */ }

  // 2) 301：原始路径带进 hash，交给主站 SPA 路由
  const path = url.pathname.replace(/^\/+/, '');
  return new Response(null, {
    status: 301,
    headers: { Location: path ? TARGET + path : TARGET, 'Cache-Control': 'no-store' },
  });
}
