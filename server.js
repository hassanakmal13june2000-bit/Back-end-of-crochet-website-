// server.js — Hook & Hearth backend
// Plain Node.js (no npm install required). Run with: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Admin login. Set your own password with:  ADMIN_PASSWORD=yourpassword node server.js
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const adminTokens = new Set();
const MAX_BODY = 8 * 1024 * 1024; // 8 MB (photos are sent as base64)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function orderNumber() {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return 'HH-' + Date.now().toString().slice(-6) + '-' + rand;
}

function getProductOr404(id, res) {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) {
    sendJSON(res, 404, { error: 'Product not found' });
    return null;
  }
  return p;
}

function cartWithProducts(cartId) {
  const rows = db.prepare(`
    SELECT ci.product_id AS id, ci.qty AS qty,
           p.name AS name, p.price AS price, p.color AS color,
           p.pattern AS pattern, p.category AS category, p.stock AS stock, p.image AS image
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id ASC
  `).all(cartId);
  const subtotal = rows.reduce((sum, r) => sum + r.price * r.qty, 0);
  return { items: rows, subtotal: Math.round(subtotal * 100) / 100 };
}


function isAdmin(req) {
  return adminTokens.has(req.headers['x-admin-token']);
}

function saveImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) throw new Error('Image must be a PNG, JPG, WEBP or GIF');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 5 * 1024 * 1024) throw new Error('Image is larger than 5 MB');
  const name = crypto.randomBytes(8).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return '/uploads/' + name;
}

function deleteImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  const file = path.join(UPLOAD_DIR, path.basename(imagePath));
  fs.unlink(file, () => {});
}

function cleanProductBody(b) {
  const out = {
    name: String(b.name || '').trim(),
    category: String(b.category || '').trim(),
    price: Number(b.price),
    color: /^#[0-9a-fA-F]{6}$/.test(b.color || '') ? b.color : '#9C4B4B',
    pattern: ['granny', 'shell', 'chevron', 'ripple'].includes(b.pattern) ? b.pattern : 'granny',
    yarn_weight: String(b.yarn_weight || 'DK (8-ply)').trim(),
    hours: Number(b.hours) || 1,
    description: String(b.description || '').trim(),
    stock: Math.max(0, parseInt(b.stock, 10) || 0)
  };
  if (!out.name || !out.category || !(out.price >= 0) || isNaN(out.price)) {
    throw new Error('Name, category and a valid price are required');
  }
  return out;
}

