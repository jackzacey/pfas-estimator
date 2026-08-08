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

STATE_REGIONS = {
    "CT": "Northeast", "ME": "Northeast", "MA": "Northeast", "NH": "Northeast",
    "RI": "Northeast", "VT": "Northeast", "NJ": "Northeast", "NY": "Northeast",
    "PA": "Northeast",
    "IL": "Midwest", "IN": "Midwest", "MI": "Midwest", "OH": "Midwest",
    "WI": "Midwest", "IA": "Midwest", "KS": "Midwest", "MN": "Midwest",
    "MO": "Midwest", "NE": "Midwest", "ND": "Midwest", "SD": "Midwest",
    "DE": "South", "FL": "South", "GA": "South", "MD": "South", "NC": "South",
    "SC": "South", "VA": "South", "DC": "South", "WV": "South", "AL": "South",
    "KY": "South", "MS": "South", "TN": "South", "AR": "South", "LA": "South",
    "OK": "South", "TX": "South",
    "AZ": "West", "CO": "West", "ID": "West", "MT": "West", "NV": "West",
    "NM": "West", "UT": "West", "WY": "West", "AK": "West", "CA": "West",
    "HI": "West", "OR": "West", "WA": "West",
    "PR": "Territories",
}
REGION_ORDER = ("Northeast", "Midwest", "South", "West", "Territories")


def render_state_index_regions(index_rows, base_url):
    """Render accessible, searchable state cards grouped by U.S. Census region."""
    by_region = {region: [] for region in REGION_ORDER}
    missing_regions = []

    for name, abbrev, slug, stats in sorted(index_rows):
        region = STATE_REGIONS.get(abbrev)
        if not region:
            missing_regions.append(abbrev)
            continue
        by_region[region].append((name, abbrev, slug, stats))

    if missing_regions:
        raise SystemExit(
            "FATAL: state index region mapping missing for: " + ", ".join(missing_regions)
        )

    sections = []
    for region in REGION_ORDER:
        region_slug = region.lower().replace(" ", "-")
        cards = []
        for name, abbrev, slug, stats in by_region[region]:
            pct = stats["pct_with_exceedance"]
            zip_count = stats["zip_count"]
            cards.append(f'''          <article class="state-directory-card" data-state-card data-region="{region_slug}" data-state-search="{name.lower()} {abbrev.lower()}">
            <a href="{base_url}/states/{slug}/" aria-label="View PFAS monitoring results for {name}">
              <div class="state-directory-card-top">
                <span class="state-abbreviation" aria-hidden="true">{abbrev}</span>
                <span class="state-card-region">{region}</span>
              </div>
              <h3>{name}</h3>
              <div class="state-card-stat">
                <strong>{pct}%</strong>
                <span>of represented ZIPs at or above a comparison threshold</span>
              </div>
              <div class="state-card-bar" aria-hidden="true"><span style="width:{pct}%"></span></div>
              <div class="state-card-footer">
                <span>{zip_count:,} represented ZIPs</span>
                <span class="state-card-link">View data <span aria-hidden="true">&rarr;</span></span>
              </div>
            </a>
          </article>''')

        sections.append(f'''      <section class="state-region" data-region-section="{region_slug}" aria-labelledby="region-{region_slug}">
        <div class="state-region-heading">
          <h2 id="region-{region_slug}">{region}</h2>
          <span>{len(cards)} {"page" if len(cards) == 1 else "pages"}</span>
        </div>
        <div class="state-directory-grid">
{chr(10).join(cards)}
        </div>
      </section>''')

    return "\n".join(sections)

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
                  methodology_lastmod: str, states_index_lastmod: str) -> str:
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
        f"{base_url}/map/",
        f"{base_url}/state-table/",
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
        elif loc in (f"{base_url}/map/", f"{base_url}/state-table/", f"{base_url}/states/"):
            priority = "0.8"
        else:
            priority = "0.6"
        if loc == f"{base_url}/methodology/":
            url_lastmod = methodology_lastmod
        elif loc in (f"{base_url}/map/", f"{base_url}/state-table/", f"{base_url}/states/"):
            url_lastmod = states_index_lastmod
        else:
            url_lastmod = lastmod
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
    states_index_lastmod = site_meta.get("states_index_lastmod", lastmod)

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
        index_rows.append((state_name, abbrev, slug, stats))

    # State index page
    state_region_sections = render_state_index_regions(index_rows, base_url)
    index_structured_data = json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "@id": f"{base_url}/states/#page",
                "url": f"{base_url}/states/",
                "name": "PFAS Drinking Water Monitoring by State | PFAS Estimator",
                "description": (
                    "Browse EPA UCMR 5 public drinking-water monitoring results across "
                    f"{len(index_rows)} state and territory pages."
                ),
                "isPartOf": {"@id": f"{base_url}/#website"},
                "about": {"@id": f"{base_url}/#dataset"},
                "dateModified": states_index_lastmod,
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "PFAS Estimator", "item": f"{base_url}/"},
                    {"@type": "ListItem", "position": 2, "name": "Explore by State", "item": f"{base_url}/states/"},
                ],
            },
        ],
    }, ensure_ascii=False)
    states_index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PFAS Drinking Water Monitoring by State | PFAS Estimator</title>
  <meta name="description" content="Browse EPA UCMR 5 public drinking-water monitoring results across {len(index_rows)} state and territory pages, with ZIP-level detections, concentrations, and federal threshold context." />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <link rel="canonical" href="{base_url}/states/" />
  <meta name="author" content="Jack Zhang" />
  <meta name="theme-color" content="#175E97" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="PFAS Estimator" />
  <meta property="og:title" content="PFAS Drinking Water Monitoring by State | PFAS Estimator" />
  <meta property="og:description" content="Explore EPA UCMR 5 public drinking-water monitoring summaries across {len(index_rows)} state and territory pages." />
  <meta property="og:url" content="{base_url}/states/" />
  <meta property="og:image" content="{base_url}/pfas-estimator-social.png" />
  <meta property="og:image:alt" content="PFAS Estimator state drinking-water monitoring directory" />
  <meta property="og:locale" content="en_US" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="PFAS Drinking Water Monitoring by State | PFAS Estimator" />
  <meta name="twitter:description" content="Explore EPA UCMR 5 public drinking-water monitoring summaries by state and territory." />
  <meta name="twitter:image" content="{base_url}/pfas-estimator-social.png" />

  <script type="application/ld+json">
  {index_structured_data}
  </script>

  <link rel="stylesheet" href="/styles.css?v=20260807-state-bar-repair" />

  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-FZQTEJ4LLY"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag('js', new Date());
    gtag('config', 'G-FZQTEJ4LLY');
  </script>
