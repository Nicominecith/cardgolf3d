import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'cardgolf3d-workshop', consistency: 'strong' });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
// Muss zu WS_BUY_PRICE / WS_CREATOR_CUT in index.html passen.
const PRICE = 1500, CREATOR_CUT = 1000;
const fail = (message, status = 400) => json({ ok: false, error: message }, status);

async function identity(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  try {
    const r = await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: `OAuth ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u.user_id) return null;
    return { id: String(u.user_id), name: String(u.login || u.user_name || 'Spieler').slice(0, 25) };
  } catch { return null; }
}

async function readDB() {
  const db = (await store().get('state', { type: 'json' })) || { items: [], purchases: [], refunds: [], earnings: {} };
  if (!Array.isArray(db.maps)) db.maps = [];
  return db;
}
async function writeDB(db) { await store().setJSON('state', db); }
function cleanItem(x, user) {
  if (!x || typeof x !== 'object') return null;
  const name = String(x.name || '').replace(/[<>"'`\\]/g, '').trim().slice(0, 20);
  const id = String(x.id || '');
  if (!/^ws_[a-z0-9]{4,30}$/.test(id) || name.length < 2) return null;
  const num = (v, def = 0) => Math.max(0, Math.min(0xffffff, Number.parseInt(v ?? def, 10) || 0));
  return { id, type: x.type === 'club' ? 'club' : 'ball', name, creatorId: user.id, creatorName: user.name,
    color: num(x.color), shaft: num(x.shaft, 0xcccccc), glow: !!x.glow, metal: !!x.metal,
    shape: x.shape && typeof x.shape === 'object' ? { size: Math.max(60, Math.min(150, +x.shape.size || 100)), width: Math.max(60, Math.min(160, +x.shape.width || 100)), shaftLength: Math.max(90, Math.min(175, +x.shape.shaftLength || 145)), grip: Math.max(25, Math.min(65, +x.shape.grip || 46)), roughness: Math.max(0, Math.min(100, +x.shape.roughness || 50)), mark: String(x.shape.mark || 'CG').replace(/[<>"'`\\]/g, '').slice(0, 5) } : { size:100,width:100,shaftLength:145,grip:46,roughness:50,mark:'CG' },
    sales: 0, created: Date.now() };
}

function cleanMap(x, user) {
  if (!x || typeof x !== 'object') return null;
  const name = String(x.name || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32);
  if (name.length < 2) return null;
  const n = (v, lo, hi, def) => { const f = Number(v); return Number.isFinite(f) ? Math.max(lo, Math.min(hi, f)) : def; };
  const pt = (p, dx, dy) => ({ x: n(p && p.x, 30, 870, dx), y: n(p && p.y, 30, 510, dy) });
  const start = pt(x.start, 90, 270), hole = pt(x.hole, 810, 270);
  if (Math.hypot(start.x - hole.x, start.y - hole.y) < 150) return null;
  const types = ['tree', 'rock', 'crate', 'moving'];
  const assets = (Array.isArray(x.assets) ? x.assets : []).slice(0, 40)
    .filter(a => a && types.includes(a.type))
    .map(a => ({ type: a.type, x: n(a.x, 30, 870, 450), y: n(a.y, 30, 510, 270), moving: a.type === 'moving', size: n(a.size, 10, 40, 22) }))
    .filter(a => Math.hypot(a.x - start.x, a.y - start.y) >= 48 && Math.hypot(a.x - hole.x, a.y - hole.y) >= 55);
  const hills = (Array.isArray(x.hills) ? x.hills : []).slice(0, 3)
    .map(h => ({ x: n(h && h.x, 30, 870, 450), y: n(h && h.y, 30, 510, 270), r: n(h && h.r, 20, 70, 45) }));
  return { id: 'map-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, par: Math.round(n(x.par, 1, 9, 3)),
    start, hole, assets, hills, creatorId: user.id, creatorName: user.name, created: Date.now() };
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' } });
  const user = await identity(req);
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const db = await readDB();
    return json({ ok: true, items: db.items, maps: db.maps.map(({ creatorId, ...m }) => m), myPurchases: user ? db.purchases.filter(p => p.buyerId === user.id) : [], myRefunds: user ? db.refunds.filter(r => r.buyerId === user.id) : [], myEarnings: user ? (db.earnings[user.id] || 0) : 0 });
  }
  if (!user) return fail('Bitte mit Twitch anmelden; Anmeldung konnte nicht geprüft werden.', 401);
  let body;
  try { body = await req.json(); } catch { return fail('Ungültiges JSON.'); }
  const db = await readDB();
  if (body.action === 'publish') {
    const item = cleanItem(body.item, user);
    if (!item) return fail('Workshop-Item ist ungültig.');
    if (db.items.some(i => i.id === item.id)) return fail('Diese Item-ID existiert bereits.', 409);
    db.items.unshift(item); await writeDB(db); return json({ ok: true, item });
  }
  if (body.action === 'publishMap') {
    const map = cleanMap(body.map, user);
    if (!map) return fail('Map ist ungültig (Name, Start/Loch-Abstand oder Objekte prüfen).');
    if (db.maps.filter(m => m.creatorId === user.id).length >= 20) return fail('Du kannst höchstens 20 Maps veröffentlichen. Lösche zuerst eine alte.', 429);
    if (db.maps.length >= 500) return fail('Der Workshop ist voll.', 507);
    db.maps.unshift(map); await writeDB(db);
    const { creatorId, ...pub } = map; return json({ ok: true, map: pub });
  }
  if (body.action === 'deleteMap') {
    const m = db.maps.find(i => i.id === String(body.mapId || ''));
    if (!m) return fail('Map nicht gefunden.', 404);
    if (m.creatorId !== user.id) return fail('Nur der Ersteller darf diese Map löschen.', 403);
    db.maps = db.maps.filter(i => i.id !== m.id); await writeDB(db); return json({ ok: true });
  }
  if (body.action === 'purchase') {
    const item = db.items.find(i => i.id === String(body.itemId));
    if (!item) return fail('Item nicht gefunden.', 404);
    if (item.creatorId === user.id) return fail('Eigene Items können nicht gekauft werden.');
    if (db.purchases.some(p => p.itemId === item.id && p.buyerId === user.id)) return fail('Item wurde bereits gekauft.', 409);
    // This endpoint records purchase ownership only. A production coin ledger must debit server-authoritative earned coins.
    db.purchases.push({ id: `${item.id}:${user.id}`, itemId: item.id, buyerId: user.id, creatorId: item.creatorId, price: PRICE, at: Date.now(), refunded: false });
    item.sales = (item.sales || 0) + 1;
    db.earnings[item.creatorId] = (db.earnings[item.creatorId] || 0) + CREATOR_CUT;
    await writeDB(db); return json({ ok: true, item, price: PRICE });
  }
  if (body.action === 'delete') {
    const itemId = String(body.itemId || '');
    const item = db.items.find(i => i.id === itemId);
    if (!item) return fail('Item nicht gefunden.', 404);
    if (item.creatorId !== user.id) return fail('Nur der Ersteller darf dieses Item löschen.', 403);
    const eligible = db.purchases.filter(p => p.itemId === itemId && !p.refunded);
    for (const p of eligible) {
      p.refunded = true;
      const existing = db.refunds.some(r => r.purchaseId === p.id);
      if (!existing) db.refunds.push({ purchaseId: p.id, itemId, buyerId: p.buyerId, amount: p.price, at: Date.now(), status: 'pending-wallet-integration' });
    }
    db.items = db.items.filter(i => i.id !== itemId);
    await writeDB(db);
    return json({ ok: true, refundedBuyers: eligible.length, refundCoins: eligible.reduce((n, p) => n + p.price, 0) });
  }
  if (body.action === 'claim') {
    const amount = db.earnings[user.id] || 0;
    db.earnings[user.id] = 0;
    if (amount > 0) await writeDB(db);
    return json({ ok: true, paid: amount });
  }
  if (body.action === 'claimRefunds') {
    const mine = db.refunds.filter(r => r.buyerId === user.id && r.status === 'pending-wallet-integration');
    let paid = 0; const itemIds = [];
    for (const r of mine) { r.status = 'paid'; r.paidAt = Date.now(); paid += r.amount; itemIds.push(r.itemId); }
    if (mine.length) await writeDB(db);
    return json({ ok: true, paid, itemIds });
  }
  return fail('Unbekannte Aktion.');
};
