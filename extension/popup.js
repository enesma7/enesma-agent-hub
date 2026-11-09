import {
  SSO_COOKIE,
  DEVICE_COOKIE,
  SESSION_SECONDS,
  DEVICE_SECONDS,
  api,
  loadHubConfig,
  loadHomeTiles,
  userName
} from './hub.js';
import { loadingHtml, loginHtml, otpHtml, forgotHtml, appHtml, messageHtml } from './view.js';

const $app = document.getElementById('app');
const COOKIE_URL = 'https://agent.enesmarealty.com/';
const ALLOWED_COOKIES = new Set([SSO_COOKIE, DEVICE_COOKIE]);

let apiUrl = '';
let fallback = {};
let sessionToken = '';

function show(html) { $app.innerHTML = html; }
function qs(sel) { return $app.querySelector(sel); }

function decodeCookie(cookie) {
  const v = cookie && cookie.value ? cookie.value : '';
  if (!v) return '';
  try { return decodeURIComponent(v); } catch (e) { return v; }
}

function cookies() {
  if (!chrome.cookies) throw new Error('This browser blocked cookie access for the extension.');
  return chrome.cookies;
}

function readCookie(name) {
  return cookies().get({ url: COOKIE_URL, name: name });
}

function writeCookie(name, rawValue, seconds) {
  if (!ALLOWED_COOKIES.has(name)) throw new Error('Refusing to store an unexpected cookie.');
  return cookies().set({
    url: COOKIE_URL,
    name: name,
    value: encodeURIComponent(rawValue),
    domain: '.enesmarealty.com',
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'lax',
    expirationDate: Math.floor(Date.now() / 1000) + seconds
  });
}

function removeCookie(name) {
  if (!ALLOWED_COOKIES.has(name)) throw new Error('Refusing to clear an unexpected cookie.');
  return cookies().remove({ url: COOKIE_URL, name: name });
}

async function currentToken() {
  if (sessionToken) return sessionToken;
  sessionToken = decodeCookie(await readCookie(SSO_COOKIE));
  return sessionToken;
}

async function rememberSession(data) {
  if (!data || !data.token) throw new Error('Sign-in did not complete. Please try again.');
  if (data.deviceToken) await writeCookie(DEVICE_COOKIE, data.deviceToken, DEVICE_SECONDS);
  await writeCookie(SSO_COOKIE, data.token, SESSION_SECONDS);
  sessionToken = data.token;
  return data;
}

async function call(action, params) {
  const token = action === 'login' || action === 'requestPasswordCode' || action === 'resetPasswordWithCode' || action === 'verifyLoginOtp' || action === 'resendLoginOtp'
    ? (params && params.token) || ''
    : await currentToken();
  try {
    return await api(apiUrl, action, token, params);
  } catch (err) {
    if (err.code === 'AUTH') {
      sessionToken = '';
      await removeCookie(SSO_COOKIE);
    }
    throw err;
  }
}

function busy(button, label) {
  if (!button) return;
  button.disabled = true;
  button.textContent = label;
}

async function showApp(user) {
  show(loadingHtml('Loading your tools…'));
  try {
    const tiles = await loadHomeTiles(fallback);
    show(appHtml(userName(user), tiles));
    const out = qs('#signOut');
    if (out) out.addEventListener('click', onSignOut);
  } catch (err) {
    show(messageHtml('Tiles unavailable', err.message || 'The Hub tile list could not be loaded.'));
    bindRetry();
  }
}

function bindRetry() {
  const b = qs('#retry');
  if (b) b.addEventListener('click', boot);
}

function bindLogin() {
  const link = qs('#lc');
  if (link) link.addEventListener('click', function (e) {
    e.preventDefault();
    const email = qs('#lu') ? qs('#lu').value.trim() : '';
    showForgot(email, 1);
  });
  const form = qs('#lf');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = qs('#lu').value.trim().toLowerCase();
    const password = qs('#lp').value;
    qs('#lp').value = '';
    busy(qs('#lb'), 'Signing in…');
    try {
      const deviceToken = decodeCookie(await readCookie(DEVICE_COOKIE));
      const data = await call('login', { email: email, username: email, password: password, deviceToken: deviceToken });
      if (data && data.needsOtp) return showOtp(data);
      await rememberSession(data);
      await showApp(data.user);
    } catch (err) {
      show(loginHtml(err.message));
      const keep = qs('#lu');
      if (keep) keep.value = email;
      bindLogin();
    }
  });
}

