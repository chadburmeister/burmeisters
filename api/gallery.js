// Lists uploaded family photos from Cloudinary (tag: burmeisters), grouped by event.
// Requires Vercel env vars: CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// (CLOUDINARY_CLOUD_NAME optional; defaults below)
const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME || 'fpe4tef1';
const KEY    = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const TAG = 'burmeisters';

let CACHE = { at: 0, data: null };
const TTL = 60 * 1000;

const slug   = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
const unslug = s => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  if (!KEY || !SECRET) return res.status(200).json({ events: [], configured: false });
  if (CACHE.data && Date.now() - CACHE.at < TTL) return res.status(200).json(CACHE.data);

  try {
    const auth = 'Basic ' + Buffer.from(KEY + ':' + SECRET).toString('base64');
    const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/image/tags/${TAG}?context=true&tags=true&max_results=500`;
    const r = await fetch(url, { headers: { Authorization: auth } });
    const raw = await r.text();
    let j;
    try { j = JSON.parse(raw); }
    catch (e) { return res.status(200).json({ events: [], configured: true, error: 'Cloudinary returned ' + r.status }); }

    const byEvent = {};
    (j.resources || []).forEach(rs => {
      const ctx = (rs.context && rs.context.custom) || {};
      const tags = (rs.tags || []).filter(t => t && t !== TAG);
      const title = ctx.event || (tags[0] ? unslug(tags[0]) : 'Family Photos');
      const id = slug(title);
      const base = `https://res.cloudinary.com/${CLOUD}/image/upload`;
      const ver = rs.version ? `v${rs.version}/` : '';
      const photo = {
        url: rs.secure_url,
        thumb: `${base}/c_fill,w_600,h_600,q_auto,f_auto/${ver}${rs.public_id}.${rs.format}`,
        big:   `${base}/c_limit,w_1600,h_1600,q_auto,f_auto/${ver}${rs.public_id}.${rs.format}`,
        w: rs.width || null, h: rs.height || null,
        caption: ctx.caption || '',
        contributor: ctx.uploader || '',
        date: rs.created_at || null,
        public_id: rs.public_id
      };
      (byEvent[id] = byEvent[id] || { id, title, photos: [] }).photos.push(photo);
    });

    const events = Object.values(byEvent).map(e => {
      e.photos.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      e.date = e.photos[0] && e.photos[0].date ? String(e.photos[0].date).slice(0, 4) : null;
      e.cover = e.photos[0] ? e.photos[0].thumb : '';
      e.count = e.photos.length;
      e.source = 'upload';
      return e;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const data = { events, configured: true, generatedAt: new Date().toISOString() };
    CACHE = { at: Date.now(), data };
    return res.status(200).json(data);
  } catch (e) {
    return res.status(200).json({ events: [], configured: true, error: String(e && e.message || e) });
  }
};
