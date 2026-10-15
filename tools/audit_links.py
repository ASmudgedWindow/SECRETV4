#!/usr/bin/env python3
"""
SecretV4 link audit (metadata only, downloads NO game files).

For every Google Drive link in the site's data files it asks the Drive API:
what is this file called, how big is it, is it still there, is it shared publicly?
Then it writes audit.csv and prints a summary.

Needs only Python 3 (no pip installs). The API key comes from the DRIVE_API_KEY
environment variable and is never written to any file.

Usage:
  python3 tools/audit_links.py --dry-run          # parse links only, no network
  python3 tools/audit_links.py --limit 25         # test batch
  python3 tools/audit_links.py                    # everything
Re-running resumes: IDs already in the output CSV are skipped.
"""
import argparse, csv, json, os, re, sys, time, urllib.request, urllib.error, urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
STR = r'"((?:[^"\\]|\\.)*)"'
FIELDS = ["source", "id", "title", "kind", "system", "drive_id", "expected_name",
          "status", "drive_name", "mime", "size_bytes", "md5", "trashed", "error"]


def drive_id(url_or_id):
    m = re.search(r"/d/([\w-]+)", url_or_id) or re.search(r"[?&]id=([\w-]+)", url_or_id)
    if m:
        return m.group(1)
    return url_or_id if re.fullmatch(r"[\w-]{20,}", url_or_id) else None


def unesc(s):
    return s.replace('\\"', '"').replace("\\'", "'").replace("\\\\", "\\")


def load_entries():
    entries = []
    names = {}
    txt = open(os.path.join(DATA, "gameNames.ts"), encoding="utf-8").read()
    for m in re.finditer(r"^\s*(\d+):\s*" + STR, txt, re.M):
        names[int(m.group(1))] = unesc(m.group(2))
    for g in json.load(open(os.path.join(DATA, "secretv4_games.json"), encoding="utf-8")):
        did = drive_id(g.get("url", ""))
        entries.append(dict(source="library", id=g["id"], title=names.get(g["id"], g.get("title", "")),
                            kind="html", system="", drive_id=did,
                            expected_name=g.get("original_link_text", ""),
                            note="" if did else "not a Drive link: " + g.get("url", "")))
    txt = open(os.path.join(DATA, "eaglercraft.ts"), encoding="utf-8").read()
    for m in re.finditer(r"id:\s*(\d+),\s*title:\s*" + STR + r",\s*url:\s*" + STR, txt):
        entries.append(dict(source="eaglercraft", id=int(m.group(1)), title=unesc(m.group(2)), kind="html",
                            system="", drive_id=drive_id(m.group(3)), expected_name="", note=""))
    txt = open(os.path.join(DATA, "extraGames.ts"), encoding="utf-8").read()
    for m in re.finditer(r"id:\s*(\d+),\s*title:\s*" + STR + r",\s*kind:\s*'(\w+)',\s*system:\s*" + STR +
                         r",\s*file:\s*" + STR, txt):
        entries.append(dict(source=m.group(3), id=int(m.group(1)), title=unesc(m.group(2)), kind=m.group(3),
                            system=unesc(m.group(4)), drive_id=drive_id(m.group(5)), expected_name="", note=""))
    return entries


