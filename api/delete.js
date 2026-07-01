// Admin-only delete for family photos. POST { password, action, public_id|tag }
// Requires env: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, PHOTOS_ADMIN_PASSWORD
const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'fpe4tef1';
const KEY    = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const ADMIN  = process.env.PHOTOS_ADMIN_PASSWORD;
const TAG = 'burmeisters';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });
  if (!KEY || !SECRET) return res.status(200).json({ ok: false, error: 'Cloudinary not configured' });
  if (!ADMIN) return res.status(200).json({ ok: false, error: 'Admin password not set up yet' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== 'object') body = {};

  if (!body.password || body.password !== ADMIN) return res.status(401).json({ ok: false, error: 'Wrong admin password' });

  const auth = 'Basic ' + Buffer.from(KEY + ':' + SECRET).toString('base64');
  try {
    if (body.action === 'deletePhoto' && body.public_id) {
      const u = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image?public_ids[]=${encodeURIComponent(body.public_id)}`;
      const r = await fetch(u, { method: 'DELETE', headers: { Authorization: auth } });
      const j = await r.json();
      return res.status(200).json({ ok: true, result: j.deleted || j });
    }
    if (body.action === 'deleteEvent' && body.tag) {
      if (body.tag === TAG) return res.status(400).json({ ok: false, error: 'refusing to delete everything' });
      const u = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/tags/${encodeURIComponent(body.tag)}`;
      const r = await fetch(u, { method: 'DELETE', headers: { Authorization: auth } });
      const j = await r.json();
      return res.status(200).json({ ok: true, result: j.deleted || j });
    }
    return res.status(400).json({ ok: false, error: 'bad request' });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
};
