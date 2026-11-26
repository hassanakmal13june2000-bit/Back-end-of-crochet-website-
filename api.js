/* ============================================================
   HOOK & HEARTH — frontend helpers
   Talks to our own backend at /api/* (see server.js)
   ============================================================ */

const API_BASE = 'back-end-of-crochet-website-production-dd428d61.up.railway.app';

/* ---------- Cart identity (per-browser, stored in localStorage) ---------- */
function getCartId() {
  var id = localStorage.getItem('hh_cart_id');
  if (!id) {
    id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'cart-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    localStorage.setItem('hh_cart_id', id);
  }
  return id;
}

/* ---------- Small helpers ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function truncate(str, len) {
  str = String(str);
  return str.length > len ? str.slice(0, len).trim() + '…' : str;
}
function titleCase(str) {
  return String(str).replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}
function formatPrice(n) { return '$' + Number(n).toFixed(2); }

function shade(hex, percent) {
  var num = parseInt(hex.slice(1), 16);
  var r = (num >> 16) + Math.round(2.55 * percent);
  var g = ((num >> 8) & 0xff) + Math.round(2.55 * percent);
  var b = (num & 0xff) + Math.round(2.55 * percent);
  r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
  return '#' + [r, g, b].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
}

/* ---------- Generated crochet swatch (replaces product photography) ---------- */
function swatchSVG(color, pattern) {
  var bg = shade(color, 34);
  var mid = color;
  var dark = shade(color, -18);
  var cream = '#F3ECE0';
  var svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">';
  svg += '<rect width="100" height="100" fill="' + bg + '"/>';

  if (pattern === 'granny') {
    var rings = [[42, dark], [31, mid], [20, cream], [9, dark]];
    svg += '<g transform="translate(50,50) rotate(45)">';
    rings.forEach(function (r) {
      svg += '<rect x="' + (-r[0]) + '" y="' + (-r[0]) + '" width="' + (r[0] * 2) + '" height="' + (r[0] * 2) + '" fill="none" stroke="' + r[1] + '" stroke-width="6"/>';
    });
    svg += '</g>';
  } else if (pattern === 'shell') {
    for (var row = 0; row < 5; row++) {
      var y = row * 22 + 4;
      var offset = (row % 2 === 0) ? -11 : 0;
      var fill = row % 2 === 0 ? mid : dark;
      var d = '';
      for (var x = offset; x < 110; x += 22) {
        d += 'M' + x + ',' + y + ' a11,11 0 0,0 22,0 z ';
      }
      svg += '<path d="' + d + '" fill="' + fill + '"/>';
    }
  } else if (pattern === 'chevron') {
    for (var row2 = 0; row2 < 7; row2++) {
      var y0 = row2 * 16 - 4;
      var col = row2 % 2 === 0 ? mid : dark;
      var dd = 'M-10,' + (y0 + 8) + ' ';
      for (var x2 = -10; x2 <= 110; x2 += 20) {
        dd += 'L' + (x2 + 10) + ',' + y0 + ' L' + (x2 + 20) + ',' + (y0 + 8) + ' ';
      }
      svg += '<path d="' + dd + '" fill="none" stroke="' + col + '" stroke-width="6"/>';
    }
  } else if (pattern === 'ripple') {
    for (var row3 = 0; row3 < 8; row3++) {
      var yy = row3 * 14 - 4;
      var col2 = row3 % 2 === 0 ? mid : dark;
      svg += '<path d="M-20,' + yy + ' Q 5,' + (yy - 11) + ' 30,' + yy + ' T 80,' + yy + ' T 130,' + yy + '" fill="none" stroke="' + col2 + '" stroke-width="6"/>';
    }
  }
  svg += '</svg>';
  return svg;
}

/* Product visual: uploaded photo if the product has one, otherwise the generated swatch */
function productVisual(p) {
  if (p && p.image) {
    return '<img src="' + escapeHtml(p.image) + '" alt="' + escapeHtml(p.name || '') + '" style="width:100%;height:100%;object-fit:cover;display:block">';
  }
  return swatchSVG(p.color, p.pattern);
}