async function handleApi(req, res, pathname, query) {
  // ----- PRODUCTS -----
  if (pathname === '/api/products' && req.method === 'GET') {
    let sql = 'SELECT * FROM products';
    const params = [];
    if (query.get('category')) {
      sql += ' WHERE category = ?';
      params.push(query.get('category'));
    }
    sql += ' ORDER BY id ASC';
    const rows = db.prepare(sql).all(...params);
    return sendJSON(res, 200, rows);
  }

  const productMatch = pathname.match(/^\/api\/products\/(\d+)$/);
  if (productMatch && req.method === 'GET') {
    const p = getProductOr404(Number(productMatch[1]), res);
    if (!p) return;
    return sendJSON(res, 200, p);
  }

  // ----- CART -----
  if (pathname === '/api/cart' && req.method === 'GET') {
    const cartId = query.get('cartId');
    if (!cartId) return sendJSON(res, 400, { error: 'cartId is required' });
    return sendJSON(res, 200, cartWithProducts(cartId));
  }

  if (pathname === '/api/cart' && req.method === 'POST') {
    const body = await readBody(req).catch(() => null);
    if (!body || !body.cartId || !body.productId) {
      return sendJSON(res, 400, { error: 'cartId and productId are required' });
    }
    const product = getProductOr404(Number(body.productId), res);
    if (!product) return;
    const qty = Math.max(1, Number(body.qty) || 1);
    const existing = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?')
      .get(body.cartId, product.id);
    if (existing) {
      db.prepare('UPDATE cart_items SET qty = qty + ? WHERE id = ?').run(qty, existing.id);
    } else {
      db.prepare('INSERT INTO cart_items (cart_id, product_id, qty) VALUES (?, ?, ?)')
        .run(body.cartId, product.id, qty);
    }
    return sendJSON(res, 200, cartWithProducts(body.cartId));
  }

  if (pathname === '/api/cart/item' && req.method === 'PUT') {
    const body = await readBody(req).catch(() => null);
    if (!body || !body.cartId || !body.productId) {
      return sendJSON(res, 400, { error: 'cartId and productId are required' });
    }
    const qty = Number(body.qty);
    if (!qty || qty < 1) {
      db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?')
        .run(body.cartId, body.productId);
    } else {
      db.prepare('UPDATE cart_items SET qty = ? WHERE cart_id = ? AND product_id = ?')
        .run(qty, body.cartId, body.productId);
    }
    return sendJSON(res, 200, cartWithProducts(body.cartId));
  }

  if (pathname === '/api/cart/item' && req.method === 'DELETE') {
    const cartId = query.get('cartId');
    const productId = query.get('productId');
    if (!cartId || !productId) return sendJSON(res, 400, { error: 'cartId and productId are required' });
    db.prepare('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?').run(cartId, productId);
    return sendJSON(res, 200, cartWithProducts(cartId));
  }

  // ----- CHECKOUT -----
  if (pathname === '/api/checkout' && req.method === 'POST') {
    const body = await readBody(req).catch(() => null);
    if (!body || !body.cartId || !body.name || !body.email || !body.address || !body.city) {
      return sendJSON(res, 400, { error: 'Missing required checkout fields' });
    }
    const cart = cartWithProducts(body.cartId);
    if (cart.items.length === 0) {
      return sendJSON(res, 400, { error: 'Cart is empty' });
    }
    const number = orderNumber();
    const insertOrder = db.prepare(`
      INSERT INTO orders (order_number, name, email, phone, address, city, notes, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = insertOrder.run(
      number, body.name, body.email, body.phone || '', body.address, body.city, body.notes || '', cart.subtotal
    );
    const orderId = result.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of cart.items) {
      insertItem.run(orderId, item.id, item.name, item.price, item.qty);
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.qty, item.id);
    }
    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(body.cartId);
    return sendJSON(res, 200, { orderId, orderNumber: number, total: cart.subtotal });
  }

  const orderMatch = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (orderMatch && req.method === 'GET') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(orderMatch[1]));
    if (!order) return sendJSON(res, 404, { error: 'Order not found' });
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return sendJSON(res, 200, { ...order, items });
  }

  // ----- ADMIN -----
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    const body = await readBody(req).catch(() => null);
    if (!body || body.password !== ADMIN_PASSWORD) {
      return sendJSON(res, 401, { error: 'Wrong password' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    adminTokens.add(token);
    return sendJSON(res, 200, { token });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return sendJSON(res, 401, { error: 'Please log in again' });

    if (pathname === '/api/admin/products' && req.method === 'POST') {
      const body = await readBody(req).catch((e) => ({ __err: e.message }));
      if (body.__err) return sendJSON(res, 400, { error: body.__err });
      try {
        const p = cleanProductBody(body);
        const image = body.image ? saveImage(body.image) : null;
        const r = db.prepare(`
          INSERT INTO products (name, category, price, color, pattern, yarn_weight, hours, description, stock, image)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(p.name, p.category, p.price, p.color, p.pattern, p.yarn_weight, p.hours, p.description, p.stock, image);
        return sendJSON(res, 200, db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid));
      } catch (e) {
        return sendJSON(res, 400, { error: e.message });
      }
    }

    const adminProd = pathname.match(/^\/api\/admin\/products\/(\d+)$/);
    if (adminProd && req.method === 'PUT') {
      const id = Number(adminProd[1]);
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) return sendJSON(res, 404, { error: 'Product not found' });
      const body = await readBody(req).catch((e) => ({ __err: e.message }));
      if (body.__err) return sendJSON(res, 400, { error: body.__err });
      try {
        const p = cleanProductBody(body);
        let image = existing.image;
        if (body.image) { image = saveImage(body.image); deleteImageFile(existing.image); }
        else if (body.clearImage) { deleteImageFile(existing.image); image = null; }
        db.prepare(`
          UPDATE products SET name=?, category=?, price=?, color=?, pattern=?, yarn_weight=?, hours=?, description=?, stock=?, image=?
          WHERE id = ?
        `).run(p.name, p.category, p.price, p.color, p.pattern, p.yarn_weight, p.hours, p.description, p.stock, image, id);
        return sendJSON(res, 200, db.prepare('SELECT * FROM products WHERE id = ?').get(id));
      } catch (e) {
        return sendJSON(res, 400, { error: e.message });
      }
    }

    if (adminProd && req.method === 'DELETE') {
      const id = Number(adminProd[1]);
      const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) return sendJSON(res, 404, { error: 'Product not found' });
      deleteImageFile(existing.image);
      db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(id);
      db.prepare('DELETE FROM products WHERE id = ?').run(id);
      return sendJSON(res, 200, { ok: true });
    }

    if (pathname === '/api/admin/orders' && req.method === 'GET') {
      const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
      const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
      return sendJSON(res, 200, orders.map((o) => ({ ...o, items: itemStmt.all(o.id) })));
    }

    const adminOrder = pathname.match(/^\/api\/admin\/orders\/(\d+)$/);
    if (adminOrder && req.method === 'PUT') {
      const body = await readBody(req).catch(() => null);
      const allowed = ['placed', 'making', 'shipped', 'delivered', 'cancelled'];
      if (!body || !allowed.includes(body.status)) return sendJSON(res, 400, { error: 'Invalid status' });
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(body.status, Number(adminOrder[1]));
      return sendJSON(res, 200, { ok: true });
    }
  }

  sendJSON(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, pathname) {
  let baseDir = PUBLIC_DIR;
  let filePath = pathname === '/' ? '/index.html' : pathname;
  if (pathname.startsWith('/uploads/')) {
    baseDir = UPLOAD_DIR;
    filePath = pathname.slice('/uploads'.length);
  }
  filePath = path.join(baseDir, filePath);

  // Prevent path traversal outside the base directory
  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, '404.html'), (err2, data2) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(err2 ? '404 Not Found' : data2);
      });
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://' + req.headers.host);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname.startsWith('/api/')) {
    try {
      await handleApi(req, res, pathname, parsedUrl.searchParams);
    } catch (err) {
      console.error(err);
      sendJSON(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🧶  Hook & Hearth is running!');
  console.log('  Open http://localhost:' + PORT + ' in your browser.');
  console.log('');
});
