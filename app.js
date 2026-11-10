(function () {
  var CFG = window.HUB || {};
  var C = window.HUB_CONTENT || {};
  var Auth = window.HubAuth;
  var S = Auth.S;
  var $app = document.getElementById('app');
  var view = 'boot';
  var otpCh = null;
  var searchOpen = false;
  var holidayCleanups = [];
  var holidayFiles = {};
  var holidayFileTasks = {};
  var holidayPrefetchQueue = [];
  var holidayPrefetchActive = 0;

  function h(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function path() {
    var p = (location.hash || '#/').replace(/^#/, '');
    if (!p || p === '/') return '/';
    if (p.charAt(0) !== '/') p = '/' + p;
    return p.replace(/\/+$/, '') || '/';
  }
  function isCalculatorsHome() {
    return path().split('?')[0] === '/calculators';
  }
  function removeHeadNodes(selector) {
    qsa(selector, document.head).forEach(function (node) {
      if (node.parentNode) node.parentNode.removeChild(node);
    });
  }
  function insertHeadLink(attrs) {
    var link = document.createElement('link');
    Object.keys(attrs).forEach(function (key) { link.setAttribute(key, attrs[key]); });
    document.head.appendChild(link);
  }
  function replaceMeta(name, content) {
    removeHeadNodes('meta[name="' + name + '"]');
    var meta = document.createElement('meta');
    meta.setAttribute('name', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
  // Safari reads the existing <link> nodes when the share sheet opens, so
  // home-screen icons are swapped by replacing those elements.
  function syncHomeScreen() {
    var calc = isCalculatorsHome();
    removeHeadNodes('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"], link[rel="icon"], link[rel="shortcut icon"], link[rel="manifest"]');
    if (calc) {
      insertHeadLink({ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/assets/icons/calc/favicon-32-calc-v2.png' });
      insertHeadLink({ rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/icons/calc/apple-touch-icon-calc-v2.png' });
      insertHeadLink({ rel: 'manifest', href: '/calculators/manifest.webmanifest?v=1' });
      replaceMeta('apple-mobile-web-app-title', 'Calculators');
      document.title = 'Calculators';
      return;
    }
    insertHeadLink({ rel: 'icon', type: 'image/png', href: 'favicon-32.png' });
    insertHeadLink({ rel: 'apple-touch-icon', href: 'apple-touch-icon.png' });
    replaceMeta('apple-mobile-web-app-title', 'AGENT HUB');
    if (document.title === 'Calculators') {
      if (view === 'login') document.title = 'Sign in · AGENT HUB';
      else if (view === 'otp') document.title = 'Enter code · AGENT HUB';
      else if (view === 'forgot') document.title = 'Reset password · AGENT HUB';
      else if (view === 'app') document.title = titles() + ' · ENESMA Realty';
      else document.title = 'AGENT HUB · ENESMA Realty';
    }
  }
  function userName() {
    var u = S.user || {};
    return u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Agent';
  }
  function upcomingEvents() {
    var now = Date.now();
    var until = now + 30 * 24 * 60 * 60 * 1000;
    return (C.events || []).filter(function (e) {
      var t = Date.parse(e.start);
      if (!isFinite(t) || t < now || t > until) return false;
      if (!e.free) return false;
      var host = String(e.host || '');
      return /C\.A\.R|CVAR/i.test(host);
    });
  }

  function tile(t) {
    var href = t.href || '#/';
    var ext = t.ext || /^https?:/i.test(href);
    var open = ext ? ' target="_blank" rel="noopener"' : '';
    if (t.kind === 'tc') {
      return '<a class="tile solid" href="' + h(href) + '"' + open + '><div class="tc-lockup"><p class="kicker">TRANSACTION CENTER</p><div class="dash"></div><h3>' + h(t.title) + '</h3><p>' + h(t.sub) + '</p><p class="steps">' + h(t.steps || '') + '</p></div></a>';
    }
    return '<a class="tile" href="' + h(href) + '"' + open + ' style="background-image:url(\'' + h(t.img) + '\')"><div class="cap"><div class="dash"></div><h3>' + h(t.title) + '</h3><p>' + h(t.sub || '') + '</p></div></a>';
  }
  function grid(items) { return '<div class="grid-2">' + (items || []).map(tile).join('') + '</div>'; }
  function pageHero(title, img) {
    return '<section class="page-hero" style="background-image:url(\'' + h(img) + '\')"><h1>' + h(title) + '</h1></section>';
  }
  function sectionHead(title, sub) {
    return '<div class="section-head"><h2>' + h(title) + '</h2><div class="gold-rule"></div>' + (sub ? '<p>' + h(sub) + '</p>' : '') + '</div>';
  }
  var CALC_SITE = 'https://calculators.enesmarealty.com/';
  function agentMenu() {
    var list = (window.HubRoster && HubRoster.agents()) || [];
    return '<a href="#/agents">All Agents</a>' + list.map(function (a) {
      return '<a href="#/agents/' + h(a.slug) + '">' + h(a.name) + '</a>';
    }).join('');
  }
  function headerHtml() {
    var p = path();
    function on(prefix) { return p === prefix || (prefix !== '/' && p.indexOf(prefix) === 0) ? ' on' : ''; }
    return '<header class="top" id="top">' +
      '<a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a>' +
      '<button class="menu-btn icon-btn" id="menuBtn" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '<nav class="nav" id="nav">' +
        '<a href="#/" class="' + on('/') + (p !== '/' ? '' : ' on') + '">Home</a>' +
        '<div class="drop' + (on('/compliance') ? ' on' : '') + '">' +
          '<a class="link' + on('/compliance') + '" href="#/compliance">Compliance</a>' +
          '<button class="caret-btn" type="button" aria-label="Compliance Menu" aria-expanded="false"><i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="#/compliance">Compliance</a>' +
            '<a href="#/compliance/transaction-checklists">Transaction Checklists</a>' +
            '<a href="#/compliance/c-a-r-legal-hotline">C.A.R. Legal Hotline</a>' +
            '<a href="#/compliance/office-documents">Office Documents</a>' +
            '<a href="#/compliance/office-policies">Office Policies</a>' +
          '</div>' +
        '</div>' +
        '<div class="drop' + (on('/marketing-templates') ? ' on' : '') + '">' +
          '<a class="link' + on('/marketing-templates') + '" href="#/marketing-templates">Marketing</a>' +
          '<button class="caret-btn" type="button" aria-label="Marketing Menu" aria-expanded="false"><i class="caret"></i></button>' +
          '<div class="drop-menu"><a href="#/marketing-templates">Templates</a><a href="#/marketing-templates/holidays">Holidays</a></div>' +
        '</div>' +
        '<a href="#/technology" class="' + on('/technology') + '">Technology</a>' +
        '<a href="#/listings" class="' + on('/listings') + '">Listings</a>' +
        '<a href="#/training" class="' + on('/training') + '">Training</a>' +
        '<div class="drop">' +
          '<a class="link" href="https://calculators.enesmarealty.com/">Calculators</a>' +
          '<button class="caret-btn" type="button" aria-label="Calculators Menu" aria-expanded="false"><i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="https://calculators.enesmarealty.com/">All Calculators</a>' +
            '<a href="https://calculators.enesmarealty.com/flip-calculator.html">Flip Calculator</a>' +
            '<a href="https://calculators.enesmarealty.com/net-sheet.html">Net Sheet</a>' +
            '<a href="https://calculators.enesmarealty.com/mortgage-calculator.html">Mortgage Calculator</a>' +
            '<a href="https://calculators.enesmarealty.com/cap-rate-calculator.html">Cap Rate Calculator</a>' +
          '</div>' +
        '</div>' +
        '<a href="#/refer" class="' + on('/refer') + '">Refer</a>' +
        '<div class="drop' + (on('/agents') ? ' on' : '') + '">' +
          '<a class="link' + on('/agents') + '" href="#/agents">Agents</a>' +
          '<button class="caret-btn" type="button" aria-label="Agents Menu" aria-expanded="false"><i class="caret"></i></button>' +
          '<div class="drop-menu">' + agentMenu() + '</div>' +
        '</div>' +
        '<div class="nav-tools">' +
          '<button class="icon-btn" id="searchBtn" aria-label="Search">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#sgr)" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/></g></svg>' +
          '</button>' +
          '<span class="user-chip">' + h(userName()) + '</span>' +
          '<button class="signout" id="signOut" type="button">Sign out</button>' +
        '</div>' +
      '</nav></header>';
  }
  function shotLink(t) {
    var href = t.href || '#/';
    var ext = t.ext || /^https?:|^mailto:/i.test(href);
    var open = ext ? ' target="_blank" rel="noopener"' : '';
    var cap = '';
    if (t.steps && t.steps.length) {
      cap = '<span class="cap cap-steps"><span class="tag">' + h(t.foot || '') + '</span><span class="rail">' +
        t.steps.map(function (s) { return '<span>' + h(s) + '</span>'; }).join('') + '</span></span>';
    } else if (t.title) {
      cap = '<span class="cap"><span class="dash"></span>' +
        (t.kicker ? '<span class="kicker">' + h(t.kicker) + '</span>' : '') +
        '<span class="t">' + h(t.title) + '</span>' +
        (t.sub ? '<span class="s">' + h(t.sub) + '</span>' : '') + '</span>';
    }
    var cls = 'shot' + (cap ? ' has-cap' : '');
    var alt = cap && t.title ? '' : (t.alt || '');
    return '<a class="' + cls + '" href="' + h(href) + '"' + open + '><img src="' + h(t.img) + '" alt="' + h(alt) + '">' + cap + '</a>';
  }
  function shotGrid(items) {
    return '<div class="shot-grid">' + (items || []).map(shotLink).join('') + '</div>';
  }
  function templateBars(items) {
    return '<div class="tpl-bars">' + (items || []).map(function (t) {
      var href = t.href || '#/';
      var ext = t.ext || /^https?:|^mailto:/i.test(href);
      var open = ext ? ' target="_blank" rel="noopener"' : '';
      var title = t.title || '';
      if (!title && t.alt) title = String(t.alt).split(/\.\s+/)[0] || '';
      return '<a class="tpl-bar" href="' + h(href) + '"' + open + '><span class="dash"></span><span class="t">' + h(title) + '</span></a>';
    }).join('') + '</div>';
  }
  function footerHtml() {
    return '<div class="foot-wrap"><footer class="foot">' +
      '<div><img src="assets/logo-white.png" alt="ENESMA Realty" style="height:48px;width:auto">' +
      '<p class="tag">UNDERPROMISE &amp; OVERDELIVER</p>' +
      '<div class="eho"><img src="assets/eho-white.png" alt="">DRE# 01926362</div></div>' +
      '<div><h4>Hub</h4><ul>' +
        '<li><a href="#/">Resources</a></li><li><a href="#/training">Training</a></li>' +
        '<li><a href="#/listings">Office Listings</a></li><li><a href="#/technology">Technology</a></li>' +
      '</ul></div>' +
      '<div><h4>Support</h4><ul>' +
        '<li><a href="#/agents/enrique-esparza">Contact the Broker</a></li>' +
        '<li><a href="#/compliance/office-policies">Office Policies</a></li>' +
        '<li><a href="#/preferred-partners">Preferred Partners</a></li>' +
      '</ul></div>' +
      '<div><h4>Broker</h4><ul>' +
        '<li><a href="#/agents/enrique-esparza">Enrique Esparza</a></li>' +
        '<li>DRE# 01926362</li><li>Southern California</li>' +
      '</ul></div></footer></div>' +
      '<p class="legal">© 2026 ENESMA Realty. For agent use only.</p>';
  }
  function searchIndex() {
    var items = [
      { t: 'Home', s: 'Agent resources and upcoming events', h: '#/' },
      { t: 'Compliance', s: 'Contracts, disclosures & addenda', h: '#/compliance' },
      { t: 'Transaction Checklists', s: 'Required documents for every file type', h: '#/compliance/transaction-checklists' },
      { t: 'C.A.R. Legal Hotline', s: 'Member Legal Services (213) 739-8282', h: '#/compliance/c-a-r-legal-hotline' },
      { t: 'Office Documents', s: 'CDA, invoice and brokerage forms', h: '#/compliance/office-documents' },
      { t: 'Office Policies', s: 'Policies & procedures manual', h: '#/compliance/office-policies' },
      { t: 'Marketing Templates', s: 'Logos, colors and Canva templates', h: '#/marketing-templates' },
      { t: 'Holidays', s: 'Tap to play. Press and hold to save to your phone.', h: '#/marketing-templates/holidays' },
      { t: 'Technology', s: 'CRM, MLS and tools', h: '#/technology' },
      { t: 'Office Listings', s: 'Current ENESMA listings', h: '#/listings' },
      { t: 'Office Hubs', s: 'Reserve a desk or the conference room', h: '#/office-hubs' },
      { t: 'Training Library', s: 'Recorded sessions and coaching', h: '#/training' },
      { t: 'Calculators', s: 'Flip, net sheet, mortgage and cap rate', h: CALC_SITE },
      { t: 'Flip Calculator', s: 'Fix-and-flip profit estimate', h: CALC_SITE + 'flip-calculator.html' },
      { t: 'Net Sheet', s: 'Seller net proceeds estimate', h: CALC_SITE + 'net-sheet.html' },
      { t: 'Mortgage Calculator', s: 'Monthly payment estimate', h: CALC_SITE + 'mortgage-calculator.html' },
      { t: 'Cap Rate Calculator', s: 'NOI and capitalization rate', h: CALC_SITE + 'cap-rate-calculator.html' },
      { t: 'Refer an Agent', s: 'Referral addendum and incentives', h: '#/refer' },
      { t: 'Agents', s: 'ENESMA Realty agents', h: '#/agents' },
      { t: 'Preferred Partners', s: 'Escrow, lenders, inspectors and more', h: '#/preferred-partners' }
    ];
    ((window.HubRoster && HubRoster.agents()) || []).forEach(function (a) {
      items.push({ t: a.name, s: a.title + (a.dre ? ' · DRE# ' + a.dre : ''), h: '#/agents/' + a.slug });
    });
    (C.partners || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.tech || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.checklists || []).forEach(function (p) { items.push({ t: p.title, s: 'Transaction checklist', h: '#/compliance/transaction-checklists' }); });
    return items;
  }
  function searchOverlay() {
    if (!searchOpen) return '';
    return '<div class="search-scrim" id="searchScrim"><div class="search-box"><input id="searchIn" type="search" placeholder="Search the Hub" autofocus><div id="searchHits"></div></div></div>';
  }

  var HERO_CACHE = '2';
  // First clip is decoded behind the page as soon as the script runs, then
  // moved into the hero already showing a frame. Kept outside #app so a
  // re-render does not throw that frame away.
  var heroWarm = null;

  function heroClipSrcs() {
    var q = '?v=' + HERO_CACHE;
    return [
      'assets/hero/hero-01-santa-monica.mp4' + q,
      'assets/hero/hero-02-hollywood.mp4' + q,
      'assets/hero/hero-03-downtown-la.mp4' + q,
      'assets/hero/hero-04-big-bear.mp4' + q,
      'assets/hero/hero-05-palm-springs.mp4' + q,
      'assets/hero/hero-06-palos-verdes.mp4' + q,
      'assets/hero/hero-07-catalina.mp4' + q,
      'assets/hero/hero-08-marina-del-rey.mp4' + q,
      'assets/hero/hero-09-beverly-hills.mp4' + q,
      'assets/hero/hero-10-long-beach.mp4' + q,
      'assets/hero/hero-11-redondo-beach.mp4' + q,
      'assets/hero/hero-12-san-diego.mp4' + q
    ];
  }
  function prepHeroVideo(v) {
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.removeAttribute('poster');
  }
  function makeHeroVideo(src, onTop) {
    var v = document.createElement('video');
    prepHeroVideo(v);
    v.className = onTop ? 'over on' : 'under';
    if (onTop) {
      v.autoplay = true;
      v.loop = true;
      v.setAttribute('autoplay', '');
      v.setAttribute('loop', '');
    }
    v._heroSrc = src;
    v.src = src;
    return v;
  }
  function warmHero() {
    if (heroWarm) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var clips = heroClipSrcs();
    var park = document.createElement('div');
    park.className = 'hero-park';
    park.setAttribute('aria-hidden', 'true');
    var first = makeHeroVideo(clips[0], true);
    var next = makeHeroVideo(clips[1 % clips.length], false);
    park.appendChild(first);
    park.appendChild(next);
    document.body.appendChild(park);
    heroWarm = { park: park, vids: [first, next], held: false, mounted: false, gen: 0, api: null };
    var playAttempt = first.play();
    if (playAttempt && playAttempt.catch) playAttempt.catch(function () {});
    function hold(frameReady) {
      if (!heroWarm || heroWarm.held || heroWarm.mounted) return;
      if (!frameReady && first.currentTime < 0.04) return;
      // Remember that a real frame is on screen. Do not pause: WebKit will
      // not resume a clip that was paused while it sat behind the page.
      heroWarm.held = true;
    }
    // Pause on the first presented picture so a later home paint is footage,
    // not the empty black plate Safari shows before a frame exists.
    if (first.requestVideoFrameCallback) {
      try { first.requestVideoFrameCallback(function () { hold(true); }); } catch (e) {}
    }
    first.addEventListener('timeupdate', function onTime() {
      if (first.currentTime < 0.04) return;
      first.removeEventListener('timeupdate', onTime);
      hold(true);
    });
  }
  function heroFrameReady() {
    if (!heroWarm) return false;
    var v = heroWarm.vids[0];
    return !!(heroWarm.held || (v && v.videoWidth > 1 && v.currentTime >= 0.04));
  }
  function whenHeroFrame(limitMs) {
    return new Promise(function (resolve) {
      var done = false;
      var v = heroWarm && heroWarm.vids[0];
      var timer = 0;
      function finish() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        if (v) v.removeEventListener('timeupdate', check);
        resolve();
      }
      function check() {
        if (heroFrameReady()) finish();
      }
      if (heroFrameReady()) { finish(); return; }
      timer = setTimeout(finish, limitMs || 2000);
      if (v && v.requestVideoFrameCallback) {
        try { v.requestVideoFrameCallback(function () { check(); }); } catch (e) {}
      }
      if (v) v.addEventListener('timeupdate', check);
    });
  }
  function detachHeroPark() {
    if (!heroWarm) return;
    heroWarm.mounted = false;
    // Still parked behind the page: leave it alone so the first frame can finish.
    if (!heroWarm.park.parentNode || heroWarm.park.parentNode === document.body) return;
    heroWarm.gen += 1;
    document.body.appendChild(heroWarm.park);
    heroWarm.vids.forEach(function (v) {
      v.classList.remove('fading');
      v.style.opacity = '1';
      try { v.pause(); } catch (e) {}
    });
    if (heroWarm.api) heroWarm.api.restack();
  }
  function heroVideos() {
    if (heroWarm) return '<div class="hero-videos" aria-hidden="true"></div>';
    var clips = heroClipSrcs();
    return '<div class="hero-videos" aria-hidden="true">' +
      '<video class="over on" autoplay muted playsinline webkit-playsinline preload="auto" src="' + clips[0] + '"></video>' +
      '<video class="under" muted playsinline webkit-playsinline preload="auto" src="' + clips[1 % clips.length] + '"></video>' +
      '</div>';
  }
  function pageHome() {
    var ev = upcomingEvents();
    var evHtml = ev.length ? ev.map(function (e) {
      return '<a class="event" href="' + h(e.href) + '" target="_blank" rel="noopener" style="background-image:url(\'' + h(e.img) + '\')">' +
        '<div class="cap"><div class="date">' + h(e.mon) + '<b>' + h(e.day) + '</b></div>' +
        '<div class="dash"></div><h3>' + h(e.title) + '</h3><p>' + h(e.meta) + '</p></div></a>';
    }).join('') : '<p class="note" style="text-align:center">No upcoming free C.A.R. or CVAR events in the next 30 days.</p>';
    return '<section class="hero">' + heroVideos() + '<img class="lockup" src="assets/hero-lockup.png" alt="ENESMA Realty Agent Hub. Underpromise &amp; Overdeliver."></section>' +
      '<section class="section"><div class="wrap">' + sectionHead('Agent Resources', 'Forms, tools, and support to help you close with confidence.') + shotGrid(C.site && C.site.home) + '</div></section>' +
      '<section class="section" style="padding-top:0"><div class="wrap">' + sectionHead('Upcoming Events', '') +
      (ev.length ? '<div class="grid-2">' + evHtml + '</div>' : evHtml) + '</div></section>' +
      '<div class="pills" aria-label="Add the Hub to your phone">' +
      '<a class="pill" href="' + h(CFG.ADD_IOS) + '" target="_blank" rel="noopener"><img src="assets/add-iphone.png" width="1169" height="229" alt="Add to iPhone"></a>' +
      '<a class="pill" href="' + h(CFG.ADD_ANDROID) + '" target="_blank" rel="noopener"><img src="assets/add-android.png" width="1169" height="229" alt="Add to Android"></a></div>';
  }
  function pageCompliance() {
    return pageHero('COMPLIANCE', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.compliance) + '</div></section>';
  }
  function pageChecklists() {
    return pageHero('TRANSACTION CHECKLISTS', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.checklists) + '</div></section>';
  }
  function pageLegal() {
    var L = C.legal || {};
    var qa = (L.items || []).map(function (it) {
      return '<h3>' + h(it.q) + '</h3>' + it.a;
    }).join('');
    return pageHero('C.A.R. LEGAL HOTLINE', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' +
      '<div class="hotline-card"><p class="kicker">' + h(L.title || 'Member Legal Services') + '</p>' +
      '<a class="tel" href="tel:+12137398282">' + h(L.tel) + '</a>' +
      '<p>' + h(L.revised) + '</p>' +
      '<p class="note">Designated REALTORS®, Broker/Owners, and Office Managers may also call <a href="tel:+12137398350">' + h(L.brokerTel) + '</a>.</p></div>' +
      '<div class="qa">' + qa + '</div></div></section>';
  }
  function pageOfficeDocs() {
    return pageHero('OFFICE DOCUMENTS', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.officeDocs) + '</div></section>';
  }
  function pagePolicies() {
    var id = C.policiesDocId;
    var pdf = 'https://docs.google.com/document/d/' + id + '/export?format=pdf';
    var doc = window.HUB_POLICIES || '';
    var btn = '<p class="policy-actions"><a class="btn gold" href="' + h(pdf) + '" target="_blank" rel="noopener">Download PDF</a></p>';
    doc = doc.replace('UNDERPROMISE &amp; OVERDELIVER</p>', 'UNDERPROMISE &amp; OVERDELIVER</p>' + btn);
    return '<section class="section"><div class="wrap policy-doc">' + doc + '</div></section>';
  }
  function pageMarketing() {
    var colors = (C.colors || []).map(function (c) {
      var bg = c.bg || c.hex;
      return '<figure class="swatch"><div class="chip" style="background:' + h(bg) + (c.hex === '#FBFBFB' ? ';border-bottom:1px solid #ececec' : '') + '"></div>' +
        '<figcaption><b>' + h(c.name) + '</b><code>' + h(c.hex) + '</code></figcaption></figure>';
    }).join('');
    var logos = [
      { src: 'assets/logo-white.png', name: 'White', tone: 'dark' },
      { src: 'assets/logo-black.png', name: 'Black', tone: 'light' },
      { src: 'assets/logo-gold.png', name: 'Aztec Gold', tone: 'dark' },
      { src: 'assets/logo-red.png', name: 'Illyrian Red', tone: 'light' },
      { src: 'assets/logo-gold-foil.png', name: 'Gold Foil', tone: 'dark' }
    ].map(function (l) {
      var stage = l.tone === 'dark'
        ? 'background:#000007;padding:36px 32px'
        : 'background:#ffffff;padding:36px 32px;border:1px solid #ececec';
      return '<figure class="logo-card ' + l.tone + '" style="' + stage + '"><img src="' + h(l.src) + '" alt="' + h(l.name) + ' wordmark"></figure>';
    }).join('');
    return pageHero('MARKETING', 'assets/banners/marketing.jpg') +
      '<section class="section"><div class="wrap">' +
      sectionHead('Templates', '') +
      templateBars(C.site && C.site.marketing) +
      '<div style="height:56px"></div>' +
      sectionHead('Logos', '') +
      '<p class="save-hint">Press and hold a wordmark, or right-click it, to save the image.</p>' +
      '<div class="grid-2 logo-pair">' + logos + '</div>' +
      sectionHead('Colors', '') +
      '<div class="swatches">' + colors + '</div>' +
      '</div></section>';
  }
  function pageHolidays() {
    var figs = (C.holidays || []).map(function (x) {
      var src = x.video || '';
      var poster = x.poster || x.img || '';
      var title = x.title || 'Holiday';
      var file = (src.split('/').pop() || 'holiday.mp4');
      return '<figure class="holiday-tile" data-title="' + h(title) + '" data-state="paused">' +
        '<div class="holiday-stage">' +
        '<img class="holiday-poster" src="' + h(poster) + '" alt="" width="1080" height="1920" draggable="false">' +
        '<video playsinline webkit-playsinline muted loop preload="metadata" disablepictureinpicture disableremoteplayback width="1080" height="1920" poster="' + h(poster) + '" src="' + h(src) + '"></video>' +
        '<button type="button" class="holiday-play" aria-label="Play ' + h(title) + '" aria-pressed="false">' +
        '<span class="holiday-cue" aria-hidden="true">TAP TO PLAY · HOLD TO SAVE</span></button>' +
        '</div>' +
        '<figcaption>' + h(title) + '</figcaption>' +
        '<a class="holiday-dl" href="' + h(src) + '" download="' + h(file) + '" aria-label="Download ' + h(title) + ' MP4">Download</a>' +
        '</figure>';
    }).join('');
    return pageHero('HOLIDAYS', 'assets/banners/holidays.jpg') +
      '<section class="section"><div class="wrap">' +
      '<p class="save-hint">Tap to play. Press and hold, or tap Download, to save the video to your phone. Add your photo and info in the empty space at the bottom.</p>' +
      '<div class="holidays">' + figs + '</div>' +
      '</div></section>';
  }
  function clearHolidayBindings() {
    holidayCleanups.forEach(function (fn) {
      try { fn(); } catch (e) {}
    });
    holidayCleanups = [];
  }
  function holidayFileName(url, fallback) {
    var clean = String(url || '').split('?')[0].split('#')[0];
    var name = clean.split('/').pop() || fallback || 'holiday.mp4';
    try { name = decodeURIComponent(name); } catch (e) {}
    if (!/\.mp4$/i.test(name)) name += '.mp4';
    return name;
  }
  function holidaySaveOpensTab() {
    var ua = navigator.userAgent || '';
    var plat = navigator.platform || '';
    if (/iPad|iPhone|iPod/i.test(ua)) return true;
    return plat === 'MacIntel' && navigator.maxTouchPoints > 1;
  }
  function canShareHolidayFile(file) {
    if (!file || !navigator.share || !navigator.canShare) return false;
    try { return navigator.canShare({ files: [file] }); }
    catch (e) { return false; }
  }
  function startHolidayPrefetch(job) {
    holidayPrefetchActive += 1;
    holidayFileTasks[job.url] = fetch(job.url, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('video fetch failed');
        return res.blob();
      })
      .then(function (blob) {
        var type = (blob && blob.type && blob.type.indexOf('video/') === 0) ? blob.type : 'video/mp4';
        var file = new File([blob], job.filename, { type: type });
        holidayFiles[job.url] = file;
        return file;
      })
      .catch(function () {
        delete holidayFileTasks[job.url];
      })
      .then(function () {
        holidayPrefetchActive -= 1;
        pumpHolidayPrefetch();
      });
  }
  function pumpHolidayPrefetch() {
    while (holidayPrefetchActive < 2 && holidayPrefetchQueue.length) {
      var job = holidayPrefetchQueue.shift();
      if (!job || !job.url || holidayFiles[job.url] || holidayFileTasks[job.url]) continue;
      startHolidayPrefetch(job);
    }
  }
  function prioritizeHolidayPrefetch(url, filename) {
    if (!url || holidayFiles[url] || holidayFileTasks[url]) return;
    holidayPrefetchQueue = holidayPrefetchQueue.filter(function (job) { return job.url !== url; });
    holidayPrefetchQueue.unshift({ url: url, filename: filename || holidayFileName(url) });
    pumpHolidayPrefetch();
  }
  function openHolidayVideo(url) {
    var opened = null;
    try { opened = window.open(url, '_blank'); } catch (e) {}
    if (opened) {
      try { opened.opener = null; } catch (e2) {}
      return;
    }
    window.location.assign(url);
  }
  function downloadHolidayFile(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename || holidayFileName(url));
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 0);
  }
  function saveHolidayVideo(url, filename, title) {
    if (!url) return;
    var name = filename || holidayFileName(url);
    var file = holidayFiles[url];
    // Share needs the File already in hand. Awaiting a fetch drops the iOS user gesture.
    if (file && canShareHolidayFile(file)) {
      var payload = { files: [file] };
      if (title) payload.title = title;
      try {
        var shared = navigator.share(payload);
        if (shared && typeof shared.catch === 'function') {
          shared.catch(function (err) {
            if (err && err.name === 'AbortError') return;
            if (holidaySaveOpensTab()) openHolidayVideo(url);
            else downloadHolidayFile(url, name);
          });
        }
      } catch (err) {
        if (holidaySaveOpensTab()) openHolidayVideo(url);
        else downloadHolidayFile(url, name);
      }
      return;
    }
    prioritizeHolidayPrefetch(url, name);
    if (holidaySaveOpensTab()) {
      openHolidayVideo(url);
      return;
    }
    downloadHolidayFile(url, name);
  }
  function primeHolidayVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.loop = true;
    video.autoplay = false;
    video.controls = false;
    video.removeAttribute('controls');
  }
  function bindHolidayTiles() {
    var root = qs('.holidays');
    if (!root) return;
    var HOLD_MS = 500;
    var MOVE_PX = 14;
    qsa('.holiday-tile', root).forEach(function (tile) {
      var stage = qs('.holiday-stage', tile);
      var video = qs('video', tile);
      var poster = qs('.holiday-poster', tile);
      var link = qs('.holiday-dl', tile);
      if (!stage || !video) return;
      primeHolidayVideo(video);
      var info = {
        url: (link && link.getAttribute('href')) || video.getAttribute('src') || '',
        filename: (link && link.getAttribute('download')) || '',
        title: tile.getAttribute('data-title') || 'Holiday'
      };
      if (!info.filename) info.filename = holidayFileName(info.url);
      var timer = null;
      var down = false;
      var armed = false;
      var moved = false;
      var suppressClick = false;
      var startX = 0;
      var startY = 0;
      var startedAt = 0;
      var savedAt = 0;
      function clearTimer() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
      function blockNextClick() {
        suppressClick = true;
      }
      function fitFrame() {
        var rect = stage.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        if (!w || !h) return;
        [poster, video].forEach(function (el) {
          if (!el) return;
          el.style.position = 'absolute';
          el.style.left = '0';
          el.style.top = '0';
          el.style.width = w + 'px';
          el.style.height = h + 'px';
          el.style.maxWidth = 'none';
          el.style.objectFit = 'contain';
          el.style.objectPosition = 'center center';
        });
      }
      function sync() {
        var playing = !video.paused && !video.ended;
        tile.setAttribute('data-state', playing ? 'playing' : 'paused');
        var btn = qs('.holiday-play', tile);
        if (!btn) return;
        btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
        btn.setAttribute('aria-label', (playing ? 'Pause ' : 'Play ') + info.title);
      }
      function togglePlay() {
        primeHolidayVideo(video);
        if (!video.paused && !video.ended) {
          video.pause();
          sync();
          return;
        }
        qsa('video', root).forEach(function (other) {
          if (other !== video) other.pause();
        });
        tile.setAttribute('data-state', 'playing');
        video.classList.add('is-shown');
        var pending = video.play();
        if (pending && typeof pending.then === 'function') {
          pending.then(function () {
            video.classList.add('is-shown');
            sync();
          }).catch(function (err) {
            if (video.paused) video.classList.remove('is-shown');
            if (err && err.name === 'AbortError') {
              sync();
              return;
            }
            sync();
          });
        } else {
          sync();
        }
      }
      function save(force) {
        if (!force && savedAt && (Date.now() - savedAt) < 900) return;
        savedAt = Date.now();
        saveHolidayVideo(info.url, info.filename, info.title);
      }
      function cancelHold() {
        down = false;
        armed = false;
        stage.classList.remove('is-holding');
        clearTimer();
      }
      function onPointerDown(e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        clearTimer();
        down = true;
        armed = false;
        moved = false;
        suppressClick = false;
        startX = e.clientX;
        startY = e.clientY;
        startedAt = Date.now();
        stage.classList.remove('is-holding');
        prioritizeHolidayPrefetch(info.url, info.filename);
        timer = setTimeout(function () {
          timer = null;
          if (!down || moved) return;
          armed = true;
          stage.classList.add('is-holding');
        }, HOLD_MS);
      }
      function onPointerMove(e) {
        if (!down) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        if ((dx * dx + dy * dy) > (MOVE_PX * MOVE_PX)) {
          moved = true;
          cancelHold();
        }
      }
      function onPointerUp(e) {
        if (!down) return;
        var held = armed || (Date.now() - startedAt) >= HOLD_MS;
        var drifted = moved;
        cancelHold();
        moved = false;
        if (drifted) return;
        if (held) {
          blockNextClick();
          save();
          return;
        }
        if (!e.pointerType || e.pointerType !== 'mouse') {
          blockNextClick();
          togglePlay();
        }
      }
      function onPointerLeave(e) {
        if (!down) return;
        if (e.pointerType === 'mouse' && e.buttons) {
          moved = true;
          cancelHold();
        }
      }
      function onContextMenu(e) {
        e.preventDefault();
        cancelHold();
        moved = false;
        blockNextClick();
        save();
      }
      function onClick(e) {
        if (e.button !== 0) {
          e.preventDefault();
          return;
        }
        var blocked = suppressClick;
        suppressClick = false;
        if (blocked) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        togglePlay();
      }
      function onKeyDown(e) {
        if (e.key === 'Enter' || e.key === ' ') suppressClick = false;
      }
      function onDownloadClick(e) {
        prioritizeHolidayPrefetch(info.url, info.filename);
        if (holidayFiles[info.url] && canShareHolidayFile(holidayFiles[info.url])) {
          e.preventDefault();
          save(true);
          return;
        }
        if (holidaySaveOpensTab()) {
          e.preventDefault();
          save(true);
        }
      }
      function onMedia() {
        if (!video.paused && !video.ended) video.classList.add('is-shown');
        sync();
      }
      function onPointerCancel() {
        if (!down) return;
        moved = true;
        cancelHold();
      }
      stage.addEventListener('pointerdown', onPointerDown);
      stage.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerCancel);
      stage.addEventListener('pointerleave', onPointerLeave);
      stage.addEventListener('contextmenu', onContextMenu);
      stage.addEventListener('auxclick', function (e) {
        e.preventDefault();
        blockNextClick();
      });
      stage.addEventListener('click', onClick);
      stage.addEventListener('keydown', onKeyDown);
      if (link) link.addEventListener('click', onDownloadClick);
      video.addEventListener('play', onMedia);
      video.addEventListener('playing', onMedia);
      video.addEventListener('pause', onMedia);
      video.addEventListener('ended', onMedia);
      video.addEventListener('loadedmetadata', fitFrame);
      fitFrame();
      requestAnimationFrame(fitFrame);
      if (window.ResizeObserver) {
        var ro = new ResizeObserver(fitFrame);
        ro.observe(stage);
        holidayCleanups.push(function () { ro.disconnect(); });
      }
      if (window.IntersectionObserver) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            prioritizeHolidayPrefetch(info.url, info.filename);
            io.disconnect();
          });
        }, { rootMargin: '200px' });
        io.observe(tile);
        holidayCleanups.push(function () { io.disconnect(); });
      } else {
        prioritizeHolidayPrefetch(info.url, info.filename);
      }
      sync();
      holidayCleanups.push(clearTimer);
      holidayCleanups.push(function () {
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
      });
    });
    function onViewport() {
      qsa('.holiday-stage', root).forEach(function (stage) {
        var tile = stage.closest ? stage.closest('.holiday-tile') : null;
        var poster = tile ? qs('.holiday-poster', tile) : null;
        var video = tile ? qs('video', tile) : null;
        var rect = stage.getBoundingClientRect();
        var w = rect.width;
        var h = rect.height;
        if (!w || !h) return;
        [poster, video].forEach(function (el) {
          if (!el) return;
          el.style.width = w + 'px';
          el.style.height = h + 'px';
          el.style.objectFit = 'contain';
        });
      });
    }
    window.addEventListener('resize', onViewport);
    window.addEventListener('orientationchange', onViewport);
    holidayCleanups.push(function () {
      window.removeEventListener('resize', onViewport);
      window.removeEventListener('orientationchange', onViewport);
    });
  }
  function pageTech() {
    return pageHero('TECHNOLOGY', 'assets/banners/technology.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.technology) + '</div></section>';
  }
  function pageListings() {
    var L = (C.site && C.site.listing) || {};
    return pageHero('OFFICE LISTINGS', 'assets/banners/listings.jpg') +
      '<section class="section"><div class="wrap"><div class="shot-single"><a class="shot" href="' + h(L.href) + '" target="_blank" rel="noopener">' +
      '<img src="' + h(L.img) + '" alt="' + h(L.alt || '') + '"></a></div></div></section>';
  }
  function pageTraining() {
    return pageHero('TRAINING LIBRARY', 'assets/banners/training.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.training) +
      '<div class="prose train-note">' + (C.trainingDisclaimer || '') + '</div></div></section>';
  }
  function pageCalcs() {
    return pageHero('CALCULATORS', 'assets/banners/calculators.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.calcs) + '</div></section>';
  }
  function pageCalcEmbed(info) {
    return '<section class="calc-stage" data-calc="' + h(info.key) + '"><div id="calc-host" class="calc-root"></div></section>';
  }
  var SOCIAL_ICONS = {
    facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
    instagram: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
    tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    x: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    zillow: 'M12.006 0L1.086 8.627v3.868c3.386-2.013 11.219-5.13 14.763-6.015.11-.024.16.005.227.078.372.427 1.586 1.899 1.916 2.301a.128.128 0 0 1-.03.195 43.607 43.607 0 0 0-6.67 6.527c-.03.037-.006.043.012.03 2.642-1.134 8.828-2.94 11.622-3.452V8.627zm-.48 11.177c-2.136.708-8.195 3.307-10.452 4.576V24h21.852v-7.936c-2.99.506-11.902 3.16-15.959 5.246a.183.183 0 0 1-.23-.036l-2.044-2.429c-.055-.061-.062-.098.011-.208 1.574-2.3 4.789-5.899 6.833-7.418.042-.03.031-.06-.012-.042Z',
  };
  function socialIcon(label) {
    var d = SOCIAL_ICONS[String(label || '').toLowerCase()];
    if (!d) return '';
    return '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#000000" d="' + d + '"/></svg>';
  }
  function socialRow(items) {
    if (!items || !items.length) return '';
    return '<div class="socials">' + items.map(function (s) {
      var icon = socialIcon(s.label);
      return '<a href="' + h(s.href) + '" target="_blank" rel="noopener" aria-label="' + h(s.label) + '" title="' + h(s.label) + '">' + (icon || h(s.label)) + '</a>';
    }).join('') + '</div>';
  }
  function pageRefer() {
    var R = C.refer || {};
    var check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="url(#referGold)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return pageHero('REFER AN AGENT', 'assets/banners/refer.jpg') +
      '<section class="section"><div class="wrap refer">' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="referGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs></svg>' +
      '<p class="refer-lead">' + h(R.lead) + '</p><p>' + h(R.intro) + '</p>' +
      '<h3>1. Cap reduction for referring a Producing Agent</h3>' +
      '<p>If the agent you refer is a <b>Producing Agent</b>, meaning they closed transactions totaling one of the sales volume thresholds below during the preceding 12 months, your cap is reduced:</p>' +
      '<div class="refer-stats">' +
      '<div class="refer-stat"><div class="n">$750</div><div class="l">Cap reduction</div><p>Referred agent’s 12-month sales volume: <b>$2.5M+</b></p></div>' +
      '<div class="refer-stat"><div class="n">$1,500</div><div class="l">Cap reduction</div><p>Referred agent’s 12-month sales volume: <b>$5M+</b></p></div>' +
      '</div>' +
      '<p>' + h(R.capNote) + '</p>' +
      '<h3>2. Referral Production Incentive: 1% of their GCI</h3>' +
      '<p>You receive a bonus equal to <b>1% of the total gross commission income (GCI)</b> the referred agent generates. The bonus:</p>' +
      '<div class="refer-checks"><div class="r">' + check + '<div>Lasts one (1) year from the referred agent’s hire date, then expires automatically, regardless of your production level</div></div>' +
      '<div class="r">' + check + '<div>Is not paid on any transaction that closes after the referred agent has reached their annual cap</div></div></div>' +
      '<h3>How to refer</h3>' +
      '<p>Fill out the form below with your information and the agent’s. Enrique will reach out to them personally.</p>' +
      '<p class="refer-cta"><a class="refer-btn" href="https://app.enesmarealty.com/leadforms/refer.html" target="_blank" rel="noopener">Refer an Agent</a></p>' +
      '<p class="note">' + h(R.legal) + '</p></div></section>';
  }
  function rosterInitials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    var first = (parts[0] || 'A').charAt(0);
    var last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }
  function rosterPhotoSrc(agent) {
    return agent.photoUrl || agent.fallbackPhoto || '';
  }
  function rosterPhoto(agent, alt) {
    var src = rosterPhotoSrc(agent);
    if (src) return '<img src="' + h(src) + '" alt="' + h(alt || ('Photo of ' + agent.name)) + '">';
    return '<div class="roster-ph" role="img" aria-label="No photo of ' + h(agent.name) + '"><span>' + h(rosterInitials(agent.name)) + '</span></div>';
  }
  function rosterContact(agent, includeWebsite) {
    var bits = [];
    if (agent.phone) bits.push('<a href="tel:' + h(String(agent.phone).replace(/[^\d+]/g, '')) + '">' + h(agent.phone) + '</a>');
    if (agent.email) bits.push('<a href="mailto:' + h(agent.email) + '">' + h(agent.email) + '</a>');
    if (includeWebsite && agent.website) bits.push('<a href="' + h(agent.website) + '" target="_blank" rel="noopener">' + h(agent.websiteLabel || agent.website) + '</a>');
    return bits.length ? '<p class="roster-contact">' + bits.join('<br>') + '</p>' : '';
  }
  function rosterBio(agent) {
    if (agent.bioHtml) return agent.bioHtml;
    if (!agent.bio) return '';
    return '<p>' + h(agent.bio) + '</p>';
  }
  function rosterCard(agent) {
    return '<article class="roster-card">' +
      '<a class="roster-main" href="#/agents/' + h(agent.slug) + '">' +
      rosterPhoto(agent) +
      '<h3>' + h(agent.name) + '</h3>' +
      '<p class="roster-title">' + h(agent.title || 'Agent') + (agent.dre ? ' · DRE# ' + h(agent.dre) : '') + '</p>' +
      '</a>' +
      rosterContact(agent, false) +
      '</article>';
  }
  function pageAgents() {
    return pageHero('Agents', 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap roster-mount" id="rosterMount" data-view="list"></div></section>';
  }
  function pageAgentShell(slug) {
    return pageHero('Agent', 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap roster-mount" id="rosterMount" data-view="agent" data-slug="' + h(slug) + '"></div></section>';
  }
  function pagePartners() {
    return pageHero('PREFERRED PARTNERS', 'assets/banners/partners-hero.jpg') +
      '<section class="section"><div class="wrap">' + shotGrid(C.site && C.site.partners) + '</div></section>';
  }
  function pageOfficeHubs() {
    return pageHero('OFFICE HUBS', 'assets/banners/officehubs.jpg') +
      '<section class="section" style="padding-top:28px"><div class="wrap">' +
      '<iframe class="hub-frame" src="' + h(CFG.OFFICEHUBS || 'https://app.enesmarealty.com/officehubs/') + '" title="Office Hubs"></iframe>' +
      '</div></section>';
  }
  function page404() {
    return '<section class="section"><div class="wrap" style="text-align:center"><h2>Page not found</h2><div class="gold-rule"></div><p><a href="#/">Back to the Hub</a></p></div></section>';
  }

  function pageFor(p) {
    if (p === '/') return pageHome();
    if (p === '/compliance') return pageCompliance();
    if (p === '/compliance/transaction-checklists' || p === '/compliance/checklists') return pageChecklists();
    if (p === '/compliance/c-a-r-legal-hotline' || p === '/compliance/legal-hotline') return pageLegal();
    if (p === '/compliance/office-documents') return pageOfficeDocs();
    if (p === '/compliance/office-policies') return pagePolicies();
    if (p === '/marketing-templates') return pageMarketing();
    if (p === '/marketing-templates/holidays') return pageHolidays();
    if (p === '/technology') return pageTech();
    if (p === '/listings') return pageListings();
    if (p === '/office-hubs') return pageOfficeHubs();
    if (p === '/training') return pageTraining();
    if (p === '/calculators') return pageCalcs();
    if (C.calcs && C.calcs[p]) return pageCalcEmbed(C.calcs[p]);
    if (p === '/refer') return pageRefer();
    if (p === '/agents') return pageAgents();
    if (p.indexOf('/agents/') === 0) return pageAgentShell(p.slice('/agents/'.length));
    if (p === '/preferred-partners') return pagePartners();
    return page404();
  }

  function titles() {
    var map = {
      '/': 'AGENT HUB',
      '/compliance': 'COMPLIANCE',
      '/compliance/transaction-checklists': 'Transaction Checklists',
      '/compliance/c-a-r-legal-hotline': 'C.A.R. Legal Hotline',
      '/compliance/office-documents': 'Office Documents',
      '/compliance/office-policies': 'Office Policies',
      '/marketing-templates': 'MARKETING',
      '/marketing-templates/holidays': 'HOLIDAYS',
      '/technology': 'TECHNOLOGY',
      '/listings': 'OFFICE LISTINGS',
      '/office-hubs': 'OFFICE HUBS',
      '/training': 'TRAINING LIBRARY',
      '/calculators': 'CALCULATORS',
      '/calculators/flip-calculator': 'Flip Calculator',
      '/calculators/net-sheet': 'Net Sheet',
      '/calculators/mortgage-calculator': 'Mortgage Calculator',
      '/calculators/cap-rate-calculator': 'Cap Rate Calculator',
      '/refer': 'REFER AN AGENT',
      '/agents': 'Agents',
      '/preferred-partners': 'PREFERRED PARTNERS'
    };
    var current = path();
    if (current.indexOf('/agents/') === 0 && window.HubRoster) {
      var person = HubRoster.bySlug(current.slice('/agents/'.length));
      if (person) return person.name;
      return 'Agent';
    }
    return map[current] || 'AGENT HUB';
  }

  function loginShell(inner) {
    return '<div class="login-page"><header class="top"><a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a></header>' +
      '<div class="login-wrap"><div class="login-card">' + inner + '</div></div></div>';
  }
  function renderLogin(msg) {
    detachHeroPark();
    warmHero();
    view = 'login';
    document.title = 'Sign in · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1 class="solo">Sign in</h1>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') +
      '<form id="lf" autocomplete="on">' +
      '<div class="f"><label for="lu">Email</label><input id="lu" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></div>' +
      '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn wide" id="lb">Sign in</button>' +
      '<p class="fine"><a href="#" id="lc">First time or forgot password?</a></p>' +
      '<p class="fine disclosure">Use the same email and password as Transaction Center. A code may be emailed when you sign in from a new device.</p></form>'
    );
    qs('#lc').onclick = function (e) { e.preventDefault(); renderForgot(qs('#lu').value.trim()); };
    qs('#lf').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Signing in…';
      var em = qs('#lu').value.trim().toLowerCase();
      Auth.api('login', { email: em, username: em, password: qs('#lp').value, deviceToken: Auth.getCookie('enesma_dt') || '' }).then(function (d) {
        if (d && d.needsOtp) return renderOtp(d);
        Auth.finishLogin(d);
        afterAuth();
      }).catch(function (err) { var keep = qs('#lu').value; renderLogin(err.message); qs('#lu').value = keep; });
    };
    syncHomeScreen();
    maybePlayIntro();
  }
  function renderOtp(ch, msg, okMsg) {
    detachHeroPark();
    view = 'otp'; otpCh = ch;
    var hint = (ch && ch.emailHint) || 'your account email';
    document.title = 'Enter code · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1>Enter your sign-in code</h1>' +
      '<p class="sub">We emailed a 6-digit code to <b>' + h(hint) + '</b>. It expires in about 10 minutes. Check spam if you don’t see it.</p>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') + (okMsg ? '<div class="ok">' + h(okMsg) + '</div>' : '') +
      '<form id="of">' +
      '<div class="f"><label for="oc">Code</label><input id="oc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
      '<label class="chk"><input id="ot" type="checkbox" checked> Trust this device for 30 days. We won’t ask for a code again on this browser until then.</label>' +
      '<button class="btn wide" id="ob">Verify and sign in</button>' +
      '<p class="fine"><a href="#" id="or">Send a new code</a> · <a href="#" id="obk">Back to sign in</a></p></form>'
    );
    qs('#obk').onclick = function (e) { e.preventDefault(); renderLogin(); };
    qs('#or').onclick = function (e) {
      e.preventDefault();
      Auth.api('resendLoginOtp', { challengeId: ch.challengeId }).then(function (d) {
        renderOtp({ challengeId: ch.challengeId, emailHint: (d && d.emailHint) || hint }, '', 'A new code is on its way.');
      }).catch(function (err) { renderOtp(ch, err.message); });
    };
    qs('#of').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#ob'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Verifying…';
      Auth.api('verifyLoginOtp', { challengeId: ch.challengeId, code: qs('#oc').value.trim(), rememberDevice: qs('#ot').checked, deviceLabel: (navigator.userAgent || '').slice(0, 120) })
        .then(function (d) { Auth.finishLogin(d); afterAuth(); })
        .catch(function (err) { renderOtp(ch, err.message); });
    };
    setTimeout(function () { var el = qs('#oc'); if (el) el.focus(); }, 30);
    syncHomeScreen();
  }
  function renderForgot(email, step, msg, okMsg, need) {
    detachHeroPark();
    view = 'forgot';
    var two = step === 2; need = need || [];
    document.title = 'Reset password · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1>' + (two ? 'Enter your code' : 'Set up or reset your password') + '</h1>' +
      '<p class="sub">' + (two ? 'We emailed a 6-digit code to <b>' + h(email) + '</b>. It expires in 15 minutes. Check spam if you don’t see it.' : 'Enter the email address the office registered for you. We’ll email you a code.') + '</p>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') + (okMsg ? '<div class="ok">' + h(okMsg) + '</div>' : '') +
      '<form id="cf">' +
      (two
        ? '<input type="hidden" id="ce" value="' + h(email) + '">' +
          '<div class="f"><label for="cc">Code</label><input id="cc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
          '<div class="f"><label for="c1">New password</label><input id="c1" type="password" autocomplete="new-password" minlength="10" required></div>' +
          '<div class="f"><label for="c2">Repeat new password</label><input id="c2" type="password" autocomplete="new-password" required></div>' +
          '<p class="note">At least 10 characters with letters and numbers.</p>' +
          (need.indexOf('firstName') >= 0 ? '<div class="f"><label for="cfn">First name</label><input id="cfn" type="text" autocomplete="given-name" maxlength="50" required></div>' : '') +
          (need.indexOf('lastName') >= 0 ? '<div class="f"><label for="cln">Last name</label><input id="cln" type="text" autocomplete="family-name" maxlength="50" required></div>' : '') +
          (need.indexOf('phone') >= 0 ? '<div class="f"><label for="cph">Phone</label><input id="cph" type="tel" autocomplete="tel" placeholder="000-000-0000" required></div>' : '')
        : '<div class="f"><label for="ce">Email</label><input id="ce" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" value="' + h(email || '') + '" required></div>') +
      '<button class="btn wide" id="cb">' + (two ? 'Save password and sign in' : 'Email me a code') + '</button>' +
      '<p class="fine">' + (two ? '<a href="#" id="cr">Send a new code</a> · ' : '') + '<a href="#" id="cbk">Back to sign in</a></p></form>'
    );
    qs('#cbk').onclick = function (e) { e.preventDefault(); renderLogin(); };
    if (qs('#cr')) qs('#cr').onclick = function (e) { e.preventDefault(); renderForgot(email); };
    function unsupported(err) { return /unknown action/i.test(err.message) ? 'Password setup by email isn’t switched on yet. Ask Enrique to reset your password.' : err.message; }
    qs('#cf').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#cb'), em = qs('#ce').value.trim().toLowerCase();
      if (!two) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return renderForgot(em, 1, 'Enter a valid email address.');
        b.disabled = true; b.innerHTML = '<span class="spin"></span>Sending…';
        return Auth.api('requestPasswordCode', { email: em }).then(function () {
          renderForgot(em, 2, '', 'If that email has an account, a code is on its way.');
        }).catch(function (err) { renderForgot(em, 1, unsupported(err)); });
      }
      var p1 = qs('#c1').value;
      if (p1 !== qs('#c2').value) return renderForgot(em, 2, 'The new passwords do not match.', '', need);
      if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return renderForgot(em, 2, 'Use at least 10 characters with letters and numbers.', '', need);
      var body = { email: em, code: qs('#cc').value.trim(), newPassword: p1 };
      if (qs('#cfn')) body.firstName = qs('#cfn').value.trim();
      if (qs('#cln')) body.lastName = qs('#cln').value.trim();
      if (qs('#cph')) body.phone = qs('#cph').value.trim();
      b.disabled = true; b.innerHTML = '<span class="spin"></span>Saving…';
      Auth.api('resetPasswordWithCode', body).then(function (d) {
        Auth.finishLogin(d);
        afterAuth();
      }).catch(function (err) {
        if (err.code === 'PROFILE_REQUIRED') return renderForgot(em, 2, err.message, '', err.fields || ['phone']);
        renderForgot(em, 2, unsupported(err), '', need);
      });
    };
    syncHomeScreen();
  }

  function bindRoster() {
    var root = qs('#rosterMount');
    if (!root || !window.HubRoster) return;
    var view = root.getAttribute('data-view');
    var slug = root.getAttribute('data-slug') || '';
    function showLoading() {
      root.innerHTML = '<div class="boot"><span class="spin"></span>Loading Agents…</div>';
    }
    function showError() {
      root.innerHTML = '<div class="roster-status"><h2>Roster Unavailable</h2><p>' + h(HubRoster.state.error || 'The agent roster could not be loaded.') + '</p></div>';
    }
    function paintProfile(agent) {
      var hero = qs('.page-hero h1');
      if (!agent) {
        if (hero) hero.textContent = 'Agent';
        root.innerHTML = '<div class="roster-status"><h2>Agent Not Found</h2><p><a href="#/agents">All Agents</a></p></div>';
        return;
      }
      if (hero) hero.textContent = 'Agents';
      document.title = agent.name + ' · ENESMA Realty';
      var photoBtn = rosterPhotoSrc(agent) ? 'Change Photo' : 'Upload Photo';
      var admin = HubRoster.isAdmin(S.user)
        ? '<div class="photo-admin"><button class="btn" id="photoBtn" type="button">' + photoBtn + '</button>' +
          '<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>' +
          '<p class="photo-hint">Use a photo with a white background.</p>' +
          '<p class="photo-msg" id="photoMsg" role="status"></p></div>'
        : '';
      root.innerHTML = '<p class="roster-back"><a href="#/agents">All Agents</a></p><div class="agent">' +
        rosterPhoto(agent) + admin +
        '<div class="agent-body"><div class="agent-info"><h2>' + h(agent.name) + '</h2>' +
        '<p class="meta">' + h(agent.title || 'Agent') + (agent.dre ? ' · DRE# ' + h(agent.dre) : '') + '</p>' +
        (agent.languages && agent.languages.length ? '<p class="roster-langs">' + h(agent.languages.join(' · ')) + '</p>' : '') +
        rosterContact(agent, true) + '</div>' +
        socialRow(agent.links) +
        '<div class="agent-bio">' + rosterBio(agent) + '</div></div></div>';
      var btn = qs('#photoBtn', root);
      var file = qs('#photoFile', root);
      if (!btn || !file) return;
      btn.onclick = function () { file.click(); };
      file.onchange = function () {
        var chosen = file.files && file.files[0];
        if (!chosen) return;
        var msg = qs('#photoMsg', root);
        btn.disabled = true;
        if (msg) msg.textContent = 'Uploading Photo…';
        HubRoster.savePhoto(agent.id, chosen).then(function () {
          paintProfile(HubRoster.bySlug(agent.slug) || agent);
        }).catch(function (err) {
          btn.disabled = false;
          if (msg) msg.textContent = (err && err.message) || 'The photo could not be saved.';
        });
      };
    }
    function paintList() {
      var query = ((qs('#agentSearch', root) || {}).value || '').trim().toLowerCase();
      var lang = (qs('#agentLang', root) || {}).value || '';
      var matched = HubRoster.agents().filter(function (agent) {
        if (query && agent.name.toLowerCase().indexOf(query) < 0) return false;
        if (lang && (agent.languages || []).indexOf(lang) < 0) return false;
        return true;
      });
      var grid = qs('#rosterGrid', root);
      if (!grid) return;
      grid.innerHTML = matched.length
        ? '<div class="roster-grid">' + matched.map(rosterCard).join('') + '</div>'
        : '<div class="roster-status"><h2>No Matching Agents</h2><p>Try another name or language.</p></div>';
    }
    function paintListShell() {
      var selected = (qs('#agentLang', root) || {}).value || '';
      var typed = (qs('#agentSearch', root) || {}).value || '';
      var langs = HubRoster.languages();
      root.innerHTML = '<div class="roster-tools">' +
        '<label class="roster-field"><span>Search by Name</span><input id="agentSearch" type="search" placeholder="Search by Name" autocomplete="off" value="' + h(typed) + '"></label>' +
        '<label class="roster-field"><span>Language</span><select id="agentLang">' +
        '<option value="">All Languages</option>' +
        langs.map(function (lang) { return '<option value="' + h(lang) + '"' + (lang === selected ? ' selected' : '') + '>' + h(lang) + '</option>'; }).join('') +
        '</select></label></div>' +
        '<p class="roster-lead">ENESMA Realty agents. Search by name or choose a language.</p>' +
        '<div id="rosterGrid"></div>';
      qs('#agentSearch', root).oninput = paintList;
      qs('#agentLang', root).onchange = paintList;
      paintList();
    }
    function paint() {
      if (HubRoster.state.status === 'error' && !HubRoster.agents().length) return showError();
      if (view === 'agent') return paintProfile(HubRoster.bySlug(slug));
      paintListShell();
    }
    if (HubRoster.state.status !== 'ready') showLoading();
    else paint();
    HubRoster.load(true).then(paint).catch(function () {
      if (!HubRoster.agents().length) showError();
    });
  }

  function bindChrome() {
    var top = qs('#top');
    if (qs('#menuBtn')) qs('#menuBtn').onclick = function () { if (top) top.classList.toggle('nav-open'); };
    qsa('.caret-btn').forEach(function (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var drop = btn.parentNode;
        var willOpen = !drop.classList.contains('open');
        qsa('.drop.open').forEach(function (node) {
          node.classList.remove('open');
          var caret = qs('.caret-btn', node);
          if (caret) caret.setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          drop.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      };
    });
    qsa('#nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (top) top.classList.remove('nav-open');
        qsa('.drop.open').forEach(function (node) { node.classList.remove('open'); });
      });
    });
    bindRoster();
    if (qs('#signOut')) qs('#signOut').onclick = function () { Auth.signOut(); renderLogin(); };
    if (qs('#searchBtn')) qs('#searchBtn').onclick = function () { searchOpen = true; renderApp(); };
    if (qs('#searchScrim')) {
      qs('#searchScrim').onclick = function (e) { if (e.target.id === 'searchScrim') { searchOpen = false; renderApp(); } };
      var input = qs('#searchIn'), hits = qs('#searchHits');
      function run() {
        var q = (input.value || '').trim().toLowerCase();
        var found = searchIndex().filter(function (x) {
          return !q || (x.t + ' ' + (x.s || '')).toLowerCase().indexOf(q) >= 0;
        }).slice(0, 20);
        hits.innerHTML = found.map(function (x) {
          var ext = /^https?:|^mailto:/i.test(x.h);
          return '<a href="' + h(x.h) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + h(x.t) + '<small>' + h(x.s || '') + '</small></a>';
        }).join('') || '<p class="note">No matching pages.</p>';
      }
      input.oninput = run; run();
      input.focus();
      qsa('#searchHits a').forEach(function (a) {
        if (a.getAttribute('href').charAt(0) === '#') a.addEventListener('click', function () { searchOpen = false; });
      });
    }
  }

  var INTRO_MS = 3000;
  var introToken = 0;

  function introSeen() {
    try { return sessionStorage.getItem('enesma_intro_seen') === '1'; }
    catch (e) { return false; }
  }
  function markIntroSeen() {
    try { sessionStorage.setItem('enesma_intro_seen', '1'); } catch (e) {}
  }
  function endBrandIntro(token) {
    if (token && token !== introToken) return;
    var el = qs('.brand-intro');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try { document.dispatchEvent(new Event('enesma-intro-done')); } catch (e) {}
  }
  function maybePlayIntro() {
    if (introSeen()) return;
    if (S.token && path() !== '/') {
      markIntroSeen();
      return;
    }
    markIntroSeen();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var token = ++introToken;
    var overlay = document.createElement('div');
    overlay.className = 'brand-intro';
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'ENESMA');
    var mark = document.createElement('div');
    mark.className = 'brand-intro-mark';
    var zoom = document.createElement('div');
    zoom.className = 'brand-intro-zoom';
    var logo = document.createElement('img');
    logo.className = 'brand-intro-logo';
    logo.alt = '';
    logo.draggable = false;
    logo.src = 'assets/logo-gold.svg?v=1';
    var glint = document.createElement('div');
    glint.className = 'brand-intro-glint';
    glint.setAttribute('aria-hidden', 'true');
    var streak = document.createElement('span');
    glint.appendChild(streak);
    zoom.appendChild(logo);
    zoom.appendChild(glint);
    mark.appendChild(zoom);
    overlay.appendChild(mark);
    document.body.appendChild(overlay);
    var finished = false;
    var raf = 0;
    var safety = 0;
    function finish() {
      if (finished || token !== introToken) return;
      finished = true;
      if (raf) cancelAnimationFrame(raf);
      if (safety) clearTimeout(safety);
      document.removeEventListener('keydown', onKey);
      endBrandIntro(token);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        finish();
      }
    }
    overlay.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      finish();
    });
    overlay._endIntro = finish;
    document.addEventListener('keydown', onKey);
    safety = setTimeout(finish, INTRO_MS + 700);
    function playMark() {
      var start = 0;
      function frame(now) {
        if (finished || token !== introToken) return;
        if (!start) start = now;
        var t = Math.min(1, (now - start) / INTRO_MS);
        drawIntroFrame(zoom, streak, overlay, t);
        if (t >= 1) { finish(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    if (logo.complete) playMark();
    else {
      logo.onload = function () { if (!finished) playMark(); };
      logo.onerror = function () { finish(); };
    }
  }
  function drawIntroFrame(zoom, streak, overlay, t) {
    var visual = 1;
    var alpha = 1;
    var veil = 1;
    if (t < 0.14) {
      alpha = 1 - Math.pow(1 - t / 0.14, 3);
    } else if (t >= 0.46) {
      var u = (t - 0.46) / 0.54;
      var rush = u * u;
      visual = 1 + 7 * rush;
      var fadeU = Math.max(0, (u - 0.22) / 0.78);
      veil = 1 - fadeU * fadeU * (3 - 2 * fadeU);
    }
    zoom.style.transform = 'translate(-50%, -50%) scale(' + (visual / 8).toFixed(4) + ')';
    zoom.style.opacity = alpha.toFixed(3);
    overlay.style.opacity = veil.toFixed(3);
    if (t >= 0.14 && t < 0.46) {
      var g = (t - 0.14) / 0.32;
      var sweep = g * g * (3 - 2 * g);
      streak.style.opacity = '1';
      streak.style.transform = 'translate3d(' + (-150 + sweep * 860).toFixed(1) + '%, 0, 0)';
    } else {
      streak.style.opacity = '0';
    }
  }

  function bindHeroVideos() {
    var box = qs('.hero-videos');
    if (!box) return;
    var hero = box.closest('.hero');
    var clips = heroClipSrcs();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      box.classList.add('off');
      qsa('video', box).forEach(function (v) {
        v.removeAttribute('autoplay');
        v.removeAttribute('poster');
        v.removeAttribute('src');
        try { v.pause(); } catch (e) {}
      });
      if (heroWarm) detachHeroPark();
      return;
    }
    if (heroWarm && heroWarm.api) {
      heroWarm.mounted = true;
      if (heroWarm.park.parentNode !== box) box.appendChild(heroWarm.park);
      heroWarm.api.attach(hero);
      heroWarm.api.play();
      return;
    }
    var slots = heroWarm ? heroWarm.vids : qsa('video', box);
    if (heroWarm) {
      heroWarm.mounted = true;
      if (heroWarm.park.parentNode !== box) box.appendChild(heroWarm.park);
    }
    if (slots.length < 2 || !clips.length) return;
    slots.forEach(function (v, i) {
      prepHeroVideo(v);
      if (!v._heroSrc) v._heroSrc = clips[i] || v.getAttribute('src') || '';
    });
    var active = 0;
    var clipAt = [0, 1 % clips.length];
    var fading = false;
    var fadeMs = 1600;
    var heroEl = hero;
    function showTap() {
      if (box) box.classList.remove('off');
      if (slots[active]) slots[active].classList.add('on', 'over');
      if (heroEl) heroEl.classList.add('needs-gesture');
    }
    function clearTap() {
      if (heroEl) heroEl.classList.remove('needs-gesture');
    }
    function reveal(v) {
      if (!v || v !== slots[active]) return;
      if (box) box.classList.remove('off');
      v.classList.add('on', 'over');
      clearTap();
    }
    function autoplayBlocked(err) {
      if (!err || err.name === 'NotAllowedError') return true;
      return /not allowed|user gesture|interact with|user agent/i.test(String(err.message || ''));
    }
    function restack() {
      slots.forEach(function (v, i) {
        var top = i === active;
        v.classList.toggle('over', top);
        v.classList.toggle('under', !top);
        v.classList.toggle('on', top);
        if (!v.classList.contains('fading')) v.style.opacity = '1';
      });
    }
    function arm(el, src) {
      prepHeroVideo(el);
      el.autoplay = false;
      el.removeAttribute('autoplay');
      if (el._heroSrc === src) return;
      el._heroSrc = src;
      el.src = src;
      el.addEventListener('loadeddata', function parkFrame() {
        if (el.classList.contains('over')) return;
        try {
          if (el.currentTime < 0.001) el.currentTime = 0.001;
        } catch (e) {}
        try { el.pause(); } catch (e) {}
      }, { once: true });
    }
    function play(v) {
      if (!v || (box && box.classList.contains('off'))) return;
      prepHeroVideo(v);
      v.autoplay = true;
      var wasLoop = v.loop || v.hasAttribute('loop');
      v.loop = false;
      v.removeAttribute('loop');
      // The parked clip loops until Home is on screen. If that loop is about
      // to end, start it again so the crossfade still has a visible clip.
      if (wasLoop && isFinite(v.duration) && v.currentTime > v.duration - fadeMs / 1000 - 0.3) {
        try { v.currentTime = 0.05; } catch (e) {}
      }
      v.setAttribute('autoplay', '');
      if (box) box.classList.remove('off');
      v.classList.add('on', 'over');
      var p = v.play();
      if (p && p.then) {
        p.then(function () { reveal(v); }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (autoplayBlocked(err)) showTap();
        });
      } else {
        reveal(v);
      }
      return p;
    }
    function goNext() {
      if (fading || (box && box.classList.contains('off'))) return;
      if (heroWarm && !heroWarm.mounted) return;
      fading = true;
      var gen = heroWarm ? heroWarm.gen : 0;
      var outgoing = active;
      var incoming = outgoing ? 0 : 1;
      var incomingClip = clipAt[incoming];
      var prev = slots[outgoing];
      var next = slots[incoming];
      var started = false;
      function aborted() {
        return (heroWarm && heroWarm.gen !== gen) || !next.isConnected;
      }
      function begin() {
        if (started || aborted()) return;
        if (!(next.videoWidth > 1)) return;
        started = true;
        next.removeEventListener('playing', onPlaying);
        prev.classList.add('over', 'fading');
        next.classList.add('under');
        next.classList.remove('over');
        prev.style.opacity = '1';
        void prev.offsetWidth;
        prev.style.opacity = '0';
        active = incoming;
        setTimeout(function () {
          if (aborted()) { fading = false; return; }
          prev.classList.remove('fading', 'over', 'on');
          prev.classList.add('under');
          prev.style.opacity = '1';
          next.classList.remove('under');
          next.classList.add('over', 'on');
          try { prev.pause(); } catch (e) {}
          var follow = (incomingClip + 1) % clips.length;
          arm(prev, clips[follow]);
          clipAt[outgoing] = follow;
          fading = false;
        }, fadeMs);
      }
      function onPlaying() { begin(); }
      next.addEventListener('playing', onPlaying);
      prepHeroVideo(next);
      next.autoplay = true;
      try {
        if (next.currentTime > 0.2 || next.currentTime < 0.001) next.currentTime = 0.001;
      } catch (e) {}
      var p = next.play();
      if (p && p.then) {
        p.then(function () { if (next.videoWidth > 1) begin(); }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (autoplayBlocked(err)) showTap();
        });
      }
      setTimeout(function () {
        if (started || aborted()) return;
        fading = false;
        next.removeEventListener('playing', onPlaying);
        try { next.pause(); } catch (e) {}
        restack();
      }, 1200);
    }
    if (!heroWarm || !heroWarm.bound) {
      slots.forEach(function (v) {
        v.onplaying = function () { reveal(v); };
        v.onerror = function () {
          if (v !== slots[active] || fading) return;
          goNext();
        };
        v.ontimeupdate = function () {
          if (v !== slots[active] || fading || !isFinite(v.duration)) return;
          if (!heroWarm || heroWarm.mounted) {
            if (v.currentTime >= v.duration - fadeMs / 1000) goNext();
          }
        };
        v.onended = function () {
          if (v === slots[active] && (!heroWarm || heroWarm.mounted)) goNext();
        };
      });
      if (!slots[1]._heroSrc) arm(slots[1], clips[clipAt[1]]);
      else slots[1]._heroSrc = slots[1]._heroSrc || clips[clipAt[1]];
    }
    restack();
    if (box) box.classList.remove('off');
    var io = null;
    function attach(nextHero) {
      heroEl = nextHero || heroEl;
      if (io) { try { io.disconnect(); } catch (e) {} io = null; }
      if (heroEl && !heroEl._heroClick) {
        heroEl._heroClick = true;
        heroEl.addEventListener('click', function () {
          if (!heroEl.classList.contains('needs-gesture')) return;
          play(slots[active]);
        });
      }
      if ('IntersectionObserver' in window && heroEl) {
        io = new IntersectionObserver(function (ents) {
          var vis = ents[0] && ents[0].isIntersecting;
          if (!vis) {
            if (heroEl && heroEl.getBoundingClientRect().height < 8) return;
            if (fading) return;
            slots.forEach(function (v) { try { v.pause(); } catch (e) {} });
          } else {
            play(slots[active]);
          }
        }, { threshold: 0.2 });
        io.observe(heroEl);
        if (heroWarm) heroWarm.io = io;
      }
    }
    var api = {
      play: function () { play(slots[active]); },
      attach: attach,
      restack: restack
    };
    if (heroWarm) {
      heroWarm.api = api;
      heroWarm.bound = true;
      heroWarm.mounted = true;
    }
    attach(hero);
    // Play now, including underneath the gold intro, so the handoff is footage.
    api.play();
  }
  function renderApp(force) {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && path() === '/') {
      warmHero();
      if (!force && heroWarm && !heroFrameReady()) {
        if (heroWarm._waiting) return;
        heroWarm._waiting = true;
        whenHeroFrame(2000).then(function () {
          if (heroWarm) heroWarm._waiting = false;
          if (!S.token || path() !== '/') return;
          renderApp(true);
        });
        return;
      }
    }
    detachHeroPark();
    clearHolidayBindings();
    view = 'app';
    document.title = titles() + ' · ENESMA Realty';
    $app.innerHTML = headerHtml() + pageFor(path()) + footerHtml() + searchOverlay();
    bindChrome();
    maybePlayIntro();
    bindHeroVideos();
    bindHolidayTiles();
    var stage = qs('[data-calc]');
    if (stage && window.HubCalcs) {
      var mount = HubCalcs[stage.getAttribute('data-calc')];
      var host = qs('#calc-host');
      if (mount && host) mount(host);
    }
    window.scrollTo(0, 0);
    syncHomeScreen();
  }
  function readyRoster() {
    if (!window.HubRoster) return Promise.resolve();
    return HubRoster.load().catch(function () {});
  }
  function afterAuth() {
    if (!location.hash || location.hash === '#/login') location.hash = '#/';
    readyRoster().then(function () { renderApp(); });
  }

  function onRoute() {
    if (!S.token) {
      if (view !== 'login' && view !== 'otp' && view !== 'forgot') renderLogin();
      return;
    }
    renderApp();
  }

  window.addEventListener('hashchange', function () {
    var intro = qs('.brand-intro');
    if (intro && intro._endIntro) intro._endIntro();
    searchOpen = false;
    onRoute();
  });
  window.addEventListener('hashchange', syncHomeScreen);

  function boot() {
    syncHomeScreen();
    Auth.bootSession();
    if (!S.token || path() === '/') warmHero();
    if (!S.token) { renderLogin(); return; }
    Auth.api('me').then(function (d) {
      S.user = (d && d.user) || d;
      return readyRoster();
    }).then(function () { renderApp(); }).catch(function (err) {
      renderLogin(err.code === 'AUTH' ? '' : err.message);
    });
  }
  boot();
})();
