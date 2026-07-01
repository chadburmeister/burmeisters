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

## Photos — event albums via Apple Shared Albums (curated allowlist)
Albums are OPT-IN. Nothing is imported unless its link is in `api/albums.json`.
Each entry:
```json
[
  { "id":"reunion-2026", "title":"Family Reunion 2026", "date":"2026",
    "token":"B0Gs...", "enabled": true }
]
```
- `token` = the part of the album's public link after `#`.
- `"enabled": false` hides an album from the site without deleting its entry (easy pause / un-pause).
- To exclude an album entirely, just don't add it (or remove its entry).
- `api/photos.js` pulls only enabled albums; `photos-local.js` holds always-on seed photos.
