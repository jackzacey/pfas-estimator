#!/usr/bin/env python3
"""
build_state_pages.py

Generates static, SEO-friendly state-level PFAS drinking-water pages from
the same data.js file that powers the main PFAS Estimator ZIP lookup tool.

Usage:
    python3 build_state_pages.py                 # build + validate + publish
    python3 build_state_pages.py --dry-run        # build + validate only, no publish
    python3 build_state_pages.py --data-js /path/to/data.js --repo-root /path/to/pfas-estimator

Design principles (see README_STATE_PAGES.md for full rationale):
  - data.js is the single source of truth. This script does not re-derive
    statistics via a second, independent pipeline.
  - Per-compound methodology mirrors the frozen AJPH manuscript Table 1
    exactly (see config/thresholds.json), not the simpler blended metric
    the live client-side map uses for its choropleth coloring.
  - Pages are built into a temporary directory and only swapped into the
    live `states/` directory after every validation check passes.
"""

import argparse
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


# ─────────────────────────────────────────────────────────────────────────
# Loading
# ─────────────────────────────────────────────────────────────────────────

def load_data_js(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*const\s+DATA\s*=\s*(\{.*\})\s*;?\s*$", raw, re.DOTALL)
    if not m:
        raise SystemExit(f"FATAL: could not parse {path} as `const DATA = {{...}};`. "
                          f"Has the data.js export format changed?")
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise SystemExit(f"FATAL: data.js content is not valid JSON: {e}")


def load_json(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(f"FATAL: required config file missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def slugify_state(state_name: str) -> str:
    slug = state_name.lower().replace(" ", "-")
    return f"{slug}-pfas-drinking-water"


# ─────────────────────────────────────────────────────────────────────────
# Aggregation (validated against the frozen manuscript national totals:
# 5,059 / 14,071 ZIPs with >=1 exceedance (36.0%), 3,186 of those with >1 (63.0%))
# ─────────────────────────────────────────────────────────────────────────

def compute_state_stats(state_zip_codes, data, thresholds, regulated_for_headline):
    compound_stats = {c: {"detected_zips": 0, "exceed": 0, "levels": []}
                       for c in thresholds if not c.startswith("_")}
    zips_with_exceedance = 0
    zips_with_multi = 0
    systems = set()
    total_records = 0

    for zc in state_zip_codes:
        entries = data[zc]
        n_exceed_this_zip = 0
        for e in entries:
            c, lvl, sysname = e["compound"], e["level"], e["sys"]
            total_records += 1
            systems.add(sysname)
            if c not in compound_stats:
                continue  # unknown compound in dataset not present in config; surfaced by validation
            th = thresholds[c]
            cs = compound_stats[c]
            cs["detected_zips"] += 1
            cs["levels"].append(lvl)
            mode = th["mode"]
            if mode == "detection_is_exceedance":
                cs["exceed"] += 1
            elif mode == "true_exceedance" and lvl >= th["limit"]:
                cs["exceed"] += 1
            elif mode == "evidence_reference_not_regulatory" and lvl >= th["limit"]:
                cs["exceed"] += 1  # framed as "at/above reference," never as "exceedance" in prose

            if c in regulated_for_headline:
                if mode == "detection_is_exceedance":
                    n_exceed_this_zip += 1
                elif mode == "true_exceedance" and lvl >= th["limit"]:
                    n_exceed_this_zip += 1

        if n_exceed_this_zip >= 1:
            zips_with_exceedance += 1
        if n_exceed_this_zip >= 2:
            zips_with_multi += 1

    for c, cs in compound_stats.items():
        cs["mean"] = round(sum(cs["levels"]) / len(cs["levels"]), 4) if cs["levels"] else None
        cs["max"] = round(max(cs["levels"]), 4) if cs["levels"] else None
        del cs["levels"]

    zip_count = len(state_zip_codes)
    return {
        "zip_count": zip_count,
        "zips_with_exceedance": zips_with_exceedance,
        "pct_with_exceedance": round(zips_with_exceedance / zip_count * 100, 1) if zip_count else 0.0,
        "zips_with_multi": zips_with_multi,
        "pct_multi_of_exceedance": round(zips_with_multi / zips_with_exceedance * 100, 1) if zips_with_exceedance else 0.0,
        "total_records": total_records,
        "systems": len(systems),
        "compounds": compound_stats,
    }


def build_zip_state_index(data, zip_to_state, excluded_states):
    """Map state abbrev -> sorted list of ZIP codes in that state."""
    by_state = {}
    unmapped = []
    for zc in data:
        st = zip_to_state.get(zc[:3])
        if not st:
            unmapped.append(zc)
            continue
        if st in excluded_states:
            continue
        by_state.setdefault(st, []).append(zc)
    for st in by_state:
        by_state[st].sort()
    return by_state, unmapped


# ─────────────────────────────────────────────────────────────────────────
# Rendering
# ─────────────────────────────────────────────────────────────────────────

def render_compound_rows(compound_stats, thresholds, zip_count):
    order = ["PFOA", "PFOS", "PFHxS", "PFNA", "HFPO-DA", "PFBS", "Lithium",
             "PFPeA", "PFBA", "PFHpA", "6:2 FTS", "PFDA"]
    rows = []
    for c in order:
        cs = compound_stats.get(c)
        if not cs or cs["detected_zips"] == 0:
            continue
        th = thresholds[c]
        mode = th["mode"]
        detected = cs["detected_zips"]
        pct_of_state = round(detected / zip_count * 100, 1) if zip_count else 0

        if mode in ("detection_is_exceedance",):
            threshold_txt = f'{th["limit"]} \u00b5g/L ({th["label"]})'
            exceed_txt = f'{cs["exceed"]} ({round(cs["exceed"]/detected*100,1)}%) &mdash; all detections at/above limit by construction'
        elif mode == "true_exceedance":
            threshold_txt = f'{th["limit"]} \u00b5g/L ({th["label"]})'
            exceed_txt = f'{cs["exceed"]} ({round(cs["exceed"]/detected*100,1)}% of detected)'
        elif mode == "hi_reference_no_exceedance":
            threshold_txt = f'{th["limit"]} \u00b5g/L ({th["label"]})'
            exceed_txt = "not calculated&sup1;"
        elif mode == "evidence_reference_not_regulatory":
            threshold_txt = f'{th["limit"]} \u00b5g/L (reference, not a regulatory limit)'
            exceed_txt = f'{cs["exceed"]} ({round(cs["exceed"]/detected*100,1)}%) at/above reference'
        else:
            threshold_txt = "&mdash; (no federal limit)"
            exceed_txt = "&mdash;"

        rows.append(
            f"          <tr><td>{c}</td><td>{threshold_txt}</td>"
            f"<td>{detected} ({pct_of_state}% of state)</td>"
            f"<td>{exceed_txt}</td>"
            f"<td>{cs['mean']} \u00b5g/L</td>"
            f"<td>{cs['max']} \u00b5g/L</td></tr>"
        )
    return "\n".join(rows)


def render_zip_rows(state_zip_codes, data, thresholds, regulated_for_headline, base_url, max_rows=2000):
    rows = []
    for zc in state_zip_codes[:max_rows]:
        entries = data[zc]
        n_exceed = 0
        for e in entries:
            c, lvl = e["compound"], e["level"]
            if c not in regulated_for_headline:
                continue
            th = thresholds[c]
            if th["mode"] == "detection_is_exceedance":
                n_exceed += 1
            elif th["mode"] == "true_exceedance" and lvl >= th["limit"]:
                n_exceed += 1
        status = f'<span style="color:var(--warn-strong); font-weight:500;">Yes ({n_exceed})</span>' if n_exceed > 0 else "No"
        rows.append(
            f'          <tr><td><a href="{base_url}/?zip={zc}">{zc}</a></td>'
            f'<td>{len(entries)}</td><td>{status}</td></tr>'
        )
    if len(state_zip_codes) > max_rows:
        rows.append(f'          <tr><td colspan="3" style="text-align:center; color:#999;">'
                     f'...and {len(state_zip_codes) - max_rows} more ZIP codes. '
                     f'Use the main lookup tool to check a specific ZIP.</td></tr>')
    return "\n".join(rows)


def render_page(template, tokens: dict) -> str:
    out = template
    for k, v in tokens.items():
        out = out.replace("{{" + k + "}}", str(v))
    return out


# ─────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────

def validate_build(pages: dict, state_stats: dict, national_totals: dict) -> list:
    """Returns a list of problem strings. Empty list == safe to publish."""
    problems = []
    seen_canonical = set()

    for slug, html in pages.items():
        if "undefined" in html or "NaN" in html:
            problems.append(f"{slug}: contains placeholder 'undefined'/'NaN' text")
        leftover = re.findall(r"\{\{[A-Z_]+\}\}", html)
        if leftover:
            problems.append(f"{slug}: unresolved template token(s): {sorted(set(leftover))}")
        m = re.search(r'<link rel="canonical" href="([^"]*)"', html)
        if not m or not m.group(1):
            problems.append(f"{slug}: missing or empty canonical URL")
        else:
            canon = m.group(1)
            if canon in seen_canonical:
                problems.append(f"{slug}: duplicate canonical URL {canon}")
            seen_canonical.add(canon)
        title_matches = re.findall(r"<title>([^<]*)</title>", html)
        if len(title_matches) != 1 or not title_matches[0].strip():
            problems.append(f"{slug}: missing or malformed <title>")

    for st, stats in state_stats.items():
        if not (0 <= stats["pct_with_exceedance"] <= 100):
            problems.append(f"{st}: pct_with_exceedance out of range: {stats['pct_with_exceedance']}")
        if not (0 <= stats["pct_multi_of_exceedance"] <= 100):
            problems.append(f"{st}: pct_multi_of_exceedance out of range: {stats['pct_multi_of_exceedance']}")
        if stats["zips_with_multi"] > stats["zips_with_exceedance"]:
            problems.append(f"{st}: zips_with_multi ({stats['zips_with_multi']}) exceeds "
                             f"zips_with_exceedance ({stats['zips_with_exceedance']})")
        for c, cs in stats["compounds"].items():
            if cs["detected_zips"] > stats["zip_count"]:
                problems.append(f"{st}/{c}: detected_zips ({cs['detected_zips']}) exceeds "
                                 f"state zip_count ({stats['zip_count']})")
            if cs["exceed"] > cs["detected_zips"]:
                problems.append(f"{st}/{c}: exceed count exceeds detected_zips")

    total_zip_count = sum(s["zip_count"] for s in state_stats.values())
    total_exceed = sum(s["zips_with_exceedance"] for s in state_stats.values())
    total_multi = sum(s["zips_with_multi"] for s in state_stats.values())
    if total_zip_count != national_totals["zip_count"]:
        problems.append(f"National zip_count mismatch: states sum to {total_zip_count}, "
                         f"expected {national_totals['zip_count']}")
    if total_exceed != national_totals["zips_with_exceedance"]:
        problems.append(f"National exceedance mismatch: states sum to {total_exceed}, "
                         f"expected {national_totals['zips_with_exceedance']}")
    if total_multi != national_totals["zips_with_multi"]:
        problems.append(f"National multi-exceedance mismatch: states sum to {total_multi}, "
                         f"expected {national_totals['zips_with_multi']}")

    return problems


# ─────────────────────────────────────────────────────────────────────────
# Sitemap
# ─────────────────────────────────────────────────────────────────────────

def merge_sitemap(existing_path: Path, base_url: str, state_slugs: list, lastmod: str,
                  methodology_lastmod: str) -> str:
    urls = []
    seen = set()
    if existing_path.exists():
        existing = existing_path.read_text(encoding="utf-8")
        for m in re.finditer(r"<loc>([^<]+)</loc>", existing):
            loc = m.group(1)
            if loc not in seen:
                urls.append(loc)
                seen.add(loc)
    for top_level_url in (
        f"{base_url}/",
        f"{base_url}/methodology/",
        f"{base_url}/states/",
    ):
        if top_level_url not in seen:
            urls.append(top_level_url)
            seen.add(top_level_url)
    for slug in state_slugs:
        loc = f"{base_url}/states/{slug}/"
        if loc not in seen:
            urls.append(loc)
            seen.add(loc)

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc in urls:
        if loc == f"{base_url}/":
            priority = "1.0"
        elif loc == f"{base_url}/methodology/":
            priority = "0.9"
        elif loc == f"{base_url}/states/":
            priority = "0.8"
        else:
            priority = "0.6"
        url_lastmod = methodology_lastmod if loc == f"{base_url}/methodology/" else lastmod
        lines.append(f"  <url><loc>{loc}</loc><lastmod>{url_lastmod}</lastmod>"
                      f"<changefreq>monthly</changefreq><priority>{priority}</priority></url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".", help="Path to the pfas-estimator repo root")
    ap.add_argument("--data-js", default=None, help="Override path to data.js")
    ap.add_argument("--dry-run", action="store_true", help="Build and validate only, do not publish")
    args = ap.parse_args()

    repo_root = Path(args.repo_root).resolve()
    data_js_path = Path(args.data_js) if args.data_js else repo_root / "data.js"

    thresholds = load_json(SCRIPT_DIR / "config" / "thresholds.json")
    state_names = load_json(SCRIPT_DIR / "config" / "state_names.json")
    zip_to_state = load_json(SCRIPT_DIR / "config" / "zip_to_state.json")
    site_meta = load_json(SCRIPT_DIR / "config" / "site_meta.json")
    template = (SCRIPT_DIR / "templates" / "state_page_template.html").read_text(encoding="utf-8")

    regulated_for_headline = thresholds["_regulated_for_headline"]
    excluded = set(site_meta.get("excluded_from_generation", []))
    base_url = site_meta["base_url"]
    data_updated_label = site_meta["data_updated_label"]
    lastmod = site_meta["dataset_lastmod"]
    methodology_lastmod = site_meta.get("methodology_lastmod", lastmod)

    print(f"Loading dataset from {data_js_path} ...")
    data = load_data_js(data_js_path)
    print(f"  {len(data)} ZIP codes, {sum(len(v) for v in data.values())} compound-level records")

    by_state, unmapped = build_zip_state_index(data, zip_to_state, excluded)
    if unmapped:
        print(f"WARNING: {len(unmapped)} ZIP code(s) have no state mapping and were skipped "
              f"from ALL state pages: {unmapped}")

    included_zips = [zc for zips in by_state.values() for zc in zips]
    excluded_zip_count = len(data) - len(included_zips) - len(unmapped)
    print(f"  {len(included_zips)} ZIPs included in generation, "
          f"{excluded_zip_count} excluded (e.g. Guam), {len(unmapped)} unmapped")
    national_totals = compute_state_stats(included_zips, data, thresholds, regulated_for_headline)

    pages = {}
    state_stats = {}
    index_rows = []

    for abbrev in sorted(by_state.keys()):
        state_name = state_names.get(abbrev)
        if not state_name:
            print(f"WARNING: no display name configured for '{abbrev}', skipping")
            continue
        zips = by_state[abbrev]
        stats = compute_state_stats(zips, data, thresholds, regulated_for_headline)
        state_stats[abbrev] = stats
        slug = slugify_state(state_name)

        title = f"PFAS in {state_name} Drinking Water | PFAS Estimator"
        meta_description = (
            f"Explore EPA UCMR 5 PFAS drinking-water monitoring results for {state_name}, "
            f"including ZIP-level detections, observed concentrations, and federal threshold "
            f"context across {stats['zip_count']} ZIP codes."
        )
        canonical = f"{base_url}/states/{slug}/"
        structured_data = json.dumps({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": title,
            "url": canonical,
            "description": meta_description,
            "isPartOf": {"@id": f"{base_url}/#website"},
            "about": {"@id": f"{base_url}/#dataset"},
            "dateModified": lastmod,
        }, ensure_ascii=False)

        tokens = {
            "TITLE": title,
            "META_DESCRIPTION": meta_description,
            "CANONICAL_URL": canonical,
            "BASE_URL": base_url,
            "STRUCTURED_DATA_JSON": structured_data,
            "STATE_NAME": state_name,
            "ZIP_COUNT": stats["zip_count"],
            "PCT_EXCEED": stats["pct_with_exceedance"],
            "ZIPS_EXCEED": stats["zips_with_exceedance"],
            "ZIPS_MULTI": stats["zips_with_multi"],
            "PCT_MULTI": stats["pct_multi_of_exceedance"],
            "DATA_UPDATED_LABEL": data_updated_label,
            "EXAMPLE_ZIP": zips[0],
            "COMPOUND_TABLE_ROWS": render_compound_rows(stats["compounds"], thresholds, stats["zip_count"]),
            "ZIP_TABLE_ROWS": render_zip_rows(zips, data, thresholds, regulated_for_headline, base_url),
            "AGENCY_LINK_ROW": "",  # stubbed; see config/site_meta.json for how to add later
        }
        pages[slug] = render_page(template, tokens)
        index_rows.append((state_name, slug, stats))

    # State index page
    index_items = "\n".join(
        f'        <li><a href="{base_url}/states/{slug}/">{name}</a> '
        f'&mdash; {stats["zip_count"]} ZIP codes, {stats["pct_with_exceedance"]}% at/above threshold</li>'
        for name, slug, stats in sorted(index_rows)
    )
    states_index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PFAS Drinking Water by State | PFAS Estimator</title>
<meta name="description" content="Browse EPA UCMR 5 PFAS drinking-water monitoring results by state, covering {len(index_rows)} states and territories in the PFAS Estimator national dataset." />
<link rel="canonical" href="{base_url}/states/" />
<link rel="stylesheet" href="{base_url}/styles.css" />
</head>
<body>
<div class="page-wrapper" style="justify-content:center;">
  <div class="card" style="max-width:900px;">
    <nav class="site-nav" aria-label="Site">
      <a href="{base_url}/">Home</a>
      <a href="{base_url}/states/" aria-current="page">Explore by State</a>
      <a href="{base_url}/methodology/">Methodology</a>
    </nav>
    <span class="badge">EPA UCMR 5 Data &middot; All States</span>
    <h1>PFAS Drinking Water Monitoring by State</h1>
    <p class="subtitle">EPA UCMR 5 drinking-water monitoring results linked to ZIP codes, summarized for {len(index_rows)} states and territories. Data updated: {data_updated_label}.</p>
    <ul style="font-size:14px; line-height:2; padding-left:1.2rem;">
{index_items}
    </ul>
    <p style="font-size:12px; color:#8b969b; margin-top:1.5rem;">{site_meta.get("exclusion_reason", {}).get("GU", "")}</p>
  </div>
</div>
</body>
</html>
"""

    print(f"\nGenerated {len(pages)} state pages + 1 state index.")

    problems = validate_build(pages, state_stats, national_totals)
    if problems:
        print(f"\nVALIDATION FAILED ({len(problems)} problem(s)); NOT publishing:")
        for p in problems:
            print(f"  - {p}")
        sys.exit(1)
    print("\nAll validation checks passed:")
    print(f"  - National totals reconcile: {national_totals['zip_count']} ZIPs, "
          f"{national_totals['zips_with_exceedance']} with >=1 exceedance, "
          f"{national_totals['zips_with_multi']} with >1")
    print(f"  - No duplicate canonical URLs, no placeholder values, all percentages in range")

    if args.dry_run:
        print("\n--dry-run set: build validated, nothing written to the live states/ directory.")
        return

    # Build into temp dir, then swap
    tmp_dir = repo_root / "states_build_tmp"
    live_dir = repo_root / "states"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir(parents=True)
    for slug, html in pages.items():
        page_dir = tmp_dir / slug
        page_dir.mkdir(parents=True)
        (page_dir / "index.html").write_text(html, encoding="utf-8")
    (tmp_dir / "index.html").write_text(states_index_html, encoding="utf-8")

    if live_dir.exists():
        stale = [p.name for p in live_dir.iterdir() if p.is_dir() and p.name not in pages]
        if stale:
            print(f"\nNOTE: removing {len(stale)} stale generated page(s) no longer in the dataset: {stale}")
        shutil.rmtree(live_dir)
    tmp_dir.rename(live_dir)

    sitemap_path = repo_root / "sitemap.xml"
    merged = merge_sitemap(
        sitemap_path,
        base_url,
        sorted(pages.keys()),
        lastmod,
        methodology_lastmod,
    )
    sitemap_path.write_text(merged, encoding="utf-8")

    print(f"\nPublished {len(pages)} state pages to {live_dir}")
    print(f"Updated {sitemap_path}")


if __name__ == "__main__":
    main()
