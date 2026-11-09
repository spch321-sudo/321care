/* CPAR321（2026-11-09）：經文卡片中英逐句並讀
   繁／简頁並讀英文、英文頁並讀繁體中文。作用在「卡片」場景的十張卡片：經文、出處、安慰造就勸勉的話。
   作法：同一場景同一張卡片的另一語言版本（SCENES ↔ EN_SCENES，張數與順序一致），
   朗讀／畫線模組（xk321）先把句子包好，勸勉的話逐行（每行一句）配對，行數不同時依句長比例逐句對齊；並讀句插在主要句子下面（.cps）。
   只改畫面，複製文字、做成圖卡、錄音做卡仍只用主要語言。設定存 localStorage cpar321（所有 321 App 共用）。 */
(function () {
  if (window.CPAR321 || typeof window.vCardList !== 'function' || typeof EN_SCENES === 'undefined') return;
  function EN() { return LG() === 'en'; }
  function ui() { return EN() ? 'en' : (LG() === 'zh-Hans' ? 'sc' : 'tc'); }
  var STR = {
    tc: { btn: '中英並讀', on: '開', off: '關' },
    sc: { btn: '中英并读', on: '开', off: '关' },
    en: { btn: 'Chinese parallel', on: 'On', off: 'Off' }
  };
  function T2(k) { return STR[ui()][k]; }
  function isOn() { try { return localStorage.getItem('cpar321') === '1'; } catch (e) { return false; } }
  function setOn(v) { try { localStorage.setItem('cpar321', v ? '1' : ''); } catch (e) { } }

  function splitSents(t, zh) {
    t = t.replace(/\s+/g, ' ').trim(); if (!t) return [];
    var re = zh ? /[^。！？；!?]+(?:[。！？；!?]+[」』”’）)】〕]*)?/g : /[^.!?;]+(?:[.!?;]+["”’)\]]*)?(?=\s|$)|[^.!?;]+$/g;
    var out = (t.match(re) || [t]).map(function (x) { return x.trim(); }).filter(Boolean), merged = [];
    out.forEach(function (x) {
      if (merged.length && (x.replace(/[\s\p{P}]/gu, '').length < (zh ? 3 : 6))) merged[merged.length - 1] += (zh ? '' : ' ') + x;
      else merged.push(x);
    });
    return merged;
  }
  function plen(t, zh) { return Math.max(1, zh ? t.replace(/[\s\p{P}]/gu, '').length : t.replace(/\s+/g, ' ').length); }
  function align(ma, al, zh) {
    var M = ma.map(function (t) { return plen(t, zh); }), A2 = al.map(function (t) { return plen(t, !zh); });
    var sm = M.reduce(function (a, b) { return a + b; }, 0), sa = A2.reduce(function (a, b) { return a + b; }, 0), r = sa / sm;
    var m = M.length, n = A2.length, INF = 1e9, Cc = [], Bk = [], i, j;
    for (i = 0; i <= m; i++) { Cc.push(new Float64Array(n + 1).fill(INF)); Bk.push(new Array(n + 1)); }
    Cc[0][0] = 0;
    var moves = [[1, 1, 0], [1, 2, .6], [2, 1, .6], [1, 3, 1.4], [3, 1, 1.4], [2, 2, 1], [1, 0, 3], [0, 1, 3]];
    for (i = 0; i <= m; i++) for (j = 0; j <= n; j++) {
      if (Cc[i][j] >= INF) continue;
      moves.forEach(function (mv) {
        var a = i + mv[0], b = j + mv[1]; if (a > m || b > n) return;
        var x = 0, y = 0, k; for (k = i; k < a; k++) x += M[k]; for (k = j; k < b; k++) y += A2[k];
        var c = Cc[i][j] + mv[2] + Math.abs(y - r * x) / Math.sqrt(r * x + y + 1);
        if (c < Cc[a][b]) { Cc[a][b] = c; Bk[a][b] = [i, j]; }
      });
    }
    var groups = []; i = m; j = n;
    while (i > 0 || j > 0) { var p = Bk[i][j]; if (!p) break; groups.unshift([p[0], i, p[1], j]); i = p[0]; j = p[1]; }
    return groups;
  }
  function mkSpan(t) { var d = document.createElement('span'); d.className = 'cps'; d.setAttribute('lang', EN() ? 'zh-Hant' : 'en'); d.textContent = t; return d; }
  /* 主要文字（行陣列）與譯文（行陣列）→ 每一單位後面接上的譯文 */
  function pairUnits(mainUnits, altText) {
    var zh = !EN(), alts = splitSents(altText, !zh), J = zh ? ' ' : '';
    if (!mainUnits.length || !alts.length) return [];
    var out = mainUnits.map(function () { return ''; });
    var groups = mainUnits.length === 1 ? [[0, 1, 0, alts.length]] : align(mainUnits, alts, zh);
    groups.forEach(function (g) {
      var t = alts.slice(g[2], g[3]).join(J); if (!t) return;
      var at = g[1] > g[0] ? g[1] - 1 : Math.max(0, g[0] - 1);
      out[at] = out[at] ? out[at] + J + t : t;
    });
    return out;
  }
  function withLang(lg, fn) { var o = S.set.lang; S.set.lang = lg; try { return fn(); } finally { S.set.lang = o; } }

  function paint() {
    var view = document.getElementById('view'); if (!view) return;
    var wrap = view.querySelector('.wrap'); if (!wrap) return;
    var cards = wrap.querySelectorAll('.vcard');
    var mine = EN() ? EN_SCENES : SCENES, alt = EN() ? SCENES : EN_SCENES, altLG = EN() ? 'zh-Hant' : 'en';
    var sc = mine.find(function (s) { return s.id === curScene; }) || mine[0];
    var asc = alt.find(function (s) { return s.id === sc.id; });
    if (!asc) return;
    var p = S.people.find(function (x) { return x.id === curPid; });
    try { if (window.XK && XK.scan) XK.scan(); } catch (e) { }
    [].forEach.call(cards, function (el, i) {
      var a = asc.cards[i]; if (!a) return;
      var ov = (typeof override !== 'undefined') && override[sc.id + '#' + i];
      var vt = el.querySelector('.vt'), vr = el.querySelector('.vr'), vb = el.querySelector('.vb');
      if (vt && !(ov && ov.v)) vt.parentNode.insertBefore(mkSpan(a.v), vt.nextSibling);
      if (vr && !(ov && ov.r)) vr.appendChild(mkSpan(a.r));
      if (!vb || (ov && ov.w)) return;
      var aw = withLang(altLG, function () { return merge(a.w, p, a); });
      var altL = aw.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      /* 朗讀畫線模組（xk321）已把每一句包成 .xks：依換行把句子分成「行」，譯文插在每行最後一句後面，不切開句子 */
      var units = [].slice.call(vb.querySelectorAll('.xks')), lines = [], cur = [];
      if (units.length) {
        units.forEach(function (u) { cur.push(u); if (/\n\s*$/.test(u.textContent)) { lines.push(cur); cur = []; } });
        if (cur.length) lines.push(cur);
      } else {
        var tn = document.createTextNode(vb.textContent); vb.textContent = ''; vb.appendChild(tn);
        lines = [[tn]];
      }
      var keep = lines.map(function (l) { return l.map(function (u) { return u.textContent; }).join('').trim(); });
      var adds = keep.length === altL.length ? altL : pairUnits(keep, altL.join(EN() ? '' : ' '));
      for (var k = lines.length - 1; k >= 0; k--) {
        if (!adds[k]) continue;
        var last = lines[k][lines[k].length - 1];
        last.parentNode.insertBefore(mkSpan(adds[k]), last.nextSibling);
      }
    });
  }
  function css() {
    if (document.getElementById('cparCss')) return;
    var st = document.createElement('style'); st.id = 'cparCss';
    st.textContent = '.cps{display:block;margin:2px 0 8px;padding:1px 0 1px 9px;border-left:3px solid color-mix(in srgb,var(--gold,#a88b62) 55%,transparent);font-size:.86em;line-height:1.6;color:color-mix(in srgb,currentColor 62%,transparent);font-weight:400;font-style:normal;white-space:normal;text-align:left;letter-spacing:0}'
      + '.vr .cps{display:inline;border:0;margin:0 0 0 6px;padding:0;font-size:.95em}.vr .cps::before{content:"· "}'
      + '.cparbar{display:flex;justify-content:flex-end;margin:4px 0 8px}'
      + '.cparbtn{border:1px solid var(--line,#ddd);background:var(--card,#fff);color:inherit;border-radius:999px;padding:6px 14px;font:inherit;font-size:13.5px;font-weight:600;cursor:pointer}'
      + '.cparbtn.on{border-color:var(--gold,#a88b62);color:var(--gold,#a88b62)}';
    document.head.appendChild(st);
  }
  function addBar() {
    var wrap = document.querySelector('#view .wrap'); if (!wrap || wrap.querySelector('.cparbar')) return;
    var on = isOn(), bar = document.createElement('div'); bar.className = 'cparbar';
    bar.innerHTML = '<button type="button" class="cparbtn' + (on ? ' on' : '') + '" onclick="CPAR321.toggle()">🌐 ' + T2('btn') + (EN() ? ': ' : '：') + (on ? T2('on') : T2('off')) + '</button>';
    var t = wrap.querySelector('.sec-t'); if (t) wrap.insertBefore(bar, t.nextSibling); else wrap.insertBefore(bar, wrap.firstChild);
  }
  var orig = window.vCardList;
  window.vCardList = function () {
    var r = orig.apply(this, arguments);
    try { css(); addBar(); if (isOn()) paint(); } catch (e) { }
    return r;
  };
  window.CPAR321 = {
    toggle: function () { var y = window.scrollY; setOn(!isOn()); window.vCardList(); window.scrollTo(0, y); },
    _paint: paint
  };
})();
