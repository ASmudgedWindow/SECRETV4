# SecretV4

A browser game portal: about 2,700 games, a few small tools, and no accounts. It's a static site hosted on GitHub Pages, with an optional free play counter on Cloudflare.

SecretV4 is the fourth version of a project that started as a shared Google Doc of game links. V2 grew to a few hundred games and was shut down. V3 was a Google Sites page.

## What's in it

- **Games:** HTML games, Flash games (run with Ruffle), emulated console games (EmulatorJS), and Eaglercraft clients.
- **Games tab:** search that tolerates typos, categories, favorites, a Recent tab, a Featured tab showing the most played games, thumbs up/down ratings with a "Top rated" sort, and your own Collections (named lists of games).
- **Tools and Stuff tabs:** calculator, timer, notes, password generator, converters, a few small games, a list of outside sites, and a Stats page with personal stats and 10 achievements.
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
games/                       Copied game pages and manifest.json
game-zips/                   Drop zips here to unpack them into games/
secretv4-launcher-kit/site/  Source code of the site
tools/                       Scripts used by the workflows
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

**Add a game.**
1. Add it to the game lists in `secretv4-launcher-kit/site/src/data/` **and** to the copies in `tools/data/`. The scripts read the copies, so they have to match.
2. Share the Drive file as "Anyone with the link".
3. Run Mirror games over the range that includes it.

## Setup from scratch

1. Turn on GitHub Pages for the repo (deploy from the main branch, root folder).
2. Create a Google Drive API key and save it as a repository secret named `DRIVE_API_KEY` (Settings, then Secrets and variables, then Actions). The key is only used by the workflows and never appears on the site.
3. Run Build site once, then Mirror games over the full range.
4. Optional: set up the play counter. It needs a free Cloudflare account, a D1 database with the tables in `stats-schema.sql`, and a Worker running `stats-worker.js` with the database bound as `DB`. Put the Worker's address in `site-config.js`.

## Known limits

- Most games depend on other people's repos on jsDelivr. If one of those goes offline, every game that uses it stops loading. The mirrored launcher pages can't fix that.
- Some games misbehave inside the in-site player, usually ones that rely on service workers, or on a specific page address.
- GitHub's file browser shows only the first 1,000 files in `games/`. The rest are still there and still served.
- The play counter's free tier allows roughly 25,000 counted plays a day. After that it pauses until midnight UTC and the site carries on without it.
- Recent, favorites and settings are stored in the visitor's own browser. The save backup in Settings is the only way to move them.

## About the content

SecretV4 doesn't create these games. They belong to their authors, and the launcher pages only point to where the files already are. If you own something listed here and want it removed, open an issue on this repo.
