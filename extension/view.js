function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function header(extra) {
  return '<header class="top">' +
    '<div class="brand">' +
    '<img src="assets/logo-white.png" srcset="assets/logo-white.png 1x, assets/logo-white@2x.png 2x, assets/logo-white@3x.png 3x" width="136" height="40" alt="ENESMA Realty">' +
    '<span class="hub-label">AGENT HUB</span>' +
    '</div>' +
    (extra || '') +
    '</header>';
}

export function loadingHtml(label) {
  return header() + '<p class="boot"><span class="spin"></span>' + esc(label || 'Loading…') + '</p>';
}

export function messageHtml(title, msg) {
  return header() + '<div class="panel"><h1>' + esc(title) + '</h1>' +
    '<div class="err">' + esc(msg) + '</div>' +
    '<button class="btn wide" id="retry" type="button">Try again</button></div>';
}

export function loginHtml(msg) {
  return header() + '<div class="panel">' +
    '<h1 class="solo">Sign in</h1>' +
    (msg ? '<div class="err">' + esc(msg) + '</div>' : '') +
    '<form id="lf" autocomplete="on">' +
    '<div class="f"><label for="lu">Email</label><input id="lu" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></div>' +
    '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn wide" id="lb" type="submit">Sign in</button>' +
    '<p class="fine"><a href="#" id="lc">First time or forgot password?</a></p>' +
    '<p class="fine disclosure">Use the same email and password as Transaction Center. A code may be emailed when you sign in from a new device.</p>' +
    '</form></div>';
}

export function otpHtml(hint, msg, okMsg) {
  return header() + '<div class="panel">' +
    '<h1>Enter your sign-in code</h1>' +
    '<p class="sub">We emailed a 6-digit code to <b>' + esc(hint || 'your account email') + '</b>. It expires in about 10 minutes. Check spam if you don’t see it.</p>' +
    (msg ? '<div class="err">' + esc(msg) + '</div>' : '') +
    (okMsg ? '<div class="ok">' + esc(okMsg) + '</div>' : '') +
    '<form id="of">' +
    '<div class="f"><label for="oc">Code</label><input id="oc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
    '<label class="chk"><input id="ot" type="checkbox" checked> Trust this device for 30 days. We won’t ask for a code again on this browser until then.</label>' +
    '<button class="btn wide" id="ob" type="submit">Verify and sign in</button>' +
    '<p class="fine"><a href="#" id="or">Send a new code</a> · <a href="#" id="obk">Back to sign in</a></p>' +
    '</form></div>';
}

export function forgotHtml(state) {
  state = state || {};
  const two = state.step === 2;
  const need = state.need || [];
  const email = state.email || '';
  return header() + '<div class="panel">' +
    '<h1>' + (two ? 'Enter your code' : 'Set up or reset your password') + '</h1>' +
    '<p class="sub">' + (two
      ? 'We emailed a 6-digit code to <b>' + esc(email) + '</b>. It expires in 15 minutes. Check spam if you don’t see it.'
      : 'Enter the email address the office registered for you. We’ll email you a code.') + '</p>' +
    (state.msg ? '<div class="err">' + esc(state.msg) + '</div>' : '') +
    (state.okMsg ? '<div class="ok">' + esc(state.okMsg) + '</div>' : '') +
    '<form id="cf">' +
    (two
      ? '<input type="hidden" id="ce" value="' + esc(email) + '">' +
        '<div class="f"><label for="cc">Code</label><input id="cc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
        '<div class="f"><label for="c1">New password</label><input id="c1" type="password" autocomplete="new-password" minlength="10" required></div>' +
        '<div class="f"><label for="c2">Repeat new password</label><input id="c2" type="password" autocomplete="new-password" required></div>' +
        '<p class="note">At least 10 characters with letters and numbers.</p>' +
        (need.indexOf('firstName') >= 0 ? '<div class="f"><label for="cfn">First name</label><input id="cfn" type="text" autocomplete="given-name" maxlength="50" required></div>' : '') +
        (need.indexOf('lastName') >= 0 ? '<div class="f"><label for="cln">Last name</label><input id="cln" type="text" autocomplete="family-name" maxlength="50" required></div>' : '') +
        (need.indexOf('phone') >= 0 ? '<div class="f"><label for="cph">Phone</label><input id="cph" type="tel" autocomplete="tel" placeholder="000-000-0000" required></div>' : '')
      : '<div class="f"><label for="ce">Email</label><input id="ce" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" value="' + esc(email) + '" required></div>') +
    '<button class="btn wide" id="cb" type="submit">' + (two ? 'Save password and sign in' : 'Email me a code') + '</button>' +
    '<p class="fine">' + (two ? '<a href="#" id="cr">Send a new code</a> · ' : '') + '<a href="#" id="cbk">Back to sign in</a></p>' +
    '</form></div>';
}

export function appHtml(name, tiles) {
  const cards = (tiles || []).map(function (t) {
    const img = t.img ? '<img src="' + esc(t.img) + '" alt="">' : '';
    return '<button type="button" class="tile" data-url="' + esc(t.href) + '">' +
      img +
      '<span class="cap"><span class="dash"></span><span class="t">' + esc(t.title) + '</span>' +
      (t.sub ? '<span class="s">' + esc(t.sub) + '</span>' : '') +
      '</span></button>';
  }).join('');
  return header(
    '<span class="who"><span class="user-chip">' + esc(name || 'Agent') + '</span>' +
    '<button class="signout" id="signOut" type="button">Sign out</button></span>'
  ) + '<div class="scroll"><p class="kicker">Agent resources</p><div class="grid">' + cards + '</div></div>';
}
