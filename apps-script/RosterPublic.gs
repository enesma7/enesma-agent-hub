/**
 * ENESMA public agent roster and admin headshot upload.
 *
 * Paste this file into the EXISTING Transaction Center Apps Script project
 * (the web app in hub/config.js API_URL). Do not create a second web app.
 * Deploy steps are in apps-script/DEPLOY.md. Merging the GitHub pull request
 * does not deploy Apps Script.
 *
 * publicAgents is unauthenticated and returns public profile fields only.
 * saveAgentPhoto requires the signed-in admin or owner. The file is stored
 * in the Drive of the account the web app runs as (enrique@enesmabroker.com
 * when the deployment is Execute as Me).
 */
var ROSTER_VERSION = '1.0.0';
var ROSTER_PHOTO_FOLDER = 'ENESMA Agent Photos';
var ROSTER_PUBLIC_KEYS = ['id', 'slug', 'name', 'title', 'languages', 'phone', 'email', 'website', 'websiteLabel', 'dre', 'photoUrl', 'links', 'bio'];
var ROSTER_PRIVATE = /address|mailing|mailto|ssn|tin|tax|ein|dob|birth|bank|routing|account|password|secret|split|capamount|capnote|w9|homezip|homephone/i;

function rosterFail_(message, code) {
  var err = new Error(message);
  err.code = code || 'BAD_REQUEST';
  throw err;
}

function rosterText_(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

function rosterHeader_(value) {
  var raw = rosterText_(value).toLowerCase().replace(/[^a-z0-9]+/g, '');
  var alias = {
    userid: 'id', user_id: 'id', agentid: 'id', id: 'id',
    firstname: 'firstName', first: 'firstName',
    lastname: 'lastName', last: 'lastName',
    fullname: 'name', agentname: 'name', name: 'name', agent: 'name',
    email: 'email', emailaddress: 'email',
    phone: 'phone', phonenumber: 'phone', mobile: 'phone', cell: 'phone',
    title: 'title', position: 'title',
    role: 'role', roles: 'roles',
    language: 'languages', languages: 'languages',
    dre: 'dre', drenumber: 'dre', license: 'dre', licensenumber: 'dre',
    website: 'website', web: 'website', url: 'website',
    websitelabel: 'websiteLabel', weblabel: 'websiteLabel',
    photourl: 'photoUrl', photo: 'photoUrl', headshot: 'photoUrl',
    photofileid: 'photoFileId',
    bio: 'bio',
    slug: 'slug',
    active: 'active', status: 'status', state: 'status', offboarded: 'offboarded',
    owner: 'owner',
    facebook: 'facebook', instagram: 'instagram', tiktok: 'tiktok',
    x: 'x', twitter: 'x', linkedin: 'linkedin', youtube: 'youtube', zillow: 'zillow'
  };
  return alias[raw] || '';
}

function rosterSpreadsheet_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) {}
  if (ss) return ss;
  var props = PropertiesService.getScriptProperties();
  var keys = ['SPREADSHEET_ID', 'SS_ID', 'SHEET_ID', 'TC_SPREADSHEET_ID'];
  for (var i = 0; i < keys.length; i++) {
    var id = props.getProperty(keys[i]);
    if (!id) continue;
    try { return SpreadsheetApp.openById(id); } catch (e2) {}
  }
  rosterFail_('Roster spreadsheet was not found. In the Transaction Center script properties, set SPREADSHEET_ID to that spreadsheet.', 'SETUP');
}

function rosterSheet_(ss) {
  var names = ['EB_Agents', 'Agents', 'Users'];
  for (var i = 0; i < names.length; i++) {
    var sheet = ss.getSheetByName(names[i]);
    if (sheet) return sheet;
  }
  rosterFail_('No EB_Agents, Agents, or Users sheet was found in the Transaction Center spreadsheet.', 'SETUP');
}

function rosterTable_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (!values.length) return { headers: [], rows: [] };
  var headers = values[0].map(rosterHeader_);
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { _sheetRow: r + 1 };
    var blank = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = values[r][c];
      if (rosterText_(values[r][c])) blank = false;
    }
    if (!blank) rows.push(obj);
  }
  return { headers: headers, rows: rows };
}

