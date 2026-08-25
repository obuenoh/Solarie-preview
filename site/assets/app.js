/* Solarie — storefront behavior.
   Carrinho, favoritos e vistos recentemente ficam em localStorage (por navegador).
   Filtering and sorting run client-side, with state kept in the URL. */
(function () {
  'use strict';

  var ROOT = document.documentElement.getAttribute('data-root') || '';
  var FREE_SHIPPING = 75;
  var money = function (n) { return '$' + n.toFixed(2); };

  /* ---------- fault-tolerant storage ---------- */
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* modo privado */ }
  }

  /* ---------- toast ---------- */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add('on'); });
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 2200);
  }

  /* ================= CART ================= */
  var cart = read('solarie_cart', []);

  function cartCount() {
    return cart.reduce(function (n, i) { return n + i.qty; }, 0);
  }
  function cartTotal() {
    return cart.reduce(function (n, i) { return n + i.price * i.qty; }, 0);
  }
  function saveCart() {
    write('solarie_cart', cart);
    paintCount();
    paintCart();
  }
  function paintCount() {
    var n = cartCount();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.style.display = n ? '' : 'none';
    });
  }
  function addToCart(item) {
    var key = item.handle + '|' + (item.variant || '');
    var found = cart.filter(function (i) { return i.handle + '|' + (i.variant || '') === key; })[0];
    if (found) found.qty += item.qty || 1;
    else cart.push({ handle: item.handle, title: item.title, price: item.price,
                     img: item.img, variant: item.variant || '', qty: item.qty || 1 });
    saveCart();
    openCart();
    toast('Added to your bag');
  }

  function paintCart() {
    var box = document.getElementById('cart-items');
    if (!box) return;
    if (!cart.length) {
      box.innerHTML = '<div class="cart-empty"><p>Your bag is empty.</p>' +
        '<p style="margin-top:14px"><a class="link-u" href="' + ROOT + 'collections/all.html">Continue shopping</a></p></div>';
    } else {
      box.innerHTML = cart.map(function (i, idx) {
        return '<div class="ci">' +
          '<a href="' + ROOT + 'products/' + i.handle + '.html"><img src="' + ROOT + 'assets/img/' + i.img + '" alt=""></a>' +
          '<div><a href="' + ROOT + 'products/' + i.handle + '.html"><div class="t">' + i.title + '</div></a>' +
          (i.variant ? '<div class="v">' + i.variant + '</div>' : '') +
          '<div class="row"><div class="qty">' +
          '<button data-dec="' + idx + '" aria-label="Decrease">−</button><span>' + i.qty + '</span>' +
          '<button data-inc="' + idx + '" aria-label="Increase">+</button></div>' +
          '<b>' + money(i.price * i.qty) + '</b></div>' +
          '<button class="rm" data-rm="' + idx + '">Remove</button></div></div>';
      }).join('');
    }
    var t = cartTotal();
    var sub = document.getElementById('cart-sub');
    if (sub) sub.textContent = money(t);
    var bar = document.getElementById('ship-bar');
    if (bar) {
      var left = FREE_SHIPPING - t;
      bar.querySelector('.msg').innerHTML = left > 0
        ? 'You are <b>' + money(left) + '</b> away from free shipping'
        : '✓ You have earned <b>free shipping</b>';
      bar.querySelector('.fill').style.width = Math.min(100, (t / FREE_SHIPPING) * 100) + '%';
    }
    var co = document.getElementById('checkout');
    if (co) co.disabled = !cart.length;
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-inc],[data-dec],[data-rm]');
    if (!el) return;
    if (el.hasAttribute('data-inc')) cart[+el.getAttribute('data-inc')].qty++;
    if (el.hasAttribute('data-dec')) {
      var i = +el.getAttribute('data-dec');
      cart[i].qty--;
      if (cart[i].qty < 1) cart.splice(i, 1);
    }
    if (el.hasAttribute('data-rm')) cart.splice(+el.getAttribute('data-rm'), 1);
    saveCart();
  });

  /* ---------- panels ---------- */
  function scrim(on) {
    var s = document.getElementById('scrim');
    if (s) s.classList.toggle('on', on);
    document.body.classList.toggle('lock', on);
  }
  function closeAll() {
    ['cart-drawer', 'mnav', 'search'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('on');
    });
    scrim(false);
  }
  function openCart() {
    closeAll();
    var d = document.getElementById('cart-drawer');
    if (d) { d.classList.add('on'); scrim(true); paintCart(); }
  }
  window.solarieOpenCart = openCart;

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-open-cart]')) { e.preventDefault(); openCart(); }
    if (e.target.closest('[data-open-menu]')) {
      closeAll(); document.getElementById('mnav').classList.add('on'); scrim(true);
    }
    if (e.target.closest('[data-open-search]')) {
      closeAll();
      var s = document.getElementById('search');
      s.classList.add('on'); scrim(true);
      setTimeout(function () { s.querySelector('input').focus(); }, 60);
    }
    if (e.target.closest('[data-close]') || e.target.id === 'scrim') closeAll();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAll(); });

  /* ---------- add to cart ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-add]');
    if (!b) return;
    e.preventDefault();
    addToCart({
      handle: b.dataset.add, title: b.dataset.title, price: parseFloat(b.dataset.price),
      img: b.dataset.img, variant: b.dataset.variant || '',
      qty: parseInt(b.dataset.qty || '1', 10)
    });
  });

  /* ---------- checkout (simulated) ---------- */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#checkout')) return;
    toast('Demo store — real checkout runs on Shopify');
  });

  /* ================= WISHLIST ================= */
  var wish = read('solarie_wish', []);
  function paintWish() {
    document.querySelectorAll('[data-wish]').forEach(function (b) {
      b.classList.toggle('on', wish.indexOf(b.dataset.wish) > -1);
      b.textContent = wish.indexOf(b.dataset.wish) > -1 ? '♥' : '♡';
    });
    document.querySelectorAll('[data-wish-count]').forEach(function (el) {
      el.textContent = wish.length; el.style.display = wish.length ? '' : 'none';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-wish]');
    if (!b) return;
    e.preventDefault();
    var h = b.dataset.wish, i = wish.indexOf(h);
    if (i > -1) { wish.splice(i, 1); toast('Removed from wishlist'); }
    else { wish.push(h); toast('Saved to wishlist'); }
    write('solarie_wish', wish);
    paintWish();
  });

  /* ================= SEARCH ================= */
  var sInput = document.querySelector('#search input');
  if (sInput && window.CATALOG) {
    sInput.addEventListener('input', function () {
      var q = sInput.value.trim().toLowerCase();
      var box = document.getElementById('sres');
      if (q.length < 2) { box.innerHTML = ''; return; }
      var hits = CATALOG.filter(function (p) {
        return (p.t + ' ' + p.cat + ' ' + p.mat + ' ' + p.st).toLowerCase().indexOf(q) > -1;
      }).slice(0, 8);
      box.innerHTML = hits.length ? hits.map(function (p) {
        return '<a href="' + ROOT + 'products/' + p.h + '.html">' +
          '<img src="' + ROOT + 'assets/img/' + p.h.slice(0, 48) + '-0.jpg" alt="">' +
          '<div><div class="t">' + p.t + '</div><div class="c">' + p.cat + ' · ' + p.mat + '</div></div>' +
          '<b>' + money(p.p) + '</b></a>';
      }).join('') : '<p style="padding:14px;color:var(--taupe)">Nothing found for “' + q + '”.</p>';
    });
  }

  /* ================= COLLECTION: FILTER AND SORT ================= */
  var listEl = document.getElementById('plist');
  if (listEl && window.CATALOG) {
    var PAGE = 24;
    var shown = PAGE;
    var scope = (listEl.dataset.scope || '').split('|').filter(Boolean);
    var params = new URLSearchParams(location.search);

    function base() {
      if (!scope.length) return CATALOG.slice();
      var kind = scope[0], val = scope[1];
      return CATALOG.filter(function (p) {
        if (kind === 'cat') return p.cat === val;
        if (kind === 'style') return p.style === val;
        if (kind === 'mat') return p.mat === val;
        if (kind === 'stone') return p.st === val;
        if (kind === 'new') return p.isnew;
        if (kind === 'best') return p.best;
        if (kind === 'sale') return p.cmp;
        if (kind === 'under') return p.p < parseFloat(val);
        return true;
      });
    }

    function active() {
      var f = {};
      ['mat', 'st', 'style', 'color'].forEach(function (k) {
        var v = params.getAll(k);
        if (v.length) f[k] = v;
      });
      return f;
    }

    function apply() {
      var f = active();
      var out = base().filter(function (p) {
        for (var k in f) if (f[k].indexOf(p[k]) === -1) return false;
        return true;
      });
      var sort = params.get('sort') || 'featured';
      out.sort(function (a, b) {
        if (sort === 'price-asc') return a.p - b.p;
        if (sort === 'price-desc') return b.p - a.p;
        if (sort === 'new') return b.c.localeCompare(a.c);
        if (sort === 'best') return b.rank - a.rank;
        return b.rank - a.rank;
      });
      return out;
    }

    function cardHTML(p) {
      var badge = p.stock <= 3 ? '<span class="badge low">Only ' + p.stock + ' left</span>'
        : p.isnew ? '<span class="badge new">New</span>'
        : p.best ? '<span class="badge best">Bestseller</span>'
        : p.cmp ? '<span class="badge sale">Sale</span>' : '';
      var img2 = p.n > 1 ? '<img class="alt" src="' + ROOT + 'assets/img/' + p.h.slice(0, 48) + '-1.jpg" alt="" loading="lazy">' : '';
      return '<article class="card">' +
        '<a class="shot" href="' + ROOT + 'products/' + p.h + '.html">' + badge +
        '<img class="main" src="' + ROOT + 'assets/img/' + p.h.slice(0, 48) + '-0.jpg" alt="' + p.t + '" loading="lazy">' + img2 + '</a>' +
        '<button class="wish" data-wish="' + p.h + '" aria-label="Save">♡</button>' +
        '<button class="qadd" data-add="' + p.h + '" data-title="' + p.t.replace(/"/g, '&quot;') + '" data-price="' + p.p + '" data-img="' + p.h.slice(0, 48) + '-0.jpg">Quick add</button>' +
        '<a href="' + ROOT + 'products/' + p.h + '.html"><h3>' + p.t + '</h3></a>' +
        '<div class="price">' + money(p.p) + (p.cmp ? '<s>' + money(p.cmp) + '</s>' : '') + '</div>' +
        '<div class="rate">★ ' + p.rt + ' (' + p.rv + ')</div>' +
        '</article>';
    }

    function paintChips(f) {
      var box = document.getElementById('chips');
      if (!box) return;
      var out = [];
      for (var k in f) f[k].forEach(function (v) {
        out.push('<span class="chip">' + v + '<button data-unfilter="' + k + '|' + v + '">×</button></span>');
      });
      box.innerHTML = out.length ? out.join('') +
        '<button class="chip" data-clear style="background:none;text-decoration:underline">Clear all</button>' : '';
    }

    function render() {
      var res = apply();
      listEl.innerHTML = res.slice(0, shown).map(cardHTML).join('') ||
        '<div class="empty" style="grid-column:1/-1"><p>No pieces match these filters.</p></div>';
      var c = document.getElementById('fcount');
      if (c) c.textContent = res.length + (res.length === 1 ? ' product' : ' products');
      var m = document.getElementById('more');
      if (m) m.style.display = res.length > shown ? '' : 'none';
      paintChips(active());
      paintWish();
      var q = location.search ? '?' + params.toString() : '';
      history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : ''));
    }

    // check the boxes according to the URL
    document.querySelectorAll('.fgroup input').forEach(function (cb) {
      if (params.getAll(cb.name).indexOf(cb.value) > -1) cb.checked = true;
      cb.addEventListener('change', function () {
        var cur = params.getAll(cb.name).filter(function (v) { return v !== cb.value; });
        if (cb.checked) cur.push(cb.value);
        params.delete(cb.name);
        cur.forEach(function (v) { params.append(cb.name, v); });
        shown = PAGE;
        render();
      });
    });

    var sortSel = document.getElementById('sort');
    if (sortSel) {
      sortSel.value = params.get('sort') || 'featured';
      sortSel.addEventListener('change', function () {
        params.set('sort', sortSel.value); shown = PAGE; render();
      });
    }
    var fToggle = document.getElementById('ftoggle');
    if (fToggle) fToggle.addEventListener('click', function () {
      var p = document.getElementById('fpanel');
      p.classList.toggle('on');
      fToggle.classList.toggle('on', p.classList.contains('on'));
    });
    var moreBtn = document.getElementById('more');
    if (moreBtn) moreBtn.addEventListener('click', function () { shown += PAGE; render(); });

    document.addEventListener('click', function (e) {
      var u = e.target.closest('[data-unfilter]');
      if (u) {
        var parts = u.dataset.unfilter.split('|'), k = parts[0], v = parts[1];
        var keep = params.getAll(k).filter(function (x) { return x !== v; });
        params.delete(k);
        keep.forEach(function (x) { params.append(k, x); });
        document.querySelectorAll('.fgroup input').forEach(function (cb) {
          if (cb.name === k && cb.value === v) cb.checked = false;
        });
        shown = PAGE; render();
      }
      if (e.target.closest('[data-clear]')) {
        ['mat', 'st', 'style', 'color'].forEach(function (k) { params.delete(k); });
        document.querySelectorAll('.fgroup input').forEach(function (cb) { cb.checked = false; });
        shown = PAGE; render();
      }
    });

    render();
  }

  /* ================= PDP ================= */
  var stage = document.getElementById('stage');
  if (stage) {
    var stageImg = stage.querySelector('img');
    document.querySelectorAll('.thumbs img').forEach(function (t) {
      t.addEventListener('click', function () {
        stageImg.src = t.src;
        document.querySelectorAll('.thumbs img').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
      });
    });
    stage.addEventListener('click', function () { stage.classList.toggle('zoom'); });
    stage.addEventListener('mousemove', function (e) {
      if (!stage.classList.contains('zoom')) return;
      var r = stage.getBoundingClientRect();
      stageImg.style.transformOrigin =
        ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
    });
    stage.addEventListener('mouseleave', function () { stage.classList.remove('zoom'); });

    document.querySelectorAll('.opts').forEach(function (grp) {
      grp.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        grp.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        syncVariant();
      });
    });
    function syncVariant() {
      var parts = [];
      document.querySelectorAll('.opts').forEach(function (grp) {
        var on = grp.querySelector('button.on');
        if (on) parts.push(on.textContent.trim());
      });
      var v = parts.join(' / ');
      document.querySelectorAll('[data-add]').forEach(function (b) { b.dataset.variant = v; });
    }
    syncVariant();

    // recently viewed
    var h = document.body.dataset.handle;
    if (h) {
      var rv = read('solarie_seen', []).filter(function (x) { return x !== h; });
      rv.unshift(h);
      write('solarie_seen', rv.slice(0, 12));
    }
  }

  /* ---------- recently viewed ---------- */
  var rvBox = document.getElementById('recent');
  if (rvBox && window.CATALOG) {
    var seen = read('solarie_seen', []).filter(function (x) { return x !== document.body.dataset.handle; });
    var items = seen.map(function (h) {
      return CATALOG.filter(function (p) { return p.h === h; })[0];
    }).filter(Boolean).slice(0, 5);
    if (items.length) {
      rvBox.closest('section').style.display = '';
      rvBox.innerHTML = items.map(function (p) {
        return '<article class="card"><a class="shot" href="' + ROOT + 'products/' + p.h + '.html">' +
          '<img src="' + ROOT + 'assets/img/' + p.h.slice(0, 48) + '-0.jpg" alt="' + p.t + '" loading="lazy"></a>' +
          '<a href="' + ROOT + 'products/' + p.h + '.html"><h3>' + p.t + '</h3></a>' +
          '<div class="price">' + money(p.p) + '</div></article>';
      }).join('');
    }
  }

  /* ---------- newsletter ---------- */
  document.addEventListener('submit', function (e) {
    if (!e.target.matches('.nform')) return;
    e.preventDefault();
    e.target.reset();
    toast('Thank you! Your 15% code is on its way by email.');
  });

  paintCount();
  paintCart();
  paintWish();
})();
