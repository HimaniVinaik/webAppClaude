# Daily — Todo & Habits

A simple, installable to-do and habit tracker built for iPhone. It's a
static site (no build step, no backend) that works fully offline and can
be added to your Home Screen so it feels like a native app.

## Features

- **To-Dos** — add, check off, and delete daily tasks
- **Habits** — set a daily target (e.g. "Drink water — 3x/day") and log
  progress with a tap; progress is tracked per day
- **Progress ring & streak** — see today's completion at a glance and
  track a daily streak
- **Dark mode** — follows your system setting, or toggle manually
- **Works offline** — a service worker caches the app after first load
- **Installable (PWA)** — "Add to Home Screen" on iPhone gives it a
  full-screen, app-like icon and launch experience
- **Your data stays on your device** — everything is stored in the
  browser's local storage; nothing is sent to a server

## Project structure

```
index.html        Main page / markup
css/style.css      Styling (light + dark themes, iPhone-safe-area aware)
js/app.js          App logic (state, rendering, storage)
manifest.json      PWA manifest (name, icons, colors)
sw.js              Service worker for offline caching
icons/             App icons (180/192/512px)
```

## Hosting on GitHub Pages

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the branch this code lives on and `/ (root)` as the folder, then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`
   (may take a minute or two the first time).

No build step is required — it's plain HTML/CSS/JS.

## Adding it to your iPhone Home Screen

1. Open the GitHub Pages URL in **Safari** on your iPhone.
2. Tap the **Share** icon (square with an arrow).
3. Tap **Add to Home Screen**, then **Add**.
4. Launch it from the Home Screen icon — it opens full-screen, like a
   native app, and keeps working even offline.

## Local development

No dependencies or build tools needed. From the project folder, serve it
with any static file server, for example:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.
