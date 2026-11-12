/* typing.shareyourgroup.com: the typing test and the lesson practice tool. Everything runs in this browser; nothing typed is sent anywhere. */
(function () {
  'use strict';
  var d = document, box = d.querySelector('[data-tt]');
  if (!box) return;
  var MODE = box.getAttribute('data-tt');
  var $ = function (s) { return box.querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var langSel = $('#tt-lang'), timeSel = $('#tt-time'), lessonSel = $('#tt-lesson'), mapChk = $('#tt-map'), mapBox = $('[data-tt-mapbox]');
  var textEl = $('[data-tt-text]'), input = $('#tt-in'), clockEl = $('[data-tt-clock]'), wpmEl = $('[data-tt-wpm]'), accEl = $('[data-tt-acc]');
  var kbEl = $('[data-tt-kb]'), resEl = $('[data-tt-result]'), histEl = $('[data-tt-hist]');
  var DATA = null, S = null, timer = null, HKEY = 'ty-hist';
  var HL = { en: 'en', hi: 'hi', pa: 'pa' }, NAME = { en: 'English', hi: 'Hindi', pa: 'Punjabi' };
  var len = function (s) { return Array.from(s).length; };

  function hist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
  function fmt(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }

  function pickText() {
    var lang = langSel.value;
    if (MODE === 'practice') {
      var L = DATA.drills[lessonSel.value];
      return L ? L.lines.join(' ') : '';
    }
    var list = DATA.passages[lang], i = (S && S.lang === lang ? (S.pi + 1) : Math.floor(Math.random() * list.length)) % list.length;
    return { text: list[i], pi: i };
  }

  function start(keepText) {
    clearInterval(timer); timer = null;
    var lang = langSel.value, t, pi = 0;
    if (MODE === 'practice') { t = pickText(); } else if (keepText && S) { t = S.text; pi = S.pi; } else { var p = pickText(); t = p.text; pi = p.pi; }
    t = t.normalize('NFC');
    S = { lang: lang, text: t, pi: pi, words: t.split(/\s+/).filter(Boolean), i: 0, ok: 0, all: 0, right: 0, wrong: [], t0: 0, limit: MODE === 'test' ? +timeSel.value : 0, done: false };
    textEl.lang = HL[lang]; input.lang = HL[lang];
    textEl.innerHTML = S.words.map(function (w, i) { return '<span class="w" data-i="' + i + '">' + esc(w) + '</span>'; }).join(' ');
    input.value = ''; input.disabled = false; resEl.hidden = true;
    clockEl.textContent = MODE === 'test' ? fmt(S.limit) : '0:00'; wpmEl.textContent = '0'; accEl.textContent = '100%';
    mapBox.hidden = lang === 'en';
    mark(); keyboard(); hint();
  }

  function mark() {
    var cur = textEl.querySelector('.w.cur'); if (cur) cur.classList.remove('cur', 'err');
    var el = textEl.querySelector('[data-i="' + S.i + '"]');
    if (el) { el.classList.add('cur'); textEl.scrollTop = Math.max(0, el.offsetTop - textEl.clientHeight / 2 + el.offsetHeight); }
  }

  function tick() {
    var el = (Date.now() - S.t0) / 1000;
    if (MODE === 'test') { clockEl.textContent = fmt(S.limit - el); if (el >= S.limit) return finish(); } else clockEl.textContent = fmt(el);
    var min = Math.max(el, 1) / 60;
    wpmEl.textContent = Math.round(S.ok / 5 / min);
    accEl.textContent = (S.all ? Math.round(100 * S.ok / S.all) : 100) + '%';
  }

  function submit(typed) {
    var target = S.words[S.i], el = textEl.querySelector('[data-i="' + S.i + '"]');
    typed = typed.normalize('NFC');
    S.all += len(typed) + 1;
    if (typed === target) { S.ok += len(target) + 1; S.right++; el.classList.add('ok'); } else { S.wrong.push([target, typed]); el.classList.add('bad'); }
    S.i++;
    if (S.i >= S.words.length) {
      if (MODE === 'practice') return finish();
      var list = DATA.passages[S.lang]; S.pi = (S.pi + 1) % list.length;          // the test never runs out of text
      var more = list[S.pi].split(/\s+/).filter(Boolean), base = S.words.length;
      S.words = S.words.concat(more);
      textEl.insertAdjacentHTML('beforeend', ' ' + more.map(function (w, k) { return '<span class="w" data-i="' + (base + k) + '">' + esc(w) + '</span>'; }).join(' '));
    }
    mark();
  }

  function onInput() {
    if (!S || S.done) return;
    if (!S.t0 && input.value) { S.t0 = Date.now(); timer = setInterval(tick, 250); }
    var v = input.value;
    while (/\s/.test(v) && !S.done) {
      var m = /^(\S*)\s+/.exec(v);
      if (!m) break;
      if (m[1]) submit(m[1]);
      v = v.slice(m[0].length);
    }
    if (S.done) return;
    input.value = v;
    var el = textEl.querySelector('.w.cur');
    if (el) el.classList.toggle('err', !!v && S.words[S.i].indexOf(v.normalize('NFC')) !== 0);
    hint();
  }

  function finish() {
    if (S.done) return;
    S.done = true; clearInterval(timer); input.disabled = true;
    var sec = Math.max(1, MODE === 'test' ? S.limit : (Date.now() - S.t0) / 1000), min = sec / 60;
    var gross = Math.round(S.all / 5 / min), net = Math.round(S.ok / 5 / min), acc = S.all ? Math.round(100 * S.ok / S.all) : 0;
    clockEl.textContent = MODE === 'test' ? '0:00' : fmt(sec); wpmEl.textContent = net; accEl.textContent = acc + '%';
    var h = hist(); h.unshift({ d: new Date().toISOString().slice(0, 10), l: S.lang, m: MODE, n: net, g: gross, a: acc, s: Math.round(sec) });
    try { localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 30))); } catch (e) {}
    var wrong = S.wrong.slice(0, 12).map(function (p) { return '<li><b lang="' + HL[S.lang] + '">' + esc(p[0]) + '</b> <span class="hint">you typed</span> <span lang="' + HL[S.lang] + '">' + esc(p[1]) + '</span></li>'; }).join('');
    var msg = 'I typed ' + net + ' words a minute in ' + NAME[S.lang] + ' with ' + acc + '% accuracy (' + fmt(sec) + ' test) on typing.shareyourgroup.com';
    resEl.innerHTML = '<h2>' + (MODE === 'test' ? 'Your result' : 'Lesson finished') + '</h2><p class="big">' + net + ' <small>words a minute (net)</small></p>' +
      '<dl class="facts"><dt>Gross speed</dt><dd>' + gross + ' words a minute</dd><dt>Accuracy</dt><dd>' + acc + '%</dd><dt>Words right</dt><dd>' + S.right + '</dd><dt>Words wrong</dt><dd>' + S.wrong.length + '</dd>' +
      '<dt>Key depressions an hour</dt><dd>about ' + (Math.round(S.all / min * 60 / 100) * 100).toLocaleString('en-IN') + ' (gross)</dd><dt>Time</dt><dd>' + fmt(sec) + '</dd></dl>' +
      (wrong ? '<h3>Words to practise</h3><ul class="tt-wrong">' + wrong + '</ul>' : '<p>No wrong words. Well typed.</p>') +
      '<p class="hint">Net speed counts only the words you typed correctly. <a href="/guide/how-typing-speed-is-measured/">How these figures are worked out</a>.</p>' +
      '<div class="acts"><button class="btn" type="button" data-tt-restart>Try again</button><button class="btn ghost" type="button" data-wa="' + esc(msg) + '">Share on WhatsApp</button></div>';
    resEl.hidden = false; resEl.scrollIntoView({ block: 'nearest' });
    history();
  }

  function history() {
    var h = hist().filter(function (x) { return x.m === 'test'; });
    if (!h.length) { histEl.innerHTML = ''; return; }
    var best = {};
    h.forEach(function (x) { if (!best[x.l] || x.n > best[x.l]) best[x.l] = x.n; });
    histEl.innerHTML = '<h2 class="tt-h">Your tests on this device</h2><p>' + Object.keys(best).map(function (l) { return 'Best in ' + NAME[l] + ': <b>' + best[l] + '</b> words a minute'; }).join(' · ') + '</p>' +
      '<div class="tbl"><table><thead><tr><th>Date</th><th>Language</th><th>Net</th><th>Accuracy</th><th>Time</th></tr></thead><tbody>' +
      h.slice(0, 10).map(function (x) { return '<tr><td>' + x.d + '</td><td>' + NAME[x.l] + '</td><td>' + x.n + '</td><td>' + x.a + '%</td><td>' + fmt(x.s) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p><button class="btn sm ghost" type="button" data-tt-clear>Clear my results</button></p>';
  }

  /* the on-screen keyboard and the "next key" hint */
  function keyboard() {
    var rows = DATA.layouts[S.lang], en = DATA.layouts.en;
    kbEl.lang = HL[S.lang];
    kbEl.innerHTML = '<div class="kb">' + rows.map(function (row, ri) {
      return '<div class="kr kr' + ri + '">' + row.map(function (k, ki) {
        var base = k[1], shift = k[2], lab = S.lang === 'en' ? '' : '<small>' + esc(en[ri][ki][1].toUpperCase()) + '</small>';
        return '<span class="k ' + DATA.fingers[ri][ki] + '" data-code="' + k[0] + '"><i>' + (shift && shift.toLowerCase() !== base ? esc(shift) : '') + '</i><b>' + esc(S.lang === 'en' ? base.toUpperCase() : base) + '</b>' + lab + '</span>';
      }).join('') + '</div>';
    }).join('') + '<div class="kr kr4"><span class="k sp" data-code="Space">space</span></div></div>';
  }
  function hint() {
    var on = kbEl.querySelectorAll('.k.next,.k.sh'); for (var i = 0; i < on.length; i++) on[i].classList.remove('next', 'sh');
    if (!S || S.done) return;
    var target = S.words[S.i] || '', v = input.value.normalize('NFC');
    if (v && target.indexOf(v) !== 0) return;                    // a mistake: no hint until it is corrected
    var rest = target.slice(v.length), code = null, shifted = false;
    if (!rest) code = 'Space';
    else {
      var rows = DATA.layouts[S.lang], bestLen = 0;
      rows.forEach(function (row) { row.forEach(function (k) {
        [1, 2].forEach(function (col) { var out = (k[col] || '').normalize('NFC'); if (out && rest.indexOf(out) === 0 && out.length > bestLen) { bestLen = out.length; code = k[0]; shifted = col === 2; } });
      }); });
    }
    var el = code && kbEl.querySelector('[data-code="' + code + '"]');
    if (el) { el.classList.add('next'); if (shifted) el.classList.add('sh'); }
  }

  /* typing Hindi or Punjabi with English keys: the page converts each key by the InScript layout */
  var MAP = null;
  function buildMap() { MAP = {}; Object.keys(DATA.layouts).forEach(function (l) { MAP[l] = {}; DATA.layouts[l].forEach(function (row) { row.forEach(function (k) { MAP[l][k[0]] = k; }); }); }); }
  input.addEventListener('keydown', function (e) {
    if (!S || S.lang === 'en' || !mapChk.checked || e.ctrlKey && !e.altKey || e.metaKey) return;
    var k = MAP[S.lang][e.code];
    if (!k) return;
    var alt = e.getModifierState && e.getModifierState('AltGraph');
    var ch = alt ? (e.shiftKey ? k[4] : k[3]) : (e.shiftKey ? k[2] : k[1]);
    e.preventDefault();
    if (!ch) return;
    input.value += ch; onInput();
  });
  input.addEventListener('input', onInput);
  input.addEventListener('paste', function (e) { e.preventDefault(); });

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.hasAttribute('data-tt-restart')) { start(true); input.focus(); }
    else if (b.hasAttribute('data-tt-next')) { if (MODE === 'practice') { var o = lessonSel.options; lessonSel.selectedIndex = (lessonSel.selectedIndex + 1) % o.length; langSel.value = DATA.drills[lessonSel.value].lang; } start(false); input.focus(); }
    else if (b.hasAttribute('data-tt-clear')) { try { localStorage.removeItem(HKEY); } catch (e2) {} history(); }
  });
  textEl.addEventListener('click', function () { input.focus(); });
  langSel.addEventListener('change', function () { if (MODE === 'practice') fillLessons(true); S = null; start(false); });
  timeSel.addEventListener('change', function () { start(true); });
  lessonSel.addEventListener('change', function () { start(false); });

  function fillLessons(first) {
    var lang = langSel.value, keys = Object.keys(DATA.drills).filter(function (k) { return DATA.drills[k].lang === lang; });
    lessonSel.innerHTML = keys.map(function (k) { return '<option value="' + k + '">' + esc(DATA.drills[k].title) + '</option>'; }).join('');
    if (first) lessonSel.selectedIndex = 0;
  }

  fetch('/data/typing.json').then(function (r) { return r.json(); }).then(function (j) {
    DATA = j; buildMap();
    if (MODE === 'practice') {
      $('[data-tt-timebox]').hidden = true; $('[data-tt-lessonbox]').hidden = false;
      var m = /^#l=([\w-]+)/.exec(location.hash), want = m && DATA.drills[m[1]] ? m[1] : null;
      if (want) langSel.value = DATA.drills[want].lang;
      fillLessons(true);
      if (want) lessonSel.value = want;
      box.querySelector('[data-tt-next]').textContent = 'Next lesson';
    } else {
      var q = /^#lang=(en|hi|pa)/.exec(location.hash); if (q) langSel.value = q[1];
    }
    start(false); history();
  }).catch(function () { textEl.textContent = 'The practice text could not load. Check your connection and reload the page.'; });
})();