function rosterInactive_(row) {
  if (row.active === false || row.active === 0) return true;
  if (row.offboarded === true) return true;
  var flag = rosterText_(row.active).toLowerCase();
  if (flag === 'false' || flag === 'no' || flag === '0' || flag === 'inactive' || flag === 'offboarded' || flag === 'disabled') return true;
  var status = rosterText_(row.status || row.offboarded).toLowerCase();
  return /offboard|inactive|disabled|terminated|removed/.test(status);
}

function rosterIsAgent_(row) {
  var role = rosterText_(row.role || row.roles).toLowerCase();
  if (!role) return true;
  if (row.owner === true || rosterText_(row.owner).toLowerCase() === 'true') return true;
  return /agent|admin|broker|owner/.test(role);
}

function rosterSlug_(name) {
  var s = rosterText_(name).toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return s || 'agent';
}

function rosterHttp_(url) {
  var u = rosterText_(url);
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
  return '';
}

function rosterLinks_(row) {
  var out = [];
  var seen = {};
  function add(label, href) {
    href = rosterHttp_(href);
    label = rosterText_(label);
    if (!href || !label || seen[href]) return;
    seen[href] = true;
    out.push({ label: label, href: href });
  }
  ['facebook', 'instagram', 'tiktok', 'x', 'linkedin', 'youtube', 'zillow'].forEach(function (key) {
    var label = key === 'x' ? 'X' : key.charAt(0).toUpperCase() + key.slice(1);
    add(label, row[key]);
  });
  return out;
}

function rosterLanguages_(value) {
  if (Object.prototype.toString.call(value) === '[object Array]') {
    return value.map(rosterText_).filter(Boolean);
  }
  var seen = {};
  return rosterText_(value).split(/[,;/|]+/).map(rosterText_).filter(function (part) {
    var key = part.toLowerCase();
    if (!part || seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function rosterTitle_(row) {
  var title = rosterText_(row.title);
  if (title && !/^(admin|tc|agent)$/i.test(title)) return title;
  if (row.owner === true || rosterText_(row.owner).toLowerCase() === 'true') return 'Broker / Owner';
  return 'Agent';
}

function rosterName_(row) {
  var named = rosterText_(row.name);
  if (named) return named;
  return rosterText_([row.firstName, row.lastName].filter(function (part) { return rosterText_(part); }).join(' '));
}

function rosterPublicFromRow_(row) {
  if (!row || rosterInactive_(row) || !rosterIsAgent_(row)) return null;
  var name = rosterName_(row);
  if (!name) return null;
  var website = rosterHttp_(row.website);
  var photo = rosterText_(row.photoUrl);
  if (photo && !/^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|drive\.google\.com|docs\.google\.com)\//i.test(photo)) photo = '';
  var agent = {
    id: rosterText_(row.id || row.email),
    slug: rosterText_(row.slug) || rosterSlug_(name),
    name: name,
    title: rosterTitle_(row),
    languages: rosterLanguages_(row.languages),
    phone: rosterText_(row.phone),
    email: rosterText_(row.email).toLowerCase(),
    website: website,
    websiteLabel: rosterText_(row.websiteLabel) || website.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    dre: rosterText_(row.dre),
    photoUrl: photo,
    links: rosterLinks_(row),
    bio: rosterText_(row.bio)
  };
  Object.keys(agent).forEach(function (key) {
    if (ROSTER_PUBLIC_KEYS.indexOf(key) < 0 || ROSTER_PRIVATE.test(key)) delete agent[key];
  });
  return agent;
}

function rosterHandlePublicAgents_() {
  var sheet = rosterSheet_(rosterSpreadsheet_());
  var table = rosterTable_(sheet);
  var used = {};
  var agents = [];
  table.rows.forEach(function (row) {
    var agent = rosterPublicFromRow_(row);
    if (!agent) return;
    var base = agent.slug;
    var slug = base;
    var n = 2;
    while (used[slug]) slug = base + '-' + (n++);
    used[slug] = true;
    agent.slug = slug;
    agents.push(agent);
  });
  agents.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });
  return {
    version: ROSTER_VERSION,
    source: sheet.getName(),
    updatedAt: new Date().toISOString(),
    agents: agents
  };
}

function rosterIsAdmin_(user) {
  if (!user) rosterFail_('Sign in required.', 'AUTH');
  var role = rosterText_(user.role).toLowerCase();
  var roles = user.roles || [];
  var admin = role === 'admin' || user.owner === true || roles.indexOf('admin') >= 0;
  if (!admin) rosterFail_('Only an admin can change agent photos.', 'FORBIDDEN');
}

function rosterPhotoFolder_() {
  var found = DriveApp.getFoldersByName(ROSTER_PHOTO_FOLDER);
  if (found.hasNext()) return found.next();
  return DriveApp.createFolder(ROSTER_PHOTO_FOLDER);
}

function rosterEnsureColumn_(sheet, headers, key) {
  var col = headers.indexOf(key);
  if (col >= 0) return col;
  col = headers.length;
  sheet.getRange(1, col + 1).setValue(key);
  headers.push(key);
  return col;
}

function rosterFindRow_(table, agentId) {
  var key = rosterText_(agentId).toLowerCase();
  for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];
    if (rosterText_(row.id).toLowerCase() === key) return row;
    if (rosterText_(row.email).toLowerCase() === key) return row;
  }
  return null;
}