function showOtp(ch, msg, okMsg) {
  show(otpHtml((ch && ch.emailHint) || 'your account email', msg, okMsg));
  const back = qs('#obk');
  if (back) back.addEventListener('click', function (e) { e.preventDefault(); show(loginHtml()); bindLogin(); });
  const resend = qs('#or');
  if (resend) resend.addEventListener('click', async function (e) {
    e.preventDefault();
    try {
      const data = await call('resendLoginOtp', { challengeId: ch.challengeId });
      showOtp({ challengeId: ch.challengeId, emailHint: (data && data.emailHint) || ch.emailHint }, '', 'A new code is on its way.');
    } catch (err) {
      showOtp(ch, err.message);
    }
  });
  const form = qs('#of');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    busy(qs('#ob'), 'Verifying…');
    try {
      const data = await call('verifyLoginOtp', {
        challengeId: ch.challengeId,
        code: qs('#oc').value.trim(),
        rememberDevice: qs('#ot').checked,
        deviceLabel: (navigator.userAgent || '').slice(0, 120)
      });
      await rememberSession(data);
      await showApp(data.user);
    } catch (err) {
      showOtp(ch, err.message);
    }
  });
  setTimeout(function () { const el = qs('#oc'); if (el) el.focus(); }, 30);
}

function unsupported(err) {
  return /unknown action/i.test(err.message) ? 'Password setup by email isn’t switched on yet. Ask Enrique to reset your password.' : err.message;
}

function showForgot(email, step, msg, okMsg, need) {
  show(forgotHtml({ step: step, email: email, msg: msg, okMsg: okMsg, need: need || [] }));
  const back = qs('#cbk');
  if (back) back.addEventListener('click', function (e) { e.preventDefault(); show(loginHtml()); bindLogin(); });
  const resend = qs('#cr');
  if (resend) resend.addEventListener('click', function (e) { e.preventDefault(); showForgot(email, 1); });
  const form = qs('#cf');
  if (!form) return;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const em = qs('#ce').value.trim().toLowerCase();
    if (step !== 2) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return showForgot(em, 1, 'Enter a valid email address.');
      busy(qs('#cb'), 'Sending…');
      try {
        await call('requestPasswordCode', { email: em });
        showForgot(em, 2, '', 'If that email has an account, a code is on its way.');
      } catch (err) {
        showForgot(em, 1, unsupported(err));
      }
      return;
    }
    const p1 = qs('#c1').value;
    const p2 = qs('#c2').value;
    qs('#c1').value = '';
    qs('#c2').value = '';
    if (p1 !== p2) return showForgot(em, 2, 'The new passwords do not match.', '', need);
    if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) {
      return showForgot(em, 2, 'Use at least 10 characters with letters and numbers.', '', need);
    }
    const body = { email: em, code: qs('#cc').value.trim(), newPassword: p1 };
    if (qs('#cfn')) body.firstName = qs('#cfn').value.trim();
    if (qs('#cln')) body.lastName = qs('#cln').value.trim();
    if (qs('#cph')) body.phone = qs('#cph').value.trim();
    busy(qs('#cb'), 'Saving…');
    try {
      const data = await call('resetPasswordWithCode', body);
      await rememberSession(data);
      await showApp(data.user);
    } catch (err) {
      if (err.code === 'PROFILE_REQUIRED') return showForgot(em, 2, err.message, '', err.fields || ['phone']);
      showForgot(em, 2, unsupported(err), '', need);
    }
  });
}

async function onSignOut() {
  const tok = sessionToken || decodeCookie(await readCookie(SSO_COOKIE));
  sessionToken = '';
  if (tok && apiUrl) api(apiUrl, 'logout', tok, {}).catch(function () {});
  await removeCookie(SSO_COOKIE);
  show(loginHtml());
  bindLogin();
}

$app.addEventListener('click', function (e) {
  const btn = e.target.closest('[data-url]');
  if (!btn) return;
  const url = btn.getAttribute('data-url');
  if (!url) return;
  chrome.tabs.create({ url: url });
  window.close();
});

async function boot() {
  show(loadingHtml());
  try {
    const res = await fetch(chrome.runtime.getURL('fallback/hub.json'), { cache: 'no-store' });
    fallback = res.ok ? await res.json() : {};
  } catch (e) {
    fallback = {};
  }
  try {
    const cfg = await loadHubConfig(fallback);
    apiUrl = cfg.apiUrl;
  } catch (e) {
    show(messageHtml('Sign-in unavailable', 'The Agent Hub sign-in service could not be reached.'));
    bindRetry();
    return;
  }
  let token = '';
  try { token = await currentToken(); } catch (e) {
    show(messageHtml('Sign-in unavailable', e.message));
    bindRetry();
    return;
  }
  if (!token) {
    show(loginHtml());
    bindLogin();
    return;
  }
  try {
    const data = await call('me', {});
    const user = (data && data.user) || data;
    await showApp(user);
  } catch (err) {
    if (err.code === 'AUTH') {
      show(loginHtml());
      bindLogin();
      return;
    }
    show(messageHtml('Could not confirm sign-in', err.message || 'Try again.'));
    bindRetry();
  }
}

boot();
