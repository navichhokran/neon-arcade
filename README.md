# NEON ARCADE

A tiny, self-contained neon arcade: Snake, 2048, Tetris, and Bug Squash. Pure HTML/CSS/JS, no build step, no backend. Runs anywhere static files are served.

## Files
- `index.html` - the page
- `css/styles.css` - neon/CRT theme
- `js/app.js` - arcade hub + all four games

## Run locally
Just open `index.html` in a browser, or serve it:
```bash
python3 -m http.server 8080 --bind 127.0.0.1 --directory .
```
Then visit http://127.0.0.1:8080

## Personalize
- Change the signature at the bottom: edit `Arcade.handle` near the top of `js/app.js` (default `"player one"`).
- Rename the arcade: edit the `<title>` and the `.logo` text in `index.html`.
- Colors live in the `:root` block of `css/styles.css`.

## Add a game later
In `js/app.js`, copy one of the game IIFE blocks and call `register({ id, title, icon, desc, mount, unmount })`. Each game gets a fresh `mount(root)` and must clean up its timers/listeners in `unmount`.

## Deploy to Cloudflare Pages (Direct Upload)
1. In the Cloudflare dashboard: Workers & Pages -> Create -> Pages -> Upload assets.
2. Name the project, then drag the WHOLE `neon-arcade` folder (not the zip) into the upload area.
3. Deploy. You get a free `*.pages.dev` URL with automatic HTTPS.
4. To use your own domain: Pages project -> Custom domains -> add your domain. This requires your domain's DNS to be on Cloudflare (point your registrar's nameservers at Cloudflare first).

Notes:
- High scores are stored per-browser in `localStorage`.
- Everything is client-side, so there is nothing to secure server-side and no secrets in the code.
