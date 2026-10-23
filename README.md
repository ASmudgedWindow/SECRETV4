# SecretV4

A browser game portal: about 2,700 games, a few small tools, and no accounts. It's a static site hosted on GitHub Pages, with an optional free play counter on Cloudflare.

SecretV4 is the fourth version of a project that started as a shared Google Doc of game links. V2 grew to a few hundred games and was shut down. V3 was a Google Sites page.

## What's in it

- **Games:** HTML games, Flash games (run with Ruffle), emulated console games (EmulatorJS), and Eaglercraft clients.
- **Games tab:** search that tolerates typos (it also searches genres), categories, favorites, a Recent tab, a Featured tab showing the most played games, a Staff Picks tab with live events, your own Collections, thumbs up/down ratings with a "Top rated" sort, and a Genres tab (Two Player, Platformer, Arcade, Simulator, Idle & Clicker, Shooter, Puzzle, Racing, Sports, RPG, Fighting, Horror, Strategy, Sandbox & Survival, Adventure, Board & Card, .io & Online, Rhythm & Music).
- **Tools and Stuff tabs:** calculator, timer, notes, password generator, converters, a few small games, and a list of outside sites.
- **Loading screen splash text:** a random line under the "Initializing" text, like Minecraft's splashes. The lines are in `lib/splash.ts`, one per line, so adding one is easy. It never shows the same one twice in a row. To preview a specific one, add `?splash=3` to the site's address (3 = the third line).
- **Welcome tour:** a one-minute walkthrough of the tabs (Games, Tools, Stuff, Achievements, Settings) that runs once for every visitor, new or returning, and never again. It can be replayed from Settings. The "already seen" flag is `secretv4-tour-done` in the browser's storage (to show it to everyone again, change `DONE_KEY` in `lib/tour.ts`).
- **Achievements tab:** personal stats and 60 achievements in six rarities (Common to SECRET), tracked from real activity.
- **Staff dashboard:** a hidden page (`admin.html`) with three kinds of sign-in.
  - **Owner:** can do everything: see which browsers are online (anonymously), name devices, send pranks, make helpers and admins, and read the activity log.
  - **Admin:** staff chosen by the owner. They get a Staff hub (who on the team is online, and where every tool is) plus live stats, Staff Picks, events, announcements and broken-game reports. No pranks, no device list, no settings, and they can never delete games.
  - **Helper:** a temporary code for a friend. Messages, rickrolls and a few visual gags only.
  
  Every permission is checked by the Worker on every request, and the owner's activity log records what staff do. Visitors are told about all this in a notice in Settings.
- **Settings:** themes, backgrounds, tab cloaking, a switch that turns off playing on the site and gives Google Drive links instead, and a save backup (export and import).

## How it works

**The site.** React, Vite and Tailwind. The source is in `secretv4-launcher-kit/site`. A workflow builds it and commits the result (`index.html` and `assets/`) to the repo root, which is what GitHub Pages serves. You don't build anything by hand.

**The games.** Almost every game is a small HTML launcher page (around 30 KB) that loads the real game files from another GitHub repo through jsDelivr. The launcher pages were collected on Google Drive. A workflow copies them into `games/` and records them in `games/manifest.json`.

When someone clicks a game:

1. If it's in the manifest, it plays in a full-screen player on the site.
2. If it isn't (not copied yet, or too big, like the Eaglercraft clients), a pop-up explains how to download it from Google Drive.
3. If "Google Drive Links Only" is on in Settings, step 2 happens for every game.

**The play counter and ratings (optional).** A Cloudflare Worker with a D1 database counts plays so Featured can show the top 10 for everyone, and stores thumbs up/down votes. Without it, Featured uses each person's own history and ratings are hidden. Each browser gets a random anonymous ID, and only a scrambled copy is stored, to limit it to one vote per game. Nothing is sent to Google Analytics or any similar service.

## Repo layout

```
index.html, assets/          The built site (generated, don't edit)
site-config.js               Settings you can edit without rebuilding
admin.html                   Owner dashboard (not linked from the site)
games/                       Copied game pages and manifest.json
game-zips/                   Drop zips here to unpack them into games/
secretv4-launcher-kit/site/  Source code of the site
tools/                       Scripts used by the workflows
  classify_genres.py           Re-works out genres after games are added
  audit_links.py               Checks every Drive link (names, sizes, dead links)
  mirror_games.py              Copies small game files into games/
  data/                        The game lists the scripts read
.github/workflows/           build-site, mirror-games, audit-links, unpack-games
```

