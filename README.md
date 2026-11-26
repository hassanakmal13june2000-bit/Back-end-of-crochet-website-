# Hook & Hearth — Handmade Crochet Store

A full-stack demo store: Node.js backend (built-in `http` + `node:sqlite`, no external
dependencies to install) and a static frontend (HTML/CSS/vanilla JS).

## Requirements

- Node.js **22.5 or newer** (uses the built-in `node:sqlite` module).
  Check your version with `node -v`. If you're on an older version, install the
  latest Node LTS from https://nodejs.org first.

## Run it

No `npm install` needed — everything used is built into Node.

```bash
cd hookhearth
node server.js
```

Then open **http://localhost:3000** in your browser.

The first time it runs, it creates `data/store.db` (a SQLite file) and seeds it with
16 sample crochet products. Your cart and any orders you place are stored there too —
delete `data/store.db` any time to reset the shop.

## No server? It still works

All page links are relative, so you can also open `public/index.html` directly (or host the `public` folder on any static host like Netlify). Without the Node backend the shop falls back to a built-in catalog and keeps the cart/orders in the browser's localStorage. For the real database-backed version, run `node server.js`.

## Admin panel (add products, upload photos, see orders)

1. Start the server with your own password:
   ```bash
   ADMIN_PASSWORD=yourSecretPassword node server.js
   ```
   (On Windows PowerShell: `$env:ADMIN_PASSWORD="yourSecretPassword"; node server.js`.
   If you don't set one, the default password is `admin123` — change it before going live.)
2. Open **http://localhost:3000/admin.html** and log in.
3. **Products tab:** add a product (name, category, price, stock, description, optional photo),
   edit or delete existing ones. Photos are saved in `data/uploads/` and shown on the shop;
   products without a photo keep the generated crochet swatch.
4. **Orders tab:** see every order with the customer's details and change its status
   (placed → making → shipped → delivered).

On Render, set `ADMIN_PASSWORD` under Environment. Note that Render's free tier wipes
`data/` (database + uploaded photos) on restart; for real use, attach a Persistent Disk
or move to a hosted database and image storage.

## Deploying it live (so anyone can visit it)

This needs a host that runs a persistent Node.js process — it will **not** work on
static hosts like Netlify. Render.com has a free tier that works well:

1. Push this folder to a GitHub repository.
2. Sign up at render.com with your GitHub account (no credit card needed).
3. New + → Web Service → select your repo.
4. Environment: Node · Build command: (leave blank) · Start command: `node server.js`
5. Click Deploy — you'll get a live `https://your-app.onrender.com` URL.

Note: on Render's free tier the service sleeps after 15 minutes of inactivity
(30–60s to wake back up), and the SQLite file is **not persistent** across
restarts/redeploys — fine for a demo, not for real customer orders long-term.

## What's included

- **Frontend** (`public/`): home page, shop with category filters, product detail
  pages, cart, checkout, and an order confirmation page. Product "photos" are
  generated on the fly as SVG crochet swatches (granny square, shell, chevron,
  ripple) colored to match each product — no stock photography needed.
- **Backend** (`server.js`, `db.js`): a REST API for products, a per-browser cart
  (identified by a random ID stored in `localStorage`), and a checkout flow that
  creates a real order record and decrements stock. Payment is cash-on-delivery
  (no payment gateway wired up).

## API reference

| Method | Path                  | Purpose                          |
|--------|-----------------------|-----------------------------------|
| GET    | /api/products         | List products (optional `?category=`) |
| GET    | /api/products/:id     | Single product                    |
| GET    | /api/cart?cartId=     | Get a cart's items + subtotal     |
| POST   | /api/cart             | Add an item `{cartId, productId, qty}` |
| PUT    | /api/cart/item        | Set an item's quantity `{cartId, productId, qty}` |
| DELETE | /api/cart/item        | Remove an item (`?cartId=&productId=`) |
| POST   | /api/checkout         | Place an order, clears the cart   |
| GET    | /api/orders/:id       | Order details (for the confirmation page) |

## Notes for going further

- Swap the cash-on-delivery checkout for a real payment gateway (e.g. Stripe) by
  replacing the `/api/checkout` handler.
- Add an admin page to edit `products` in the SQLite database instead of editing
  the seed list in `db.js`.
