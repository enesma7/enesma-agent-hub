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
  function headerHtml() {
    var p = path();
    function on(prefix) { return p === prefix || (prefix !== '/' && p.indexOf(prefix) === 0) ? ' on' : ''; }
    return '<header class="top" id="top">' +
      '<a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a>' +
      '<button class="menu-btn icon-btn" id="menuBtn" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '<nav class="nav" id="nav">' +
        '<a href="#/" class="' + on('/') + (p !== '/' ? '' : ' on') + '">Home</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/compliance') + '" type="button">Compliance <i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="#/compliance/transaction-checklists">Transaction Checklists</a>' +
            '<a href="#/compliance/c-a-r-legal-hotline">C.A.R. Legal Hotline</a>' +
            '<a href="#/compliance/office-documents">Office Documents</a>' +
            '<a href="#/compliance/office-policies">Office Policies</a>' +
          '</div>' +
        '</div>' +
        '<div class="drop">' +
          '<button class="link' + on('/marketing-templates') + '" type="button">Marketing <i class="caret"></i></button>' +
          '<div class="drop-menu"><a href="#/marketing-templates">Templates</a><a href="#/marketing-templates/holidays">Holidays</a></div>' +
        '</div>' +
        '<a href="#/technology" class="' + on('/technology') + '">Technology</a>' +
        '<a href="#/listings" class="' + on('/listings') + '">Listings</a>' +
        '<a href="#/training" class="' + on('/training') + '">Training</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/calculators') + '" type="button">Calculators <i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="#/calculators/flip-calculator">Flip Calculator</a>' +
            '<a href="#/calculators/net-sheet">Net Sheet</a>' +
            '<a href="#/calculators/mortgage-calculator">Mortgage Calculator</a>' +
            '<a href="#/calculators/cap-rate-calculator">Cap Rate Calculator</a>' +
          '</div>' +
        '</div>' +
        '<a href="#/refer" class="' + on('/refer') + '">Refer</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/agents') + '" type="button">Agents <i class="caret"></i></button>' +
          '<div class="drop-menu"><a href="#/agents/enrique-esparza">Enrique Esparza</a><a href="#/agents/lilia-amador">Lilia Amador</a></div>' +
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
      var sub = t.sub || '';
      if (!title && t.alt) {
        var bits = String(t.alt).split(/\.\s+/);
        title = bits.shift() || '';
        if (!sub) sub = bits.join('. ');
      }
      return '<a class="tpl-bar" href="' + h(href) + '"' + open + '><span class="dash"></span><span class="t">' + h(title) + '</span>' +
        (sub ? '<span class="s">' + h(sub) + '</span>' : '') + '</a>';
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
      { t: 'Calculators', s: 'Flip, net sheet, mortgage and cap rate', h: '#/calculators' },
      { t: 'Cap Rate Calculator', s: 'NOI and capitalization rate', h: '#/calculators/cap-rate-calculator' },
      { t: 'Refer an Agent', s: 'Referral addendum and incentives', h: '#/refer' },
      { t: 'Agents', s: 'ENESMA agents', h: '#/agents' },
      { t: 'Preferred Partners', s: 'Escrow, lenders, inspectors and more', h: '#/preferred-partners' }
    ];
    (C.agents || []).forEach(function (a) { items.push({ t: a.name, s: a.role + ' · DRE# ' + a.dre, h: '#/agents/' + a.slug }); });
    (C.partners || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.tech || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.checklists || []).forEach(function (p) { items.push({ t: p.title, s: 'Transaction checklist', h: '#/compliance/transaction-checklists' }); });
    return items;
  }
  function searchOverlay() {
    if (!searchOpen) return '';
    return '<div class="search-scrim" id="searchScrim"><div class="search-box"><input id="searchIn" type="search" placeholder="Search the Hub" autofocus><div id="searchHits"></div></div></div>';
  }

  function heroVideos() {
    // Rancho Palos Verdes / San Pedro sunset drone, no people. Pexels 27954154.
    // Downtown Los Angeles and the 6th Street Viaduct, aerial.
    // Dana Point Harbor aerial. Southern California harbor, no people.
    // Snowy mountain aerial. Southern California mountain snow, no people.
    // Joshua Tree National Park scenic, no people.
    var clips = [
      'assets/hero/laguna-coast.mp4?v=27',
      'assets/hero/la-skyline.mp4',
      'assets/hero/catalina.mp4',
      'assets/hero/big-bear.mp4',
      'assets/hero/joshua-tree.mp4'
    ];
    return '<div class="hero-videos" aria-hidden="true">' + clips.map(function (src, i) {
      return '<video muted playsinline webkit-playsinline' + (i === 0 ? ' autoplay' : '') + ' preload="' + (i === 0 ? 'auto' : 'metadata') + '"><source src="' + src + '" type="video/mp4"></video>';
    }).join('') + '</div>';
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
      sectionHead('Templates', 'Canva designs and holiday graphics.') +
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
  function pageAgents() {
    var cards = (C.agents || []).map(function (a) {
      return '<a class="card-plain" href="#/agents/' + h(a.slug) + '"><img src="' + h(a.img) + '" alt="" style="width:100%;height:220px;object-fit:cover;border-radius:6px;margin-bottom:12px"><h3>' + h(a.name) + '</h3><p>' + h(a.role) + ' · DRE# ' + h(a.dre) + '</p></a>';
    }).join('');
    return pageHero('REAL ESTATE AGENTS', 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap"><div class="grid-2">' + cards + '</div></div></section>';
  }
  function pageAgent(a) {
    return pageHero(a.name.toUpperCase(), 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap"><div class="agent">' +
      '<img src="' + h(a.img) + '" alt="' + h(a.name) + '"><div class="agent-body">' +
      '<div class="agent-info"><h2>' + h(a.name) + '</h2><p class="meta">' + h(a.role) + ' · DRE# ' + h(a.dre) + '</p>' +
      '<p class="agent-contact"><a href="tel:' + h(a.phone.replace(/[^\d+]/g, '')) + '">' + h(a.phone) + '</a><br>' +
      '<a href="mailto:' + h(a.email) + '">' + h(a.email) + '</a><br>' +
      '<a href="' + h(a.web) + '" target="_blank" rel="noopener">' + h(a.webLabel) + '</a></p></div>' +
      socialRow(a.social) +
      '<div class="agent-bio">' + (a.bioHtml || '') + '</div></div></div></section>';
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
    if (p.indexOf('/agents/') === 0) {
      var slug = p.slice('/agents/'.length);
      var a = (C.agents || []).filter(function (x) { return x.slug === slug; })[0];
      return a ? pageAgent(a) : page404();
    }
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
      '/agents': 'REAL ESTATE AGENTS',
      '/agents/enrique-esparza': 'Enrique Esparza',
      '/agents/lilia-amador': 'Lilia Amador',
      '/preferred-partners': 'PREFERRED PARTNERS'
    };
    return map[path()] || 'AGENT HUB';
  }

  function loginShell(inner) {
    return '<div class="login-page"><header class="top"><a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a></header>' +
      '<div class="login-wrap"><div class="login-card">' + inner + '</div></div></div>';
  }
  function renderLogin(msg) {
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
  }
  function renderOtp(ch, msg, okMsg) {
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
  }
  function renderForgot(email, step, msg, okMsg, need) {
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
  }

  function bindChrome() {
    var top = qs('#top');
    if (qs('#menuBtn')) qs('#menuBtn').onclick = function () { if (top) top.classList.toggle('nav-open'); };
    qsa('.drop > button.link').forEach(function (btn) {
      btn.onclick = function (e) {
        if (window.matchMedia('(max-width: 880px)').matches) {
          e.preventDefault();
          btn.parentNode.classList.toggle('open');
        }
      };
    });
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

  function bindHeroVideos() {
    var box = qs('.hero-videos');
    if (!box) return;
    var hero = box.closest('.hero');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      box.classList.add('off');
      qsa('video', box).forEach(function (v) {
        v.removeAttribute('autoplay');
        v.removeAttribute('poster');
        try { v.pause(); } catch (e) {}
      });
      return;
    }
    var vids = qsa('video', box);
    if (!vids.length) return;
    var i = 0;
    var fading = false;
    var fadeMs = 1600;
    function showTap() {
      vids.forEach(function (v) { v.classList.remove('on'); });
      box.classList.add('off');
      if (hero) hero.classList.add('needs-gesture');
    }
    function clearTap() {
      if (hero) hero.classList.remove('needs-gesture');
    }
    function reveal(v) {
      if (!v || v.paused || v !== vids[i]) return;
      box.classList.remove('off');
      v.classList.add('on');
      clearTap();
    }
    function autoplayBlocked(err) {
      if (!err || err.name === 'NotAllowedError') return true;
      return /not allowed|user gesture|interact with|user agent/i.test(String(err.message || ''));
    }
    function play(v) {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.removeAttribute('poster');
      var p = v.play();
      if (p && p.then) {
        p.then(function () { reveal(v); }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (autoplayBlocked(err)) showTap();
          else {
            v.classList.remove('on');
            box.classList.add('off');
          }
        });
      }
      return p;
    }
    function startFromGesture() {
      var v = vids[i] || vids[0];
      if (!v) return;
      v.classList.remove('on');
      box.classList.remove('off');
      play(v);
    }
    function goNext() {
      if (fading || box.classList.contains('off')) return;
      fading = true;
      var cur = vids[i];
      var n = (i + 1) % vids.length;
      var next = vids[n];
      try { next.currentTime = 0; } catch (e) {}
      next.classList.remove('on');
      i = n;
      play(next);
      setTimeout(function () {
        cur.classList.remove('on');
        cur.pause();
        fading = false;
      }, fadeMs);
    }
    vids.forEach(function (v) {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.removeAttribute('poster');
      v.onplaying = function () { reveal(v); };
      v.onerror = function () {
        v.classList.remove('on');
        box.classList.add('off');
      };
      v.ontimeupdate = function () {
        if (v !== vids[i] || fading || !isFinite(v.duration)) return;
        if (v.currentTime >= v.duration - fadeMs / 1000) goNext();
      };
      v.onended = function () { if (v === vids[i]) goNext(); };
    });
    play(vids[0]);
    if (hero) {
      hero.addEventListener('click', function () {
        if (!hero.classList.contains('needs-gesture')) return;
        startFromGesture();
      });
    }
    if ('IntersectionObserver' in window && qs('.hero')) {
      var io = new IntersectionObserver(function (ents) {
        var vis = ents[0] && ents[0].isIntersecting;
        if (!vis) vids.forEach(function (v) { v.pause(); });
        else if (!box.classList.contains('off')) play(vids[i]);
      }, { threshold: 0.2 });
      io.observe(qs('.hero'));
    }
  }
  function renderApp() {
    clearHolidayBindings();
    view = 'app';
    document.title = titles() + ' · ENESMA Realty';
    $app.innerHTML = headerHtml() + pageFor(path()) + footerHtml() + searchOverlay();
    bindChrome();
    bindHeroVideos();
    bindHolidayTiles();
    var stage = qs('[data-calc]');
    if (stage && window.HubCalcs) {
      var mount = HubCalcs[stage.getAttribute('data-calc')];
      var host = qs('#calc-host');
      if (mount && host) mount(host);
    }
    window.scrollTo(0, 0);
  }
  function afterAuth() {
    if (!location.hash || location.hash === '#/login') location.hash = '#/';
    renderApp();
  }

  function onRoute() {
    if (!S.token) {
      if (view !== 'login' && view !== 'otp' && view !== 'forgot') renderLogin();
      return;
    }
    renderApp();
  }

  window.addEventListener('hashchange', function () { searchOpen = false; onRoute(); });

  function boot() {
    Auth.bootSession();
    if (!S.token) { renderLogin(); return; }
    Auth.api('me').then(function (d) {
      S.user = (d && d.user) || d;
      renderApp();
    }).catch(function (err) {
      renderLogin(err.code === 'AUTH' ? '' : err.message);
    });
  }
  boot();
})();
