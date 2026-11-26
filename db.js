// db.js — SQLite setup + seed data for Hook & Hearth
// Uses Node's built-in node:sqlite (no npm install needed, Node 22.5+)

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'store.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    color TEXT NOT NULL,
    pattern TEXT NOT NULL,
    yarn_weight TEXT NOT NULL,
    hours REAL NOT NULL,
    description TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    qty INTEGER NOT NULL,
    UNIQUE(cart_id, product_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    notes TEXT,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'placed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    qty INTEGER NOT NULL
  );
`);

// Migration: add an `image` column (path to an uploaded photo) if it's missing
const cols = db.prepare('PRAGMA table_info(products)').all();
if (!cols.some((c) => c.name === 'image')) {
  db.exec('ALTER TABLE products ADD COLUMN image TEXT');
}

// Seed products only if table is empty
const countRow = db.prepare('SELECT COUNT(*) AS c FROM products').get();
if (countRow.c === 0) {
  const seed = [
    ['Marigold Amigurumi Fox', 'Amigurumi', 24.0, '#C99A3E', 'granny', 'DK (8-ply)', 6, 'A small stuffed fox worked in single crochet with hand-embroidered features. Weighted base so it sits upright on a shelf.', 8],
    ['Berry Blossom Bunny', 'Amigurumi', 22.0, '#9C4B4B', 'shell', 'DK (8-ply)', 5, 'Soft amigurumi bunny with a shell-stitch dress and floppy ears. Machine-washable cotton-acrylic blend.', 6],
    ['Moss Grove Owl', 'Amigurumi', 26.0, '#5C6B47', 'granny', 'Worsted (10-ply)', 7, 'A round-bellied owl with layered wing stitches. Safety eyes, hand-stitched beak.', 5],
    ['Harvest Granny Square Throw', 'Blankets & Throws', 128.0, '#C99A3E', 'granny', 'Worsted (10-ply)', 34, 'Forty hand-joined granny squares in a warm harvest palette. 130cm x 160cm, machine washable on cold.', 3],
    ['Denim Ripple Throw', 'Blankets & Throws', 118.0, '#48607A', 'ripple', 'Worsted (10-ply)', 30, 'A wave-stitch ripple throw in fading denim tones. Soft acrylic-cotton blend, generous lap-size.', 3],
    ['Bramble Baby Blanket', 'Blankets & Throws', 68.0, '#9C4B4B', 'shell', 'DK (8-ply)', 18, 'A lightweight shell-stitch blanket sized for prams and cots. 80cm x 100cm.', 4],
    ['Fern Stitch Cardigan', 'Wearables', 96.0, '#5C6B47', 'chevron', 'DK (8-ply)', 22, 'An open-front cardigan with a chevron yoke and dropped shoulders. True to size, hand wash recommended.', 4],
    ['Mustard Cable Beanie', 'Wearables', 32.0, '#C99A3E', 'chevron', 'Worsted (10-ply)', 4, 'A slouchy beanie with a faux-cable brim, lined for warmth. One size fits most.', 7],
    ['Berry Wrist Warmers', 'Wearables', 26.0, '#9C4B4B', 'shell', 'DK (8-ply)', 3, 'Fingerless wrist warmers with a scalloped cuff. Sold as a pair.', 9],
    ['Harvest Market Bag', 'Accessories', 34.0, '#C99A3E', 'granny', 'Cotton', 6, 'A sturdy net-stitch market bag that stretches to hold groceries, lined base for structure.', 6],
    ['Denim Coaster Set of 4', 'Home & Table', 18.0, '#48607A', 'granny', 'Cotton', 4, 'Four granny-square coasters in graduated denim tones, cork-backed for grip.', 10],
    ['Moss Plant Hanger', 'Home & Table', 22.0, '#5C6B47', 'chevron', 'Cotton', 3, 'A macrame-style plant hanger worked in chunky chain stitch, holds pots up to 20cm wide.', 8],
    ['Fern Table Runner', 'Home & Table', 44.0, '#5C6B47', 'shell', 'Cotton', 12, 'A shell-stitch table runner, 30cm x 150cm, in soft fern green cotton.', 4],
    ['Marigold Baby Booties', 'Baby & Kids', 16.0, '#C99A3E', 'shell', 'DK (8-ply)', 2, 'Snug baby booties with a button strap. Available for 0–6 months.', 12],
    ['Berry Scrunchie Trio', 'Accessories', 14.0, '#9C4B4B', 'ripple', 'Cotton', 1.5, 'Three ripple-stitch scrunchies in graduated berry tones.', 15],
    ['Denim Chevron Scarf', 'Wearables', 38.0, '#48607A', 'chevron', 'DK (8-ply)', 8, 'A long chevron-stitch scarf in fading indigo tones, fringed ends.', 6]
  ];
  const insert = db.prepare(`
    INSERT INTO products (name, category, price, color, pattern, yarn_weight, hours, description, stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of seed) insert.run(...row);
  console.log('Seeded ' + seed.length + ' products.');
}

module.exports = db;
