#!/usr/bin/env python3
"""
SecretV4 mirror: copies the SMALL game files from Google Drive into the repo's games/ folder,
removes analytics trackers, and records everything in games/manifest.json.

Big files (over --max-mb) are NOT copied; they stay "drive" entries in the manifest.
Uses the same batch numbering as audit_links.py (--start / --count).
The API key comes from the DRIVE_API_KEY environment variable.
"""
import argparse, json, os, re, sys, time, urllib.request, urllib.error, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audit_links as A

# Things that report visitors to someone else. Only the <script> tags that load them are removed.
TRACKERS = [rb"googletagmanager\.com", rb"google-analytics\.com", rb"static\.cloudflareinsights\.com",
            rb"clarity\.ms", rb"hotjar\.com"]
SCRIPT_RE = re.compile(rb"<script\b[^>]*\bsrc=[\"'][^\"']*(?:%s)[^\"']*[\"'][^>]*>\s*</script>" % rb"|".join(TRACKERS),
                       re.I | re.S)


def strip_trackers(data):
    out, n = SCRIPT_RE.subn(b"", data)
    return out, n


def fetch_robust(did, key):
    url = "https://www.googleapis.com/drive/v3/files/%s?alt=media&supportsAllDrives=true&key=%s" % (did, urllib.parse.quote(key))
    last = ""
    for attempt in range(7):
        try:
            with urllib.request.urlopen(url, timeout=90) as r:
                return r.read(), ""
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            last = "HTTP %d" % e.code
            if e.code == 404 or (e.code == 403 and "notFound" in body):
                return None, "not found / private"
            if e.code == 403 and not any(w in body for w in ("rateLimit", "quota", "Quota", "RateLimit")):
                return None, "HTTP 403 " + body[:150].replace("\n", " ")
        except Exception as e:
            last = str(e)
        time.sleep(min(60, 5 * 2 ** attempt))
    return None, "gave up: " + last


def safe_name(name, did):
    name = re.sub(r"[^A-Za-z0-9._-]", "_", name or "")[:80]
    if not name or name.startswith("."):
        name = did + ".html"
    return name


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--count", type=int, default=500)
    ap.add_argument("--out-dir", default="games")
    ap.add_argument("--max-mb", type=float, default=25)
    ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args()

    key = os.environ.get("DRIVE_API_KEY", "").strip()
    if not key:
        sys.exit("Set the DRIVE_API_KEY environment variable first.")
    entries = A.load_entries()
    all_ids = list(dict.fromkeys(e["drive_id"] for e in entries if e["drive_id"]))
    ids = all_ids[a.start:a.start + a.count]
    print("Batch: files %d to %d (%d files)" % (a.start, a.start + len(ids) - 1, len(ids)))

    os.makedirs(a.out_dir, exist_ok=True)
    mpath = os.path.join(a.out_dir, "manifest.json")
    manifest = {}
    if os.path.exists(mpath):
        for g in json.load(open(mpath, encoding="utf-8")).get("games", []):
            manifest[g["id"]] = g
    used = {g["file"]: g["drive_id"] for g in manifest.values() if g.get("file")}
    max_bytes = int(a.max_mb * 1024 * 1024)

    def work(did):
        st, meta, err = A.query(did, key)
        if st != "ok":
            return did, dict(mode="missing", note=err or st), None
        size = int(meta.get("size", 0) or 0)
        base = dict(drive_name=meta.get("name", ""), size=size)
        if size > max_bytes:
            return did, dict(mode="drive", note="over %g MB: keep on Drive" % a.max_mb, **base), None
        data, err = fetch_robust(did, key)
        if data is None:
            return did, dict(mode="failed", note=err, **base), None
        return did, dict(mode="local", **base), data

    results = {}
    with ThreadPoolExecutor(a.workers) as ex:
        futs = [ex.submit(work, i) for i in ids]
        for n, f in enumerate(as_completed(futs), 1):
            did, info, data = f.result()
            results[did] = (info, data)
            if n % 50 == 0:
                print("  processed %d / %d" % (n, len(ids)), flush=True)

    counts = {"local": 0, "drive": 0, "missing": 0, "failed": 0}
    stripped = 0
    saved = {}   # drive_id -> relative filename
    for did in ids:
        info, data = results[did]
        rec = dict(info)
        if info["mode"] == "local":
            data, n = strip_trackers(data)
            stripped += n
            if n:
                rec["trackers_removed"] = n
            fname = safe_name(info["drive_name"], did)
            if used.get(fname, did) != did:
                fname = did[:8] + "_" + fname
            used[fname] = did
            open(os.path.join(a.out_dir, fname), "wb").write(data)
            text = data.decode("utf-8", "replace")
            hosts, jsd, flags = A.scan_html(text)
            rec["file"] = fname
            rec["depends_on"] = sorted(jsd)
            rec["uses"] = sorted(flags - {"iframe"})
            saved[did] = fname
        counts[rec["mode"]] += 1
        results[did] = rec

    for e in entries:
        did = e["drive_id"]
        if did in results:
            rec = results[did]
            manifest[e["id"]] = dict(id=e["id"], title=e["title"], kind=e["kind"], system=e["system"],
                                     category=e["source"], drive_id=did,
                                     drive_url="https://drive.google.com/file/d/%s/view" % did,
                                     file=rec.get("file"), mode=rec["mode"],
                                     size=rec.get("size", 0), depends_on=rec.get("depends_on", []),
                                     uses=rec.get("uses", []), note=rec.get("note", ""))
    games = sorted(manifest.values(), key=lambda g: g["id"])
    json.dump({"generated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()), "count": len(games),
               "games": games}, open(mpath, "w", encoding="utf-8"), indent=1)

    text = ["## Mirror result (files %d to %d)\n" % (a.start, a.start + len(ids) - 1),
            "- Copied into games/: **%d**" % counts["local"],
            "- Kept on Drive (too big): %d" % counts["drive"],
            "- Missing or private: %d" % counts["missing"],
            "- Failed to download (re-run this batch to retry): %d" % counts["failed"],
            "- Tracker scripts removed: %d" % stripped,
            "- Entries in manifest.json so far: %d" % len(games)]
    print("\n" + "\n".join(text))
    sm = os.environ.get("GITHUB_STEP_SUMMARY")
    if sm:
        open(sm, "a").write("\n".join(text) + "\n")


if __name__ == "__main__":
    main()
