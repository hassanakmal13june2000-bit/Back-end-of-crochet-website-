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