function rosterHandleSavePhoto_(body, user) {
  rosterIsAdmin_(user);
  body = body || {};
  var agentId = rosterText_(body.agentId || body.id || body.email);
  if (!agentId) rosterFail_('Choose an agent.', 'BAD_REQUEST');
  var mime = rosterText_(body.mime).toLowerCase();
  if (mime !== 'image/jpeg' && mime !== 'image/png' && mime !== 'image/webp') {
    rosterFail_('Use a JPG, PNG, or WebP photo.', 'BAD_REQUEST');
  }
  var encoded = String(body.base64 || '').replace(/\s/g, '');
  if (!encoded) rosterFail_('Choose a photo.', 'BAD_REQUEST');
  var bytes = Utilities.base64Decode(encoded);
  if (!bytes || bytes.length > 4 * 1024 * 1024) rosterFail_('Choose a photo under 4 MB.', 'BAD_REQUEST');
  var sheet = rosterSheet_(rosterSpreadsheet_());
  var table = rosterTable_(sheet);
  var row = rosterFindRow_(table, agentId);
  if (!row) rosterFail_('That agent is not on the roster.', 'NOT_FOUND');
  var ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  var file = rosterPhotoFolder_().createFile(Utilities.newBlob(bytes, mime, rosterSlug_(rosterName_(row)) + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  if (row.photoFileId) {
    try { DriveApp.getFileById(rosterText_(row.photoFileId)).setTrashed(true); } catch (e) {}
  }
  var url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
  var photoCol = rosterEnsureColumn_(sheet, table.headers, 'photoUrl');
  var fileCol = rosterEnsureColumn_(sheet, table.headers, 'photoFileId');
  sheet.getRange(row._sheetRow, photoCol + 1).setValue(url);
  sheet.getRange(row._sheetRow, fileCol + 1).setValue(file.getId());
  row.photoUrl = url;
  row.photoFileId = file.getId();
  return { agent: rosterPublicFromRow_(row) };
}

/**
 * Call from the existing doPost switch. `user` is null for publicAgents.
 * Returns null when the action belongs to the rest of Transaction Center.
 */
function rosterDispatch_(action, body, user) {
  if (action === 'publicAgents') return rosterHandlePublicAgents_();
  if (action === 'saveAgentPhoto') return rosterHandleSavePhoto_(body, user);
  return null;
}

/** Call at the top of the existing doGet. Returns null for every other GET. */
function rosterMaybeGet_(e) {
  var action = e && e.parameter && String(e.parameter.action || '');
  if (action !== 'publicAgents') return null;
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: rosterHandlePublicAgents_() }))
    .setMimeType(ContentService.MimeType.JSON);
}
