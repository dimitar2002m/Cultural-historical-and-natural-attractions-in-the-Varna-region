/* Общ код за сайта: меню, категории (в синхрон с картата), списъци */
(function () {
  var C = {
    museum:{label:'Музеи',icon:'fa-landmark',color:'#6B3FA0'},
    fortress:{label:'Крепости',icon:'fa-chess-rook',color:'#4A5568'},
    church:{label:'Църкви и катедрали',icon:'fa-church',color:'#2B6CB0'},
    monastery:{label:'Манастири и параклиси',icon:'fa-place-of-worship',color:'#2C5282'},
    megalith:{label:'Скални обекти',icon:'fa-mountain',color:'#744210'},
    attraction:{label:'Атракции',icon:'fa-fish',color:'#C05621'},
    cultural:{label:'Други културни',icon:'fa-building-columns',color:'#8B4513'},
    waterfall:{label:'Водопади',icon:'fa-water',color:'#2B6CB0'},
    park:{label:'Паркове и гори',icon:'fa-tree',color:'#38A169'},
    beach:{label:'Плажове',icon:'fa-umbrella-beach',color:'#D69E2E'},
    cave:{label:'Пещери',icon:'fa-dungeon',color:'#553C9A'},
    viewpoint:{label:'Панорамни места',icon:'fa-binoculars',color:'#DD6B20'},
    trail:{label:'Екопътеки',icon:'fa-person-hiking',color:'#319795'},
    nature:{label:'Други природни',icon:'fa-leaf',color:'#276749'}
  };
  function has(t, a) { return a.some(function (s) { return t.indexOf(s) >= 0; }); }
  function category(p, kind) {
    var t = (p['Тип'] || '').toLowerCase();
    if (kind === 'c') {
      if (has(t, ['музей'])) return C.museum;
      if (has(t, ['крепост'])) return C.fortress;
      if (has(t, ['катедрал', 'църква'])) return C.church;
      if (has(t, ['манастир', 'параклис'])) return C.monastery;
      if (has(t, ['мегалит', 'скален'])) return C.megalith;
      if (has(t, ['атракция', 'делфин'])) return C.attraction;
      return C.cultural;
    }
    if (has(t, ['водопад'])) return C.waterfall;
    if (has(t, ['парк', 'градина', 'гора', 'кория'])) return C.park;
    if (has(t, ['плаж'])) return C.beach;
    if (has(t, ['пещера'])) return C.cave;
    if (has(t, ['панорам', 'площадка'])) return C.viewpoint;
    if (has(t, ['екопътека', 'пътека'])) return C.trail;
    return C.nature;
  }
  function allObjects() {
    var out = [];
    (window.json__1 ? json__1.features : []).forEach(function (f) {
      out.push({ key: 'c-' + f.properties.id, kind: 'c', p: f.properties, cat: category(f.properties, 'c') });
    });
    (window.json__2 ? json__2.features : []).forEach(function (f) {
      out.push({ key: 'n-' + f.properties.id, kind: 'n', p: f.properties, cat: category(f.properties, 'n') });
    });
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function objCard(o, short) {
    var d = o.p['Описание'] || '';
    if (short && d.length > 110) d = d.slice(0, 107) + '…';
    return '<article class="card">' +
      '<div class="obj-head"><div class="dot" style="background:' + o.cat.color + '">' + o.cat.emoji + '</div>' +
      '<div><h3>' + esc(o.p['Име']) + '</h3><div class="meta">' + esc(o.p['Община'] || '') + '</div></div></div>' +
      '<div><span class="chip ' + (o.kind === 'n' ? 'nature' : '') + '">' + esc(o.p['Тип']) + '</span></div>' +
      '<p>' + esc(d) + '</p><div class="spacer"></div>' +
      '<a class="btn btn-dark btn-sm" href="karta.html?o=' + o.key + '"><i class="fa-solid fa-location-dot"></i> Покажи на картата</a></article>';
  }
  window.Varna = { categories: C, category: category, allObjects: allObjects, esc: esc, objCard: objCard };

  document.addEventListener('DOMContentLoaded', function () {
    var t = document.querySelector('.nav-toggle'), n = document.querySelector('.nav');
    if (t && n) t.addEventListener('click', function () {
      var o = n.classList.toggle('open'); t.setAttribute('aria-expanded', o);
    });

    /* Начална страница */
    var s1 = document.getElementById('stat-objects');
    if (s1) {
      var objs = allObjects();
      s1.textContent = objs.length;
      document.getElementById('stat-culture').textContent = objs.filter(function (o) { return o.kind === 'c'; }).length;
      document.getElementById('stat-nature').textContent = objs.filter(function (o) { return o.kind === 'n'; }).length;
      document.getElementById('stat-trails').textContent = window.json__3 ? json__3.features.length : 0;
      var fe = document.getElementById('featured');
      ['c-8', 'n-8', 'n-4'].forEach(function (k) {
        var o = objs.filter(function (x) { return x.key === k; })[0];
        if (o) fe.insertAdjacentHTML('beforeend', objCard(o, true));
      });
    }

    /* Страница „Обекти“ */
    var list = document.getElementById('obj-list');
    if (list) {
      var objs2 = allObjects(), kind = 'all';
      var q = document.getElementById('q'), sc = document.getElementById('f-cat'), sm = document.getElementById('f-mun');
      var cats = {}, muns = {};
      objs2.forEach(function (o) { cats[o.cat.label] = 1; (o.p['Община'] || '').split('/').forEach(function (m) { m = m.trim(); if (m) muns[m] = 1; }); });
      Object.keys(cats).sort().forEach(function (c) { sc.insertAdjacentHTML('beforeend', '<option>' + esc(c) + '</option>'); });
      Object.keys(muns).sort().forEach(function (m) { sm.insertAdjacentHTML('beforeend', '<option>' + esc(m) + '</option>'); });
      function render() {
        var term = q.value.trim().toLowerCase();
        var r = objs2.filter(function (o) {
          if (kind !== 'all' && o.kind !== kind) return false;
          if (sc.value && o.cat.label !== sc.value) return false;
          if (sm.value && (o.p['Община'] || '').indexOf(sm.value) < 0) return false;
          if (term && (o.p['Име'] + ' ' + o.p['Описание'] + ' ' + o.p['Тип']).toLowerCase().indexOf(term) < 0) return false;
          return true;
        });
        document.getElementById('count').textContent = 'Намерени обекти: ' + r.length;
        list.innerHTML = r.length ? r.map(function (o) { return objCard(o); }).join('') : '<div class="empty">Няма обекти по тези критерии.</div>';
      }
      [q, sc, sm].forEach(function (e) { e.addEventListener('input', render); });
      document.querySelectorAll('.tab').forEach(function (b) {
        b.addEventListener('click', function () {
          document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on'); kind = b.getAttribute('data-kind'); render();
        });
      });
      render();
    }

    /* Страница „Маршрути“ */
    var tl = document.getElementById('trail-list');
    if (tl && window.json__3 && json__3.features.length) {
      tl.innerHTML = json__3.features.map(function (f, i) {
        var p = f.properties || {};
        var color = p['Цвят'] || '#319795';
        var meta = [];
        if (p['Маркировка']) meta.push(p['Маркировка']);
        if (p['Дължина_км']) meta.push(p['Дължина_км'] + ' км');
        return '<article class="card"><div class="obj-head"><div class="dot" style="background:' + color + '"><i class="fa-solid fa-person-hiking"></i></div><div><h3>' + esc(p['Име']) +
          '</h3><div class="meta">' + meta.join(' · ') + '</div></div></div>' +
          '<div><span class="chip trail">Туристически маршрут</span></div><div class="spacer"></div>' +
          '<a class="btn btn-dark btn-sm" href="karta.html?t=' + i + '"><i class="fa-solid fa-location-dot"></i> Покажи на картата</a></article>';
      }).join('');
      var ph = document.getElementById('trail-empty'); if (ph) ph.style.display = 'none';
    }
  });
})();
