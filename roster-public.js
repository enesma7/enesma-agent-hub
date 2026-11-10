/* Public roster shape shared by the Agent Hub and enesma-www.
   Membership comes from the Transaction Center action publicAgents
   (EB_Agents). This file only keeps public fields. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HubRosterPublic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  var PRIVATE = /address|mailing|mailto|ssn|tin|tax|ein|dob|birth|bank|routing|account|password|secret|split|capamount|capnote|w9|homezip|homephone/i;
  var PUBLIC_PHOTO = /^https:\/\/([a-z0-9-]+\.)*(googleusercontent\.com|drive\.google\.com|docs\.google\.com)\//i;

  function text(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  }
  function slugify(name) {
    var s = text(name).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return s || 'agent';
  }
  function languagesOf(v) {
    if (Array.isArray(v)) {
      return v.map(text).filter(Boolean);
    }
    return text(v).split(/[,;/|]+/).map(text).filter(Boolean);
  }
  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      var k = item.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }
  function isInactive(row) {
    if (!row || typeof row !== 'object') return true;
    if (row.active === false || row.active === 0) return true;
    var flag = text(row.active).toLowerCase();
    if (flag === 'false' || flag === 'no' || flag === '0' || flag === 'inactive' || flag === 'offboarded' || flag === 'disabled') return true;
    var status = text(row.status || row.state || row.offboarded).toLowerCase();
    if (row.offboarded === true) return true;
    return /offboard|inactive|disabled|terminated|removed/.test(status);
  }
  function isAgentRow(row) {
    var role = text(row.role || row.roles).toLowerCase();
    if (!role) return true;
    if (row.owner === true || row.owner === 'true' || row.owner === 'TRUE') return true;
    if (/agent|admin|broker|owner/.test(role)) return true;
    return false;
  }
  function safeHttp(url) {
    var u = text(url);
    if (!u) return '';
    if (/^https:\/\//i.test(u)) return u;
    if (/^http:\/\//i.test(u)) return u;
    if (/^mailto:/i.test(u)) return u;
    return '';
  }
  function safePhoto(url) {
    var u = text(url);
    if (!u || PRIVATE.test(u)) return '';
    return PUBLIC_PHOTO.test(u) ? u : '';
  }
  function websiteLabel(url, label) {
    var given = text(label);
    if (given) return given;
    return text(url).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
  function linksOf(row) {
    var out = [];
    var raw = row.links || row.social || [];
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = []; }
    }
    if (!Array.isArray(raw)) raw = [];
    raw.forEach(function (item) {
      if (!item) return;
      var href = safeHttp(item.href || item.url);
      var label = text(item.label || item.name);
      if (href && label) out.push({ label: label, href: href });
    });
    ['facebook', 'instagram', 'tiktok', 'x', 'linkedin', 'youtube', 'zillow'].forEach(function (key) {
      var href = safeHttp(row[key]);
      if (!href) return;
      var label = key === 'x' ? 'X' : key.charAt(0).toUpperCase() + key.slice(1);
      out.push({ label: label, href: href });
    });
    var seen = {};
    return out.filter(function (item) {
      if (seen[item.href]) return false;
      seen[item.href] = true;
      return true;
    });
  }
  function fullName(row) {
    var named = text(row.name);
    if (named) return named;
    return text([row.firstName, row.lastName].filter(function (p) { return text(p); }).join(' '));
  }
  function titleOf(row) {
    var title = text(row.title || row.position);
    if (title && !/^(admin|tc|agent)$/i.test(title)) return title;
    if (row.owner === true || row.owner === 'true' || row.owner === 'TRUE') return 'Broker / Owner';
    return 'Agent';
  }
  function publicAgent(row) {
    if (!row || typeof row !== 'object') return null;
    if (isInactive(row) || !isAgentRow(row)) return null;
    var name = fullName(row);
    if (!name) return null;
    var website = safeHttp(row.website || row.web);
    var agent = {
      id: text(row.id || row.userId || row.email),
      slug: text(row.slug) || slugify(name),
      name: name,
      title: titleOf(row),
      languages: unique(languagesOf(row.languages != null ? row.languages : row.language)),
      phone: text(row.phone),
      email: text(row.email).toLowerCase(),
      website: website,
      websiteLabel: websiteLabel(website, row.websiteLabel || row.webLabel),
      dre: text(row.dre || row.license),
      photoUrl: safePhoto(row.photoUrl || row.photo),
      links: linksOf(row),
      bio: text(row.bio)
    };
    return agent;
  }
  function normalizeRoster(rows) {
    var used = {};
    return (rows || []).map(publicAgent).filter(Boolean).map(function (agent) {
      var base = agent.slug;
      var slug = base;
      var n = 2;
      while (used[slug]) slug = base + '-' + n++;
      used[slug] = true;
      agent.slug = slug;
      return agent;
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  function hasPrivateKey(row) {
    if (!row || typeof row !== 'object') return false;
    return Object.keys(row).some(function (key) { return PRIVATE.test(key); });
  }

  return {
    PRIVATE: PRIVATE,
    normalizeRoster: normalizeRoster,
    publicAgent: publicAgent,
    languagesOf: languagesOf,
    safePhoto: safePhoto,
    slugify: slugify,
    hasPrivateKey: hasPrivateKey
  };
});