/* ---------- Built-in catalog (used when no backend server is reachable) ---------- */
var LOCAL_PRODUCTS = [{"id":1,"name":"Marigold Amigurumi Fox","category":"Amigurumi","price":24,"color":"#C99A3E","pattern":"granny","yarn_weight":"DK (8-ply)","hours":6,"description":"A small stuffed fox worked in single crochet with hand-embroidered features. Weighted base so it sits upright on a shelf.","stock":8},{"id":2,"name":"Berry Blossom Bunny","category":"Amigurumi","price":22,"color":"#9C4B4B","pattern":"shell","yarn_weight":"DK (8-ply)","hours":5,"description":"Soft amigurumi bunny with a shell-stitch dress and floppy ears. Machine-washable cotton-acrylic blend.","stock":6},{"id":3,"name":"Moss Grove Owl","category":"Amigurumi","price":26,"color":"#5C6B47","pattern":"granny","yarn_weight":"Worsted (10-ply)","hours":7,"description":"A round-bellied owl with layered wing stitches. Safety eyes, hand-stitched beak.","stock":5},{"id":4,"name":"Harvest Granny Square Throw","category":"Blankets & Throws","price":128,"color":"#C99A3E","pattern":"granny","yarn_weight":"Worsted (10-ply)","hours":34,"description":"Forty hand-joined granny squares in a warm harvest palette. 130cm x 160cm, machine washable on cold.","stock":3},{"id":5,"name":"Denim Ripple Throw","category":"Blankets & Throws","price":118,"color":"#48607A","pattern":"ripple","yarn_weight":"Worsted (10-ply)","hours":30,"description":"A wave-stitch ripple throw in fading denim tones. Soft acrylic-cotton blend, generous lap-size.","stock":3},{"id":6,"name":"Bramble Baby Blanket","category":"Blankets & Throws","price":68,"color":"#9C4B4B","pattern":"shell","yarn_weight":"DK (8-ply)","hours":18,"description":"A lightweight shell-stitch blanket sized for prams and cots. 80cm x 100cm.","stock":4},{"id":7,"name":"Fern Stitch Cardigan","category":"Wearables","price":96,"color":"#5C6B47","pattern":"chevron","yarn_weight":"DK (8-ply)","hours":22,"description":"An open-front cardigan with a chevron yoke and dropped shoulders. True to size, hand wash recommended.","stock":4},{"id":8,"name":"Mustard Cable Beanie","category":"Wearables","price":32,"color":"#C99A3E","pattern":"chevron","yarn_weight":"Worsted (10-ply)","hours":4,"description":"A slouchy beanie with a faux-cable brim, lined for warmth. One size fits most.","stock":7},{"id":9,"name":"Berry Wrist Warmers","category":"Wearables","price":26,"color":"#9C4B4B","pattern":"shell","yarn_weight":"DK (8-ply)","hours":3,"description":"Fingerless wrist warmers with a scalloped cuff. Sold as a pair.","stock":9},{"id":10,"name":"Harvest Market Bag","category":"Accessories","price":34,"color":"#C99A3E","pattern":"granny","yarn_weight":"Cotton","hours":6,"description":"A sturdy net-stitch market bag that stretches to hold groceries, lined base for structure.","stock":6},{"id":11,"name":"Denim Coaster Set of 4","category":"Home & Table","price":18,"color":"#48607A","pattern":"granny","yarn_weight":"Cotton","hours":4,"description":"Four granny-square coasters in graduated denim tones, cork-backed for grip.","stock":10},{"id":12,"name":"Moss Plant Hanger","category":"Home & Table","price":22,"color":"#5C6B47","pattern":"chevron","yarn_weight":"Cotton","hours":3,"description":"A macrame-style plant hanger worked in chunky chain stitch, holds pots up to 20cm wide.","stock":8},{"id":13,"name":"Fern Table Runner","category":"Home & Table","price":44,"color":"#5C6B47","pattern":"shell","yarn_weight":"Cotton","hours":12,"description":"A shell-stitch table runner, 30cm x 150cm, in soft fern green cotton.","stock":4},{"id":14,"name":"Marigold Baby Booties","category":"Baby & Kids","price":16,"color":"#C99A3E","pattern":"shell","yarn_weight":"DK (8-ply)","hours":2,"description":"Snug baby booties with a button strap. Available for 0–6 months.","stock":12},{"id":15,"name":"Berry Scrunchie Trio","category":"Accessories","price":14,"color":"#9C4B4B","pattern":"ripple","yarn_weight":"Cotton","hours":1.5,"description":"Three ripple-stitch scrunchies in graduated berry tones.","stock":15},{"id":16,"name":"Denim Chevron Scarf","category":"Wearables","price":38,"color":"#48607A","pattern":"chevron","yarn_weight":"DK (8-ply)","hours":8,"description":"A long chevron-stitch scarf in fading indigo tones, fringed ends.","stock":6}];

/* ---------- API layer: real server first, local fallback ----------
   If the Node backend isn't reachable (file:// , static hosting, server off),
   everything keeps working from the built-in catalog + localStorage. */
var LOCAL_MODE = (window.location.protocol === 'file:');

function lsGet(key, def){ try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; } }
function lsSet(key, val){ try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

function httpError(msg){ var e = new Error(msg); e.isHttp = true; return e; }

function remoteOrLocal(remoteFn, localFn){
  if (LOCAL_MODE) return Promise.resolve().then(localFn);
  return remoteFn().catch(function (e) {
    if (e && e.isHttp) throw e;
    LOCAL_MODE = true;
    return localFn();
  });
}

function apiGet(url) {
  return fetch(API_BASE + url).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) throw httpError(data.error || 'Request failed');
      return data;
    });
  });
}
function apiSend(method, url, body) {
  return fetch(API_BASE + url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  }).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) throw httpError(data.error || 'Request failed');
      return data;
    });
  });
}

