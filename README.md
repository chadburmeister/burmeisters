# burmeisters.com — Family Site

Static site. Four pages:
- index.html   → password gateway + photo carousel (hub with 4 tabs)
- photos.html  → album cards
- songs.html   → AI family songs player
- memories.html→ story timeline

## Add media
- Family photos: put 01.jpg .. 10.jpg in /photos (01.jpg = carousel slide 1)
- Album covers:  /photos/albums/<slug>.jpg
- Songs:         /music/*.mp3 (edit the song list in songs.html)

## Password
Set in index.html -> FAMILY_PASSWORD (currently "burmeister").
This is a soft/client-side gate. For real protection use Vercel password
protection or Cloudflare/Netlify Access.

## Deploy
Static — no build step. Vercel auto-detects. Root = this folder.

## Photos — direct family uploads (Cloudinary)
Family uploads photos on the Photos page: pick/create an event, type their name, drop files.
Setup (one-time):
1. Create a free Cloudinary account; note your **cloud name**.
2. Settings → Upload → add an **Unsigned** upload preset; note its **name**.
3. Put cloud name + preset name in `photos-config.js`.
4. In Vercel project env vars add: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (from the Cloudinary dashboard), then redeploy.
Photos are tagged `burmeisters`; event/uploader/caption stored in Cloudinary "context".
`/api/gallery` lists them grouped by event; `photos-local.js` holds always-on seed photos.
