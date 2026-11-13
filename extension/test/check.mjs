import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractAssignedJson,
  fallbackFromSources,
  homeTiles,
  safeHttps,
  SSO_COOKIE,
  DEVICE_COOKIE
} from '../hub.js';
import { appHtml, loginHtml } from '../view.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('FAIL: ' + msg);
  }
}

const contentSrc = readFileSync(join(repo, 'content.js'), 'utf8');
const configSrc = readFileSync(join(repo, 'config.js'), 'utf8');
const content = extractAssignedJson(contentSrc, 'HUB_CONTENT');
const tiles = homeTiles(content, 'https://agent.enesmarealty.com');
assert(tiles.length === 10, 'home tile count ' + tiles.length);
assert(tiles[0].title === 'Compliance', 'first home tile');
assert(tiles[0].href === 'https://agent.enesmarealty.com/#/compliance', 'hash route url');
assert(tiles[0].img === 'https://agent.enesmarealty.com/assets/sites/home-01.jpg', 'tile image url');
const eshop = tiles.filter(function (t) { return t.title === 'E-Shop'; })[0];
assert(eshop && eshop.href === 'https://shop.enesmarealty.com/', 'eshop url');
assert(eshop && eshop.img === 'https://agent.enesmarealty.com/assets/sites/home-eshop.jpg', 'eshop image');
assert(tiles[7].title === 'Office Hubs' && tiles[8].title === 'E-Shop' && tiles[9].title === 'Contact the Broker', 'eshop sits between Office Hubs and Contact the Broker');
assert(tiles.map(function (t) { return t.title; }).join('|') === [
  'Compliance', 'Marketing', 'Technology', 'Office Listings', 'Training Library',
  'Preferred Partners', 'Calculators', 'Office Hubs', 'E-Shop', 'Contact the Broker'
].join('|'), 'home tile titles');

const fallback = fallbackFromSources(contentSrc, configSrc);
assert(fallback.home.length === 10, 'fallback home tiles');
assert(fallback.apiUrl.indexOf('https://script.google.com/') === 0, 'fallback api url');
assert(!JSON.stringify(fallback).includes('password'), 'fallback must not contain a password field');

assert(safeHttps('javascript:alert(1)') === '', 'reject javascript urls');
assert(safeHttps('http://agent.enesmarealty.com/') === '', 'reject http urls');

const html = appHtml('A</b><script>', [{
  title: '<Compliance>',
  sub: 'a & b',
  href: 'https://agent.enesmarealty.com/#/compliance',
  img: 'https://agent.enesmarealty.com/assets/sites/home-01.jpg'
}]);
assert(html.includes('&lt;Compliance&gt;'), 'escape title');
assert(html.includes('A&lt;/b&gt;&lt;script&gt;'), 'escape name');
assert(!html.includes('<script>'), 'no raw script');
assert(loginHtml().includes('type="password"'), 'login has a password field');
assert(!loginHtml().includes('enesma_sso'), 'login screen does not show the session cookie');

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
assert(manifest.manifest_version === 3, 'mv3');
assert(manifest.name === 'ENESMA AGENT HUB', 'extension name');
assert(manifest.description.length <= 132, 'short description is ' + manifest.description.length + ' characters');
assert(!/tiles stay hidden/i.test(manifest.description), 'short description drops the hidden-tiles line');
assert(/Sign in with your Hub account/.test(manifest.description), 'short description keeps the sign-in line');
assert(JSON.stringify(manifest.permissions) === '["cookies"]', 'minimal permissions');
assert(!manifest.content_scripts, 'no content scripts');
assert(!manifest.host_permissions.some(function (p) { return p === '<all_urls>' || p.includes('google.com') && !p.includes('script.google'); }), 'no broad google hosts');

const sources = ['popup.js', 'hub.js', 'view.js'].map(function (f) { return readFileSync(join(root, f), 'utf8'); }).join('\n');
assert(!sources.includes('localStorage'), 'no localStorage');
assert(!sources.includes('chrome.storage'), 'no chrome.storage');
assert(!sources.includes('eval('), 'no eval');
assert(sources.includes(SSO_COOKIE) && sources.includes(DEVICE_COOKIE), 'session cookie names');
assert(!/writeCookie\(\s*['"]password/.test(sources), 'password is not written as a cookie');

const privacy = readFileSync(join(repo, 'privacy-extension.html'), 'utf8');
assert(/passwords are not stored/i.test(privacy), 'privacy says passwords are not stored');
assert(/personal data is not stored or sold/i.test(privacy), 'privacy says personal data is not stored or sold');
assert(/session cookie on enesmarealty\.com/i.test(privacy), 'privacy names the session cookie domain');
assert(/enesma_sso/.test(privacy), 'privacy names the session cookie');

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('ok');
