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
        time.sleep(3 * (2 ** attempt))
    return "error", {}, "gave up after retries: " + last


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="audit.csv")
    ap.add_argument("--limit", type=int, default=0, help="only check N unique files, spread across the list")
    ap.add_argument("--start", type=int, default=0, help="batch mode: first file number (0 = the beginning)")
    ap.add_argument("--count", type=int, default=0, help="batch mode: how many files to check from --start")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--download", default="", help="folder to save small game files into and scan them")
    a = ap.parse_args()

    entries = load_entries()
    by_src = Counter(e["source"] for e in entries)
    print("Parsed %d entries: %s" % (len(entries), dict(by_src)))
    ids = list(dict.fromkeys(e["drive_id"] for e in entries if e["drive_id"]))
    print("Unique Drive file IDs: %d  | entries without a Drive link: %d" %
          (len(ids), sum(1 for e in entries if not e["drive_id"])))
    if a.count:
        ids = ids[a.start:a.start + a.count]
        print("Batch: files %d to %d (%d files)" % (a.start, a.start + len(ids) - 1, len(ids)))
    elif a.limit:
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
    if not a.limit and not a.count:
        for e in entries:
            if not e["drive_id"]:
                rows.append({**{k: e.get(k, "") for k in FIELDS[:7]}, "status": "not_drive", "error": e["note"]})

    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, FIELDS)
        w.writeheader()
        w.writerows(rows)
    summarize(rows)
    if a.download:
        download_and_scan(rows, key, a.download, a.workers)


MAX_FILE = 5 * 1024 * 1024      # skip anything bigger than 5 MB
MAX_TOTAL = 400 * 1024 * 1024   # stop after 400 MB in total


def fetch_file(did, key):
    url = "https://www.googleapis.com/drive/v3/files/%s?alt=media&supportsAllDrives=true&key=%s" % (did, urllib.parse.quote(key))
    last = ""
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return r.read(), ""
        except urllib.error.HTTPError as e:
            last = "HTTP %d" % e.code
            if e.code in (403, 404):
                return None, last
        except Exception as e:
            last = str(e)
        time.sleep(2 ** attempt)
    return None, last


URL_RE = re.compile(r"https?://([A-Za-z0-9.-]+)(/[^\s\"'<>)\\]*)?")
JSD_RE = re.compile(r"cdn\.jsdelivr\.net/(gh|npm)/([^/@\s\"']+(?:/[^/@\s\"']+)?)")


def scan_html(text):
    hosts = set(m.group(1).lower() for m in URL_RE.finditer(text))
    jsd = set(m.group(1) + "/" + m.group(2) for m in JSD_RE.finditer(text))
    flags = set()
    for name, pat in (("iframe", "<iframe"), ("ruffle", "ruffle"), ("emulatorjs", "EJS_"),
                      ("fetch/XHR", "fetch("), ("cookies/localStorage", "localStorage"),
                      ("base64 data blob", "data:application"), ("service worker", "serviceWorker")):
        if pat.lower() in text.lower():
            flags.add(name)
    return hosts, jsd, flags


def download_and_scan(rows, key, folder, workers):
    os.makedirs(folder, exist_ok=True)
    ok = [r for r in rows if r["status"] == "ok" and r["size_bytes"] and int(r["size_bytes"]) <= MAX_FILE]
    skipped_big = sum(1 for r in rows if r["status"] == "ok" and r["size_bytes"] and int(r["size_bytes"]) > MAX_FILE)
    seen, uniq = set(), []
    for r in ok:
        if r["drive_id"] not in seen:
            seen.add(r["drive_id"])
            uniq.append(r)
    total, fails = 0, 0
    host_files = defaultdict(set)
    jsd_repos = Counter()
    flag_count = Counter()
    per_group = defaultdict(Counter)
    with ThreadPoolExecutor(workers) as ex:
        futs = {ex.submit(fetch_file, r["drive_id"], key): r for r in uniq}
        for f in as_completed(futs):
            r = futs[f]
            data, err = f.result()
            if data is None:
                fails += 1
                continue
            total += len(data)
            if total > MAX_TOTAL:
                print("Stopped: reached the 400 MB safety limit")
                break
            grp = r["source"] if r["source"] in ("library", "eaglercraft", "flash") else "emulated"
            ext = ".html" if r["drive_name"].lower().endswith((".html", ".htm")) else ".bin"
            d = os.path.join(folder, grp)
            os.makedirs(d, exist_ok=True)
            safe = re.sub(r"[^A-Za-z0-9._-]", "_", r["drive_name"] or r["drive_id"])[:60]
            open(os.path.join(d, "%s__%s" % (r["drive_id"][:8], safe)), "wb").write(data)
            hosts, jsd, flags = scan_html(data.decode("utf-8", "replace"))
            for h in hosts:
                host_files[h].add(r["drive_id"])
                per_group[grp][h] += 1
            for j in jsd:
                jsd_repos[j] += 1
            for fl in flags:
                flag_count[fl] += 1
    n = len(uniq) - fails
    out = ["\n## What is inside the downloaded files\n",
           "Downloaded %d files (%s). Failed: %d. Skipped for being over 5 MB: %d.\n" % (n, mb(total), fails, skipped_big)]
    out.append("Files that mention each website (top 15):\n")
    out.append("| Host | Files |\n|---|---|")
    for h, ids in sorted(host_files.items(), key=lambda x: -len(x[1]))[:15]:
        out.append("| %s | %d |" % (h, len(ids)))
    out.append("\nTop jsDelivr sources (top 10):\n")
    for j, c in jsd_repos.most_common(10):
        out.append("- %s: %d files" % (j, c))
    out.append("\nThings found inside the files: %s\n" % dict(flag_count))
    text = "\n".join(out)
    print(text)
    sm = os.environ.get("GITHUB_STEP_SUMMARY")
    if sm:
        open(sm, "a").write(text + "\n")


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