## Everyday tasks

**Change the site.** Edit files under `secretv4-launcher-kit/site/src`. The "Build site" workflow runs on its own, and the change is live a minute or two after it finishes. Hard-refresh to see it.

**Copy games from Drive.** Go to Actions, then Mirror games, then Run workflow. Enter a first file number and how many files. Batches of around 500 work well. Games that are already copied are skipped, so running a range twice is safe. If a run reports failed downloads, run the same batch again.

**Check the links.** Actions, then Audit Drive links. It reports file sizes, dead links and duplicates, and downloads nothing it doesn't need to.

**Change site settings.** Edit `site-config.js`:

| Setting | Does |
|---|---|
| `reportUrl` | Shows a Report button in the game player. A form link or `mailto:` address. |
| `statsUrl` | Address of the play counter Worker. Leave empty to count per device only. |
| `mirrors` | Other addresses of the site, listed in Stuff, then About. |
| `ownerTools` | Set to `false` to stop browsers checking in for the dashboard. |
| `pulseSeconds` | How often an open tab checks in for the dashboard (default 30, minimum 15). |

**Add a game.**
1. Add it to the game lists in `secretv4-launcher-kit/site/src/data/` **and** to the copies in `tools/data/`. The scripts read the copies, so they have to match.
2. Share the Drive file as "Anyone with the link".
3. Run Mirror games over the range that includes it.
4. Optional: run `python3 tools/classify_genres.py secretv4-launcher-kit/site/src/data` to give it genres (fix any wrong ones in `genreOverrides.ts`).
5. If its number is outside the ranges in `GAME_ID_RANGES` at the top of the Worker (`stats-worker.js`), add the range there, or staff can't feature it.

**Give someone admin access.** Ask them to open `admin.html` in the browser they use on SecretV4 and press "Show my browser ID", then send you the ID. In your dashboard open Admins, paste the ID, press Look up and check it is the right person, then Grant Admin. Give them the passphrase that appears (it is shown once). They sign in at `admin.html` with it, in that same browser. Remove access any time from the same page.

## Setup from scratch

1. Turn on GitHub Pages for the repo (deploy from the main branch, root folder).
2. Create a Google Drive API key and save it as a repository secret named `DRIVE_API_KEY` (Settings, then Secrets and variables, then Actions). The key is only used by the workflows and never appears on the site.
3. Run Build site once, then Mirror games over the full range.
4. Optional: set up the play counter. It needs a free Cloudflare account, a D1 database with the tables in `stats-schema.sql`, and a Worker running `stats-worker.js` with the database bound as `DB`. Put the Worker's address in `site-config.js`.
5. Optional, for the staff dashboard: in the Worker's Settings, add a secret named `ADMIN_KEY` (a long random string), then open `admin.html` on your site and sign in with it. Without the secret the dashboard is switched off.

## Known limits

- **Admin sign-in is only as safe as the browser it runs in.** An admin is identified by their browser's anonymous ID plus a passphrase, so copying either one alone does nothing. But the ID lives in browser storage that games hosted on the same site can read, so an attacker who could run code inside a game page and also learn the passphrase could impersonate an admin. That is why admins can only do low-risk, reversible things (Staff Picks, events, announcements, reports), are rate limited, and are logged, and why you can remove access instantly. The owner key is never stored in the browser.
- **Genres are guesses.** They come from game titles and systems, so some are wrong and about a quarter of games have none. Fix them in `genreOverrides.ts`.
- Most games depend on other people's repos on jsDelivr. If one of those goes offline, every game that uses it stops loading. The mirrored launcher pages can't fix that.
- Some games misbehave inside the in-site player, usually ones that rely on service workers, or on a specific page address.
- GitHub's file browser shows only the first 1,000 files in `games/`. The rest are still there and still served.
- Each open tab checks in for the dashboard every 30 seconds, and the Worker's free plan allows 100,000 requests a day for everything (check-ins, plays and ratings). That is roughly 100 browsers open for 8 hours. Raise `pulseSeconds` or set `ownerTools` to `false` if the site gets busier than that.
- The play counter's free tier allows roughly 25,000 counted plays a day. After that it pauses until midnight UTC and the site carries on without it.
- Recent, favorites and settings are stored in the visitor's own browser. The save backup in Settings is the only way to move them.

## About the content

SecretV4 doesn't create these games. They belong to their authors, and the launcher pages only point to where the files already are. If you own something listed here and want it removed, open an issue on this repo.