/* local cart helpers */
function localCart(){
  var lines = lsGet('hh_local_cart', []);
  var items = [];
  lines.forEach(function (l) {
    var p = LOCAL_PRODUCTS.filter(function (x) { return x.id === l.id; })[0];
    if (p) items.push({ id: p.id, qty: l.qty, name: p.name, price: p.price, color: p.color, pattern: p.pattern, category: p.category, stock: p.stock });
  });
  var subtotal = items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
  return { items: items, subtotal: Math.round(subtotal * 100) / 100 };
}

function fetchProducts(category) {
  return remoteOrLocal(
    function () { return apiGet('/products' + (category ? '?category=' + encodeURIComponent(category) : '')); },
    function () { return LOCAL_PRODUCTS.filter(function (p) { return !category || p.category === category; }); }
  );
}
function fetchProduct(id) {
  return remoteOrLocal(
    function () { return apiGet('/products/' + id); },
    function () {
      var p = LOCAL_PRODUCTS.filter(function (x) { return x.id === Number(id); })[0];
      if (!p) throw new Error('Product not found');
      return p;
    }
  );
}
function fetchCart() {
  return remoteOrLocal(
    function () { return apiGet('/cart?cartId=' + encodeURIComponent(getCartId())); },
    localCart
  );
}
function addToCart(productId, qty) {
  qty = qty || 1;
  return remoteOrLocal(
    function () { return apiSend('POST', '/cart', { cartId: getCartId(), productId: productId, qty: qty }); },
    function () {
      var lines = lsGet('hh_local_cart', []);
      var line = lines.filter(function (l) { return l.id === productId; })[0];
      if (line) line.qty += qty; else lines.push({ id: productId, qty: qty });
      lsSet('hh_local_cart', lines);
      return localCart();
    }
  ).then(function (cart) { updateCartBadgeFrom(cart); return cart; });
}
function updateCartItem(productId, qty) {
  return remoteOrLocal(
    function () { return apiSend('PUT', '/cart/item', { cartId: getCartId(), productId: productId, qty: qty }); },
    function () {
      var lines = lsGet('hh_local_cart', []).filter(function (l) { return !(l.id === productId && qty < 1); });
      lines.forEach(function (l) { if (l.id === productId) l.qty = qty; });
      lsSet('hh_local_cart', lines);
      return localCart();
    }
  ).then(function (cart) { updateCartBadgeFrom(cart); return cart; });
}
function removeCartItem(productId) {
  return remoteOrLocal(
    function () {
      return fetch(API_BASE + '/cart/item?cartId=' + encodeURIComponent(getCartId()) + '&productId=' + productId, { method: 'DELETE' })
        .then(function (r) { return r.json(); });
    },
    function () {
      lsSet('hh_local_cart', lsGet('hh_local_cart', []).filter(function (l) { return l.id !== productId; }));
      return localCart();
    }
  ).then(function (cart) { updateCartBadgeFrom(cart); return cart; });
}
function checkout(payload) {
  payload.cartId = getCartId();
  return remoteOrLocal(
    function () { return apiSend('POST', '/checkout', payload); },
    function () {
      var cart = localCart();
      if (!cart.items.length) throw new Error('Cart is empty');
      var orders = lsGet('hh_local_orders', []);
      var id = orders.length + 1;
      var number = 'HH-' + String(Date.now()).slice(-6) + '-' + Math.random().toString(16).slice(2, 8).toUpperCase();
      orders.push({
        id: id, order_number: number, name: payload.name, email: payload.email, total: cart.subtotal,
        items: cart.items.map(function (i) { return { name: i.name, price: i.price, qty: i.qty }; })
      });
      lsSet('hh_local_orders', orders);
      lsSet('hh_local_cart', []);
      return { orderId: id, orderNumber: number, total: cart.subtotal };
    }
  );
}
function fetchOrder(id) {
  return remoteOrLocal(
    function () { return apiGet('/orders/' + id); },
    function () {
      var o = lsGet('hh_local_orders', []).filter(function (x) { return x.id === Number(id); })[0];
      if (!o) throw new Error('Order not found');
      return o;
    }
  );
}

/* ---------- Cart badge ---------- */
function updateCartBadgeFrom(cart) {
  var count = cart.items.reduce(function (sum, i) { return sum + i.qty; }, 0);
  document.querySelectorAll('.cart-badge').forEach(function (el) { el.textContent = count; });
}
function refreshCartBadge() {
  fetchCart().then(updateCartBadgeFrom).catch(function () {});
}

/* ---------- Toast ---------- */
function toast(msg) {
  var t = document.getElementById('hhToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'hhToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
}

document.addEventListener('DOMContentLoaded', refreshCartBadge);