def query(did, key):
    url = ("https://www.googleapis.com/drive/v3/files/%s?supportsAllDrives=true&fields=%s&key=%s" %
           (did, urllib.parse.quote("id,name,mimeType,size,md5Checksum,trashed"), urllib.parse.quote(key)))
    last = "unknown"
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return "ok", json.load(r), ""
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code == 404:
                return "not_found", {}, "deleted, or not shared publicly"
            if e.code in (403, 429, 500, 502, 503):
                if e.code == 403 and "rateLimit" not in body and "quota" not in body.lower():
                    return "forbidden", {}, body.replace("\n", " ")
                last = "HTTP %d" % e.code
            else:
                return "error", {}, "HTTP %d %s" % (e.code, body.replace("\n", " "))
        except Exception as e:  # network hiccup
            last = str(e)
        time.sleep(2 ** attempt)
    return "error", {}, "gave up after retries: " + last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="audit.csv")
    ap.add_argument("--limit", type=int, default=0, help="only check N unique files, spread across the list")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    entries = load_entries()
    by_src = Counter(e["source"] for e in entries)
    print("Parsed %d entries: %s" % (len(entries), dict(by_src)))
    ids = list(dict.fromkeys(e["drive_id"] for e in entries if e["drive_id"]))
    print("Unique Drive file IDs: %d  | entries without a Drive link: %d" %
          (len(ids), sum(1 for e in entries if not e["drive_id"])))
    if a.limit:
        step = max(1, len(ids) // a.limit)
        ids = ids[::step][:a.limit]
        print("Test batch: checking %d files" % len(ids))
    if a.dry_run:
        return

    key = os.environ.get("DRIVE_API_KEY", "").strip()
    if not key:
        sys.exit("Set the DRIVE_API_KEY environment variable first.")

    done = {}
    if os.path.exists(a.out):
        for row in csv.DictReader(open(a.out, encoding="utf-8")):
            if row["status"] in ("ok", "not_found", "forbidden"):
                done[row["drive_id"]] = row
    todo = [i for i in ids if i not in done]
    print("Already done: %d | to check now: %d" % (len(done), len(todo)))

    results = {}
    with ThreadPoolExecutor(a.workers) as ex:
        futs = {ex.submit(query, i, key): i for i in todo}
        for n, f in enumerate(as_completed(futs), 1):
            results[futs[f]] = f.result()
            if n % 100 == 0:
                print("  checked %d / %d" % (n, len(todo)), flush=True)

    keep = set(ids)
    rows = []
    for e in entries:
        did = e["drive_id"]
        if not did or did not in keep:
            continue
        if did in results:
            st, meta, err = results[did]
            row = dict(status=st, drive_name=meta.get("name", ""), mime=meta.get("mimeType", ""),
                       size_bytes=meta.get("size", ""), md5=meta.get("md5Checksum", ""),
                       trashed=meta.get("trashed", ""), error=err)
        else:
            old = done[did]
            row = {k: old.get(k, "") for k in ("status", "drive_name", "mime", "size_bytes", "md5", "trashed", "error")}
        rows.append({**{k: e.get(k, "") for k in FIELDS[:7]}, **row})
    if not a.limit:
        for e in entries:
            if not e["drive_id"]:
                rows.append({**{k: e.get(k, "") for k in FIELDS[:7]}, "status": "not_drive", "error": e["note"]})

    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, FIELDS)
        w.writeheader()
        w.writerows(rows)
    summarize(rows)


def mb(n):
    return "%.1f MB" % (n / 1e6)


def summarize(rows):
    out = []
    p = out.append
    p("## SecretV4 audit summary\n")
    p("| Group | Entries | OK | Missing / private | Total size | Largest |")
    p("|---|---|---|---|---|---|")
    groups = defaultdict(list)
    for r in rows:
        g = r["source"] if r["source"] in ("library", "eaglercraft", "flash") else "emulated ROMs"
        groups[g].append(r)
    grand = 0
    for g, rs in groups.items():
        ok = [r for r in rs if r["status"] == "ok"]
        sizes = [int(r["size_bytes"]) for r in ok if r["size_bytes"]]
        grand += sum(sizes)
        p("| %s | %d | %d | %d | %s | %s |" % (g, len(rs), len(ok), len(rs) - len(ok), mb(sum(sizes)),
                                              mb(max(sizes)) if sizes else "-"))
    p("\nTotal size of everything found: **%s**\n" % mb(grand))
    p("Status counts: %s\n" % dict(Counter(r["status"] for r in rows)))
    seen, dup = {}, 0
    for r in rows:
        if r["md5"]:
            if r["md5"] in seen and seen[r["md5"]] != r["drive_id"]:
                dup += 1
            seen.setdefault(r["md5"], r["drive_id"])
    p("Different Drive IDs with identical content (duplicate files): %d" % dup)
    lib = [r for r in rows if r["source"] == "library" and r["status"] == "ok"]
    odd = [r for r in lib if not r["drive_name"].lower().endswith((".html", ".htm"))]
    p("Library files that are NOT .html/.htm (need a closer look): %d" % len(odd))
    p("\nFile types found: %s\n" % dict(Counter(r["mime"] for r in rows if r["status"] == "ok").most_common(8)))
    big = [r for r in rows if r["size_bytes"] and int(r["size_bytes"]) > 25e6]
    huge = [r for r in rows if r["size_bytes"] and int(r["size_bytes"]) > 100e6]
    p("Files over 25 MB: %d | over 100 MB (too big for GitHub): %d" % (len(big), len(huge)))
    text = "\n".join(out)
    print("\n" + text)
    sm = os.environ.get("GITHUB_STEP_SUMMARY")
    if sm:
        open(sm, "a").write(text + "\n")


if __name__ == "__main__":
    main()
