// Vercel Serverless Function: aggregate iCloud Shared Albums into event photo data.
// Config: api/albums.json -> [{ "id","title","date","token" }]
// token = the part of a shared-album link after the '#', e.g. https://www.icloud.com/sharedalbum/#B0Gs... -> "B0Gs..."

const albums = require('./albums.json');

let CACHE = { at: 0, data: null };
const TTL = 5 * 60 * 1000; // 5 minutes

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Origin': 'https://www.icloud.com',
      'Referer': 'https://www.icloud.com/'
    },
    body: JSON.stringify(body)
  });
  let json = {};
  try { json = await r.json(); } catch (e) {}
  const redirectHost = r.headers.get('x-apple-mme-host') || json['X-Apple-MMe-Host'];
  return { status: r.status, body: json, redirectHost };
}

async function callWithRedirect(hostRef, token, endpoint, body) {
  let url = `https://${hostRef.host}/${token}/sharedstreams/${endpoint}`;
  let res = await postJson(url, body);
  if (res.status === 330 && res.redirectHost) {
    hostRef.host = res.redirectHost;
    url = `https://${hostRef.host}/${token}/sharedstreams/${endpoint}`;
    res = await postJson(url, body);
  }
  return res;
}

async function fetchAlbum(token) {
  const hostRef = { host: 'p23-sharedstreams.icloud.com' };
  const stream = await callWithRedirect(hostRef, token, 'webstream', { streamCtag: null });
  if (stream.status !== 200) throw new Error('webstream status ' + stream.status);

  const photos = Array.isArray(stream.body.photos) ? stream.body.photos : [];
  if (!photos.length) return [];

  const guids = photos.map(p => p.photoGuid).filter(Boolean);
  const assetRes = await callWithRedirect(hostRef, token, 'webasseturls', { photoGuids: guids });
  const items = (assetRes.body && assetRes.body.items) || {};

  const out = [];
  for (const p of photos) {
    const derivs = Object.values(p.derivatives || {});
    let best = null;
    for (const d of derivs) {
      if (!d || !d.checksum) continue;
      if (!best || (Number(d.width) || 0) > (Number(best.width) || 0)) best = d;
    }
    if (!best) continue;
    const it = items[best.checksum];
    if (!it || !it.url_location || !it.url_path) continue;
    out.push({
      url: `https://${it.url_location}${it.url_path}`,
      w: Number(best.width) || null,
      h: Number(best.height) || null,
      caption: p.caption || '',
      contributor: p.contributorFullName ||
        [p.contributorFirstName, p.contributorLastName].filter(Boolean).join(' ') || '',
      date: p.dateCreated || p.batchDateCreated || null
    });
  }
  // newest first
  out.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return out;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (CACHE.data && Date.now() - CACHE.at < TTL) {
    return res.status(200).json(CACHE.data);
  }

  const events = [];
  for (const a of (albums || [])) {
    if (!a || !a.token) continue;
    if (a.enabled === false) continue; // toggle an album off without deleting it
    try {
      const photos = await fetchAlbum(a.token);
      events.push({
        id: a.id || a.token.slice(0, 8),
        title: a.title || 'Untitled album',
        date: a.date || (photos[0] && photos[0].date ? String(photos[0].date).slice(0, 4) : null),
        source: 'icloud',
        cover: photos[0] ? photos[0].url : '',
        count: photos.length,
        photos
      });
    } catch (e) {
      events.push({ id: a.id || 'err', title: a.title || 'Album', source: 'icloud', error: String(e && e.message || e), photos: [] });
    }
  }

  const data = { events, generatedAt: new Date().toISOString() };
  CACHE = { at: Date.now(), data };
  return res.status(200).json(data);
};