</head>
<body class="methodology-body states-body">
  <a class="skip-link" href="#states-content">Skip to state directory</a>

  <div class="methodology-shell states-shell">
    <nav class="site-nav methodology-top-nav states-top-nav" aria-label="Primary">
      <a href="/">ZIP Lookup</a>
      <a href="/map/">Map</a>
      <a href="/state-table/">State Table</a>
      <a href="/states/" aria-current="page">Explore by State</a>
      <a href="/methodology/">Full Methodology</a>
    </nav>

    <header class="methodology-hero states-hero">
      <div class="methodology-kicker">National monitoring directory</div>
      <h1>Explore PFAS monitoring by state</h1>
      <p class="methodology-lede">Move from the national picture to state-level EPA UCMR 5 public drinking-water results, then open ZIP-level records, compound summaries, and comparison-threshold context.</p>

      <div class="methodology-meta" aria-label="State directory summary">
        <span><strong>{len(index_rows)}</strong> state &amp; territory pages</span>
        <span><strong>50 states</strong> plus D.C. &amp; Puerto Rico</span>
        <span><strong>Source</strong> EPA UCMR 5</span>
        <span><strong>Updated</strong> {data_updated_label}</span>
      </div>
    </header>

    <main class="states-content" id="states-content">
      <section class="states-orientation" aria-label="Choose a starting point">
        <div class="states-orientation-copy">
          <span class="states-card-kicker">Place-based exploration</span>
          <h2>See what monitoring found across a state</h2>
          <p>State pages summarize only ZIP codes represented in the processed dataset. Use them to inspect geographic patterns—not to estimate personal exposure or rank overall state water safety.</p>
        </div>
        <div class="states-zip-cta">
          <span>Checking a specific address area?</span>
          <strong>Start with your ZIP code.</strong>
          <a href="/">Open national ZIP lookup <span aria-hidden="true">&rarr;</span></a>
        </div>
      </section>

      <section class="state-directory" aria-labelledby="state-directory-title">
        <div class="state-directory-heading">
          <div>
            <span class="states-card-kicker">Browse the dataset</span>
            <h2 id="state-directory-title">Find a state or territory</h2>
            <p>Search by name or abbreviation, or narrow the directory by region.</p>
          </div>
          <span class="state-result-count" id="stateResultsCount" aria-live="polite">{len(index_rows)} jurisdictions</span>
        </div>

        <div class="state-search-wrap">
          <label for="stateSearch">Search states and territories</label>
          <div class="state-search-control">
            <input id="stateSearch" type="search" inputmode="search" autocomplete="off" placeholder="Try California, New York, or PR" />
            <button id="stateSearchClear" class="state-search-clear" type="button" hidden>Clear</button>
          </div>
        </div>

        <div class="state-filters" role="group" aria-label="Filter by region">
          <button class="state-filter is-active" type="button" data-region-filter="all" aria-pressed="true">All</button>
          <button class="state-filter" type="button" data-region-filter="northeast" aria-pressed="false">Northeast</button>
          <button class="state-filter" type="button" data-region-filter="midwest" aria-pressed="false">Midwest</button>
          <button class="state-filter" type="button" data-region-filter="south" aria-pressed="false">South</button>
          <button class="state-filter" type="button" data-region-filter="west" aria-pressed="false">West</button>
          <button class="state-filter" type="button" data-region-filter="territories" aria-pressed="false">Territories</button>
        </div>

        <div class="state-threshold-note">
          <strong>What the percentage means</strong>
          <span>The share of represented ZIP codes with at least one retained regulated PFAS result at or above its comparison threshold. It is not a population exposure estimate.</span>
        </div>

        <div class="state-regions" id="stateRegions">
{state_region_sections}
        </div>

        <div class="state-empty" id="stateEmpty" hidden>
          <h3>No matching state found</h3>
          <p>Try a full state name, its two-letter abbreviation, or select another region.</p>
        </div>
      </section>

      <section class="states-reading-notes" aria-labelledby="state-notes-title">
        <div>
          <span class="states-card-kicker">Interpretation guardrails</span>
          <h2 id="state-notes-title">Read state summaries in context</h2>
        </div>
        <div class="states-note-grid">
          <div>
            <strong>Observed monitoring</strong>
            <p>Results are observed UCMR 5 public-water records linked to ZIP codes, not modeled contamination or household measurements.</p>
          </div>
          <div>
            <strong>Partial coverage</strong>
            <p>ZIPs without a retained detection are absent, and private wells or many small systems may not be represented.</p>
          </div>
          <div>
            <strong>Shared systems</strong>
            <p>One public water system can serve multiple ZIP codes, so neighboring state-page records are not always independent.</p>
          </div>
        </div>
        <a class="states-method-link" href="/methodology/">Read the complete methodology <span aria-hidden="true">&rarr;</span></a>
      </section>

      <aside class="states-coverage-note" aria-label="Guam coverage note">
        <span>Coverage note</span>
        <p>{site_meta.get("exclusion_reason", {}).get("GU", "")}</p>
      </aside>
    </main>

    <footer class="methodology-footer states-footer">
      <p>PFAS Estimator &middot; Independent public-health informatics project &middot; EPA UCMR 5 public drinking-water monitoring</p>
      <p>State pages describe monitoring records and do not determine personal exposure, diagnosis, or regulatory compliance.</p>
    </footer>
  </div>

  <script>
  (() => {{
    const search = document.getElementById('stateSearch');
    const clear = document.getElementById('stateSearchClear');
    const filters = Array.from(document.querySelectorAll('[data-region-filter]'));
    const cards = Array.from(document.querySelectorAll('[data-state-card]'));
    const sections = Array.from(document.querySelectorAll('[data-region-section]'));
    const resultCount = document.getElementById('stateResultsCount');
    const empty = document.getElementById('stateEmpty');
    let activeRegion = 'all';

    const normalize = value => value.toLowerCase().trim();

    function updateDirectory() {{
      const query = normalize(search.value);
      let visibleCount = 0;

      cards.forEach(card => {{
        const matchesSearch = !query || card.dataset.stateSearch.includes(query);
        const matchesRegion = activeRegion === 'all' || card.dataset.region === activeRegion;
        const visible = matchesSearch && matchesRegion;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      }});

      sections.forEach(section => {{
        section.hidden = !section.querySelector('[data-state-card]:not([hidden])');
      }});

      resultCount.textContent = `${{visibleCount}} ${{visibleCount === 1 ? 'jurisdiction' : 'jurisdictions'}}`;
      empty.hidden = visibleCount !== 0;
      clear.hidden = !query;
    }}

    search.addEventListener('input', updateDirectory);
    search.addEventListener('keydown', event => {{
      if (event.key === 'Escape' && search.value) {{
        search.value = '';
        updateDirectory();
      }}
    }});

    clear.addEventListener('click', () => {{
      search.value = '';
      search.focus();
      updateDirectory();
    }});

    filters.forEach(filter => {{
      filter.addEventListener('click', () => {{
        activeRegion = filter.dataset.regionFilter;
        filters.forEach(button => {{
          const selected = button === filter;
          button.classList.toggle('is-active', selected);
          button.setAttribute('aria-pressed', String(selected));
        }});
        updateDirectory();
      }});
    }});
  }})();
  </script>
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
        states_index_lastmod,
    )
    sitemap_path.write_text(merged, encoding="utf-8")

    print(f"\nPublished {len(pages)} state pages to {live_dir}")
    print(f"Updated {sitemap_path}")


if __name__ == "__main__":
    main()
