/* Loads the live public roster from Transaction Center (publicAgents).
   Published Hub profiles fill in bio, languages, and links when the
   roster row does not have them yet. They never add or remove an agent. */
(function () {
  var Pub = window.HubRosterPublic;
  var state = { status: 'idle', agents: [], error: '', updatedAt: '' };
  var pending = null;

  function profiles() {
    return (window.HUB_CONTENT && window.HUB_CONTENT.agents) || [];
  }
  function byEmail(list, email) {
    var e = String(email || '').toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].email || '').toLowerCase() === e) return list[i];
    }
    return null;
  }
  function bySlug(list, slug) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === slug) return list[i];
    }
    return null;
  }
  function mergeLinks(primary, extra) {
    var out = (primary || []).slice();
    var seen = {};
    out.forEach(function (item) { seen[item.href] = true; });
    (extra || []).forEach(function (item) {
      if (!item || !item.href || seen[item.href]) return;
      seen[item.href] = true;
      out.push({ label: item.label, href: item.href });
    });
    return out;
  }
  function enrich(agent) {
    var profile = byEmail(profiles(), agent.email) || bySlug(profiles(), agent.slug);
    if (!profile) return agent;
    if (profile.role && (agent.title === 'Agent' || !agent.title)) agent.title = profile.role;
    if (!agent.languages.length && profile.languages) agent.languages = profile.languages.slice();
    if (!agent.phone && profile.phone) agent.phone = profile.phone;
    if (!agent.email && profile.email) agent.email = String(profile.email).toLowerCase();
    if (!agent.website && profile.web) agent.website = profile.web;
    if (!agent.websiteLabel && profile.webLabel) agent.websiteLabel = profile.webLabel;
    if (!agent.dre && profile.dre) agent.dre = profile.dre;
    agent.links = mergeLinks(agent.links, profile.social);
    if (profile.bioHtml) agent.bioHtml = profile.bioHtml;
    return agent;
  }
  function applyPayload(data) {
    var rows = data && (data.agents || data.roster || data);
    if (data && data.agents) rows = data.agents;
    else if (!Array.isArray(rows)) rows = [];
    state.agents = Pub.normalizeRoster(rows).map(enrich);
    state.updatedAt = (data && data.updatedAt) || '';
    state.error = '';
    state.status = 'ready';
    return state.agents;
  }
  var loadToken = 0;
  function load(force) {
    if (!force && state.status === 'ready') return Promise.resolve(state.agents);
    if (!force && pending) return pending;
    var token = ++loadToken;
    var Auth = window.HubAuth;
    if (!Auth || !Auth.api) {
      state.status = 'error';
      state.error = 'The agent roster is not connected.';
      return Promise.reject(new Error(state.error));
    }
    state.status = 'loading';
    pending = Auth.api('publicAgents', {}).then(function (data) {
      if (token !== loadToken) return state.agents;
      pending = null;
      return applyPayload(data || {});
    }).catch(function (err) {
      if (token !== loadToken) return Promise.reject(err);
      pending = null;
      state.error = /unknown action/i.test(err && err.message || '')
        ? 'The agent roster is not available until the Transaction Center Apps Script update is deployed.'
        : ((err && err.message) || 'The agent roster could not be loaded.');
      state.status = state.agents.length ? 'ready' : 'error';
      return Promise.reject(err);
    });
    return pending;
  }
  function isAdmin(user) {
    if (!user) return false;
    if (user.owner === true) return true;
    if (String(user.role || '').toLowerCase() === 'admin') return true;
    var roles = user.roles || [];
    return roles.indexOf('admin') >= 0;
  }
  function languages() {
    var seen = {};
    var out = [];
    state.agents.forEach(function (agent) {
      (agent.languages || []).forEach(function (lang) {
        var key = lang.toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        out.push(lang);
      });
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }
  function savePhoto(agentId, file) {
    var Auth = window.HubAuth;
    if (!file) return Promise.reject(new Error('Choose a photo.'));
    var type = String(file.type || '').toLowerCase();
    if (['image/jpeg', 'image/png', 'image/webp'].indexOf(type) < 0) {
      return Promise.reject(new Error('Use a JPG, PNG, or WebP photo.'));
    }
    if (file.size > 4 * 1024 * 1024) return Promise.reject(new Error('Choose a photo under 4 MB.'));
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read that photo.')); };
      reader.onload = function () {
        var raw = String(reader.result || '');
        var comma = raw.indexOf(',');
        resolve(raw.slice(comma + 1));
      };
      reader.readAsDataURL(file);
    }).then(function (base64) {
      return Auth.api('saveAgentPhoto', {
        agentId: agentId,
        name: file.name || 'agent-photo',
        mime: type,
        base64: base64
      });
    }).then(function (data) {
      var next = data && (data.agent || data);
      if (!next) return state.agents;
      var normalized = Pub.publicAgent(Object.assign({}, next, { active: true }));
      if (!normalized) return state.agents;
      var enriched = enrich(normalized);
      var replaced = false;
      state.agents = state.agents.map(function (agent) {
        if (agent.id && agent.id === enriched.id) { replaced = true; return enriched; }
        if (agent.slug === enriched.slug) { replaced = true; return enriched; }
        return agent;
      });
      if (!replaced) state.agents.push(enriched);
      state.agents.sort(function (a, b) { return a.name.localeCompare(b.name); });
      return enriched;
    });
  }

  window.HubRoster = {
    state: state,
    load: load,
    agents: function () { return state.agents.slice(); },
    bySlug: function (slug) { return bySlug(state.agents, slug); },
    isAdmin: isAdmin,
    languages: languages,
    savePhoto: savePhoto,
    enrich: enrich
  };
})();
