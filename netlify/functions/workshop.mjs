import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'cardgolf3d-workshop', consistency: 'strong' });
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
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
  return (await store().get('state', { type: 'json' })) || { items: [], purchases: [], refunds: [], earnings: {} };
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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' } });
  const user = await identity(req);
  const url = new URL(req.url);
  if (req.method === 'GET') {
    const db = await readDB();
    return json({ ok: true, items: db.items, myPurchases: user ? db.purchases.filter(p => p.buyerId === user.id) : [], myRefunds: user ? db.refunds.filter(r => r.buyerId === user.id) : [] });
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
  if (body.action === 'purchase') {
    const item = db.items.find(i => i.id === String(body.itemId));
    if (!item) return fail('Item nicht gefunden.', 404);
    if (item.creatorId === user.id) return fail('Eigene Items können nicht gekauft werden.');
    if (db.purchases.some(p => p.itemId === item.id && p.buyerId === user.id)) return fail('Item wurde bereits gekauft.', 409);
    // This endpoint records purchase ownership only. A production coin ledger must debit server-authoritative earned coins.
    db.purchases.push({ id: `${item.id}:${user.id}`, itemId: item.id, buyerId: user.id, creatorId: item.creatorId, price: 100, at: Date.now(), refunded: false });
    item.sales = (item.sales || 0) + 1;
    db.earnings[item.creatorId] = (db.earnings[item.creatorId] || 0) + 70;
    await writeDB(db); return json({ ok: true, item, note: 'Kauf registriert; Münzabbuchung muss noch an den serverseitigen Spielstand angebunden werden.' });
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
    return json({ ok: true, refundedBuyers: eligible.length, refundCoins: eligible.reduce((n, p) => n + p.price, 0), note: 'Rückerstattungen sind erfasst; die Auszahlung in den echten Spielstand erfordert noch die zentrale Münz-Wallet.' });
  }
  if (body.action === 'claim') {
    const amount = db.earnings[user.id] || 0;
    // Intentionally do not clear earnings here: local-only coins are not a secure payout target.
    return json({ ok: true, earnings: amount, note: 'Auszahlung bleibt deaktiviert, bis die serverseitige Münz-Wallet angebunden ist.' });
  }
  return fail('Unbekannte Aktion.');
};
