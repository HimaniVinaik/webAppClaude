# Ace — Tennis Progress Tracker

A simple, installable tennis tracker built for iPhone. It's a static site
(no build step, no backend) that works fully offline and can be added to
your Home Screen so it feels like a native app.

## Features

- **Overview dashboard** — current rating, win/loss ring, and a recent
  activity feed across everything you log
- **Matches** — log date, opponent, singles/doubles, result, score,
  surface, and location; see your overall win/loss record
- **Rating history** — track NTRP, UTR, or a custom rating over time with
  a trend line and change-over-last-entry indicator
- **Clubs & Clinics** — keep a list of clubs you belong to and clinics or
  lessons you've attended (instructor, focus area, notes)
- **Improvement journal** — log what you worked on by category (serve,
  forehand, backhand, volleys, footwork, mental game, strategy, fitness)
  with an optional 1–5 self-rating, and see a skills snapshot of your
  latest rating per category
- **Dark mode** — follows your system setting, or toggle manually
- **Works offline** — a service worker caches the app after first load
- **Installable (PWA)** — "Add to Home Screen" on iPhone gives it a
  full-screen, app-like icon and launch experience
- **Your data stays on your device** — everything is stored in the
  browser's local storage; nothing is sent to a server

## Project structure

```
index.html        Main page / markup (5 tabs: Overview, Matches, Rating, Training, Progress)
css/style.css      Styling (light + dark themes, iPhone-safe-area aware)
js/app.js          App logic (state, schema-driven add forms, rendering, storage)
manifest.json      PWA manifest (name, icons, colors)
sw.js              Service worker for offline caching
icons/             App icons (180/192/512px, tennis ball design)
```

## Hosting on GitHub Pages

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`.
4. Choose the branch this code lives on (e.g. `main`) and `/ (root)` as the folder, then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`
   (may take a minute or two the first time — the Pages settings page shows
   a "building" status until it's live).

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
