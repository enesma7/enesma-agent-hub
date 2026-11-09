// Tile list and sign-in client for the ENESMA AGENT HUB extension.
// content.js is parsed as data. It is never evaluated.
// The password is only passed to api() for the login request. Nothing in this
// file writes it to storage, cookies, or the fallback snapshot.

export const HUB_ORIGIN = 'https://agent.enesmarealty.com';
export const SSO_COOKIE = 'enesma_sso';
export const DEVICE_COOKIE = 'enesma_dt';
export const SESSION_SECONDS = 24 * 60 * 60;
export const DEVICE_SECONDS = 30 * 24 * 60 * 60;

export function extractAssignedJson(source, globalName) {
  const marker = 'window.' + globalName + ' = ';
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('Missing ' + marker.trim());
  const start = source.indexOf('{', at);
  if (start < 0) throw new Error('Missing object for ' + globalName);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  throw new Error('Unclosed object for ' + globalName);
}

export function safeHttps(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return '';
    return u.href;
  } catch (e) {
    return '';
  }
}

function absoluteHref(href, origin) {
  if (!href) return '';
  if (/^https?:/i.test(href)) return safeHttps(href);
  const root = String(origin || HUB_ORIGIN).replace(/\/$/, '');
  if (href.charAt(0) === '#') return safeHttps(root + '/' + href);
  if (href.charAt(0) === '/') return safeHttps(root + href);
  return safeHttps(root + '/' + href);
}

function absoluteAsset(src, origin) {
  if (!src) return '';
  if (/^https?:/i.test(src)) return safeHttps(src);
  const root = String(origin || HUB_ORIGIN).replace(/\/$/, '');
  if (src.charAt(0) === '/') return safeHttps(root + src);
  return safeHttps(root + '/' + src);
}

export function homeTiles(content, origin) {
  const list = (content && content.site && content.site.home) || (content && content.homeTiles) || [];
  return list.map(function (t) {
    return {
      title: t.title || '',
      sub: t.sub || '',
      alt: t.alt || t.title || '',
      href: absoluteHref(t.href || '', origin),
      img: absoluteAsset(t.img || '', origin)
    };
  }).filter(function (t) { return t.title && t.href; });
}

export function apiUrlFromConfig(source) {
  const m = String(source || '').match(/API_URL:\s*'([^']+)'/);
  if (!m) throw new Error('API URL missing from config.js');
  if (!safeHttps(m[1])) throw new Error('API URL must be https');
  return m[1];
}

export function fallbackFromSources(contentSource, configSource) {
  const content = extractAssignedJson(contentSource, 'HUB_CONTENT');
  return {
    apiUrl: apiUrlFromConfig(configSource),
    hubOrigin: HUB_ORIGIN,
    home: homeTiles(content, HUB_ORIGIN)
  };
}

export function userName(user) {
  user = user || {};
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Agent';
}

export function api(apiUrl, action, token, params) {
  if (!apiUrl) return Promise.reject(Object.assign(new Error('The sign-in service is not connected yet.'), { code: 'SETUP' }));
  const body = Object.assign({ action: action, token: token || '' }, params || {});
  return fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
    credentials: 'omit',
    cache: 'no-store'
  }).then(function (r) {
    if (!r.ok) throw new Error('Server error ' + r.status);
    return r.json();
  }, function () {
    throw Object.assign(new Error('Could not reach the server. Check your connection and try again.'), { code: 'NETWORK' });
  }).then(function (res) {
    if (res && res.ok) return res.data;
    const err = new Error((res && res.error) || 'Something went wrong.');
    err.code = res && res.code;
    if (res && res.fields) err.fields = res.fields;
    throw err;
  });
}

export async function loadHubConfig(fallback) {
  try {
    const res = await fetch(HUB_ORIGIN + '/config.js', { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) throw new Error('Server error ' + res.status);
    return { apiUrl: apiUrlFromConfig(await res.text()), origin: HUB_ORIGIN };
  } catch (e) {
    if (fallback && fallback.apiUrl && safeHttps(fallback.apiUrl)) {
      return { apiUrl: fallback.apiUrl, origin: HUB_ORIGIN };
    }
    throw e;
  }
}

export async function loadHomeTiles(fallback) {
  try {
    const res = await fetch(HUB_ORIGIN + '/content.js', { cache: 'no-store', credentials: 'omit' });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const content = extractAssignedJson(await res.text(), 'HUB_CONTENT');
    const tiles = homeTiles(content, HUB_ORIGIN);
    if (!tiles.length) throw new Error('The Hub did not return any tiles.');
    return tiles;
  } catch (e) {
    const cached = fallback && Array.isArray(fallback.home) ? fallback.home.filter(function (t) {
      return t && t.title && safeHttps(t.href);
    }) : [];
    if (cached.length) return cached;
    throw e;
  }
}
