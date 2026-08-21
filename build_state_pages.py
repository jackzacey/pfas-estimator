#!/usr/bin/env python3
"""Build state pages from the frozen system-level website exports."""

import argparse
import html
import json
import shutil
import tempfile
from pathlib import Path

RELEASE_SUBDIR = Path("analysis/exports/ucmr5_jan2026_v0_2")
STATE_REGIONS = {
    "CT":"Northeast","ME":"Northeast","MA":"Northeast","NH":"Northeast","RI":"Northeast","VT":"Northeast","NJ":"Northeast","NY":"Northeast","PA":"Northeast",
    "IL":"Midwest","IN":"Midwest","MI":"Midwest","OH":"Midwest","WI":"Midwest","IA":"Midwest","KS":"Midwest","MN":"Midwest","MO":"Midwest","NE":"Midwest","ND":"Midwest","SD":"Midwest",
    "DE":"South","FL":"South","GA":"South","MD":"South","NC":"South","SC":"South","VA":"South","DC":"South","WV":"South","AL":"South","KY":"South","MS":"South","TN":"South","AR":"South","LA":"South","OK":"South","TX":"South",
    "AZ":"West","CO":"West","ID":"West","MT":"West","NV":"West","NM":"West","UT":"West","WY":"West","AK":"West","CA":"West","HI":"West","OR":"West","WA":"West",
    "PR":"Territories","GU":"Territories","AS":"Territories","MP":"Territories","VI":"Territories",
}
REGION_ORDER = ("Northeast", "Midwest", "South", "West", "Territories")
COMPARISONS = (
    ("PFOA", "above_pfoa", "pfoa_system_above_mcl_comparison"),
    ("PFOS", "above_pfos", "pfos_system_above_mcl_comparison"),
    ("PFHxS", "above_pfhxs", "pfhxs_system_above_mcl_comparison"),
    ("PFNA", "above_pfna", "pfna_system_above_mcl_comparison"),
    ("HFPO-DA", "above_hfpo_da", "hfpo_da_system_above_mcl_comparison"),
    ("Hazard Index", "above_hazard_index", "hi_system_above_mcl_comparison"),
)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def slugify(name):
    clean = "-".join("".join(ch.lower() if ch.isalnum() else " " for ch in name).split())
    return f"{clean}-pfas-drinking-water"


def hydrate_systems(payload):
    return [dict(zip(payload["columns"], values)) for values in payload["systems"]]


def render_template(template, values):
    result = template
    for key, value in values.items():
        result = result.replace("{{" + key + "}}", str(value))
    return result


def eligible_systems_by_state(systems):
    grouped = {}
    for row in systems:
        eligible = (
            row.get("pws_type_desc") == "Community water system"
            and row.get("pws_activity_desc") == "Active"
            and int(row.get("any_system_full_set") or 0) == 1
        )
        if eligible:
            grouped.setdefault(row.get("sdwis_state_code"), []).append(row)
    for rows in grouped.values():
        rows.sort(key=lambda row: (str(row.get("ucmr_pws_name") or ""), str(row.get("pwsid") or "")))
    return grouped


def comparison_rows(summary, denominator):
    rows = []
    for label, summary_key, _ in COMPARISONS:
        count = int(summary.get(summary_key) or 0)
        pct = count / denominator * 100 if denominator else 0
        rows.append(f'<tr><th scope="row">{label}</th><td>{count:,}</td><td>{denominator:,}</td><td>{pct:.1f}%</td></tr>')
    return "\n".join(rows)


def system_rows(rows):
    rendered = []
    for row in rows:
        above = int(row.get("any_system_above_mcl_comparison") or 0) == 1
        status = '<span class="comparison-status above">Meets at least one</span>' if above else '<span class="comparison-status below">None met</span>'
        rendered.append(
            "<tr>"
            f'<th scope="row">{html.escape(str(row.get("ucmr_pws_name") or "Unnamed system"))}</th>'
            f'<td>{html.escape(str(row.get("pwsid") or ""))}</td>'
            f'<td>{int(row.get("population_served_count") or 0):,}</td>'
            f'<td>{html.escape(str(row.get("primary_source_desc") or "Not reported"))}</td>'
            f'<td>{int(row.get("sampling_location_count") or 0):,}</td>'
            f'<td>{status}</td>'
            "</tr>"
        )
    return "\n".join(rendered)


def state_structured_data(base_url, name, slug, description, lastmod):
    return json.dumps({
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "WebPage", "@id": f"{base_url}/states/{slug}/#page", "url": f"{base_url}/states/{slug}/", "name": f"PFAS monitoring comparisons in {name}", "description": description, "dateModified": lastmod, "isPartOf": {"@id": f"{base_url}/#website"}, "about": {"@id": f"{base_url}/#dataset"}},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "PFAS Estimator", "item": f"{base_url}/"},
                {"@type": "ListItem", "position": 2, "name": "Explore by state", "item": f"{base_url}/states/"},
                {"@type": "ListItem", "position": 3, "name": name, "item": f"{base_url}/states/{slug}/"},
            ]},
        ],
    }, ensure_ascii=False)


def build_state_index(rows, state_names, base_url, release_id, lastmod):
    by_region = {region: [] for region in REGION_ORDER}
    for summary in rows:
        code = summary["state"]
        by_region[STATE_REGIONS[code]].append(summary)
    sections = []
    for region in REGION_ORDER:
        cards = []
        for summary in sorted(by_region[region], key=lambda item: state_names[item["state"]]):
            code = summary["state"]
            name = state_names[code]
            denominator = int(summary["eligible_cws_with_complete_monitoring"])
            above = int(summary["above_any_april_2024_benchmark"])
            pct = above / denominator * 100 if denominator else 0
            cards.append(f'''          <article class="state-directory-card" data-state-card data-region="{region.lower()}" data-state-search="{html.escape(name.lower())} {code.lower()}">
            <a href="/states/{slugify(name)}/" aria-label="View system-level PFAS monitoring comparisons for {html.escape(name)}">
              <div class="state-directory-card-top"><span class="state-abbreviation" aria-hidden="true">{code}</span><span class="state-card-region">{region}</span></div>
              <h3>{html.escape(name)}</h3>
              <div class="state-card-stat"><strong>{pct:.1f}%</strong><span>of eligible complete-monitoring CWSs meeting any comparison</span></div>
              <div class="state-card-bar" aria-hidden="true"><span style="width:{min(pct, 100):.1f}%"></span></div>
              <div class="state-card-footer"><span>{above:,} of {denominator:,} systems</span><span class="state-card-link">View systems <span aria-hidden="true">&rarr;</span></span></div>
            </a>
          </article>''')
        region_slug = region.lower()
        sections.append(f'''      <section class="state-region" data-region-section="{region_slug}" aria-labelledby="region-{region_slug}">
        <div class="state-region-heading"><h2 id="region-{region_slug}">{region}</h2><span>{len(cards)} pages</span></div>
        <div class="state-directory-grid">{chr(10).join(cards)}</div>
      </section>''')
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>PFAS Monitoring Comparisons by State | PFAS Estimator</title><meta name="description" content="Browse system-level EPA UCMR 5 technical-comparison summaries for states and territories." /><link rel="canonical" href="{base_url}/states/" /><meta name="robots" content="index, follow" /><link rel="stylesheet" href="/styles.css?v=20260820-system-state-pages" /></head>
<body class="methodology-body states-body"><a class="skip-link" href="#states-content">Skip to state directory</a><div class="methodology-shell states-shell">
<nav class="site-nav methodology-top-nav states-top-nav" aria-label="Primary"><a href="/">System lookup</a><a href="/map/">Map</a><a href="/state-table/">State table</a><a href="/states/" aria-current="page">Explore by state</a><a href="/methodology/">Methods &amp; limitations</a></nav>
<header class="methodology-hero states-hero"><div class="methodology-kicker">System-level monitoring directory</div><h1>Explore PFAS comparisons by state</h1><p class="methodology-lede">Browse unique active community water systems with complete UCMR 5 monitoring. State pages preserve the familiar visual directory while replacing legacy ZIP-maximum statistics.</p><div class="methodology-meta"><span><strong>{len(rows)}</strong> jurisdictions</span><span><strong>Unit</strong> community water system</span><span><strong>Release</strong> {release_id}</span><span><strong>Updated</strong> {lastmod}</span></div></header>
<main class="states-content" id="states-content"><section class="states-orientation"><div class="states-orientation-copy"><span class="states-card-kicker">Place-based exploration</span><h2>See what complete monitoring found</h2><p>Percentages use unique eligible systems as the denominator. They are not ZIP prevalence, household exposure, population risk, or compliance estimates.</p></div><div class="states-zip-cta"><span>Checking a specific area?</span><strong>Start with the system lookup.</strong><a href="/">Open national lookup <span aria-hidden="true">&rarr;</span></a></div></section>
<section class="state-directory"><div class="state-directory-heading"><div><span class="states-card-kicker">Browse the release</span><h2>Find a state or territory</h2><p>Search by name or abbreviation, or narrow the directory by region.</p></div><span class="state-result-count" id="stateResultsCount" aria-live="polite">{len(rows)} jurisdictions</span></div>
<div class="state-search-wrap"><label for="stateSearch">Search states and territories</label><div class="state-search-control"><input id="stateSearch" type="search" autocomplete="off" placeholder="Try California, New York, or PR" /><button id="stateSearchClear" class="state-search-clear" type="button" hidden>Clear</button></div></div>
<div class="state-filters" role="group" aria-label="Filter by region"><button class="state-filter is-active" type="button" data-region-filter="all" aria-pressed="true">All</button>{''.join(f'<button class="state-filter" type="button" data-region-filter="{region.lower()}" aria-pressed="false">{region}</button>' for region in REGION_ORDER)}</div>
<div class="state-threshold-note"><strong>What the percentage means</strong><span>The share of active community water systems with complete monitoring that met at least one EPA technical comparison.</span></div><div class="state-regions" id="stateRegions">{''.join(sections)}</div><p class="state-directory-empty" id="stateDirectoryEmpty" hidden>No matching jurisdiction found.</p></section></main>
<footer class="methodology-footer"><p>Release {release_id} · EPA UCMR 5 results received through January 15, 2026 · Not a compliance or exposure determination.</p></footer></div>
<script>(()=>{{const input=document.getElementById('stateSearch'),clear=document.getElementById('stateSearchClear'),cards=[...document.querySelectorAll('[data-state-card]')],filters=[...document.querySelectorAll('[data-region-filter]')],count=document.getElementById('stateResultsCount'),empty=document.getElementById('stateDirectoryEmpty');let region='all';function draw(){{const query=input.value.trim().toLowerCase();let shown=0;cards.forEach(card=>{{const visible=(region==='all'||card.dataset.region===region)&&card.dataset.stateSearch.includes(query);card.hidden=!visible;if(visible)shown++;}});document.querySelectorAll('[data-region-section]').forEach(section=>section.hidden=![...section.querySelectorAll('[data-state-card]')].some(card=>!card.hidden));count.textContent=`${{shown}} jurisdiction${{shown===1?'':'s'}}`;empty.hidden=shown!==0;clear.hidden=!query;}}input.addEventListener('input',draw);clear.addEventListener('click',()=>{{input.value='';draw();input.focus();}});filters.forEach(button=>button.addEventListener('click',()=>{{region=button.dataset.regionFilter;filters.forEach(item=>{{item.classList.toggle('is-active',item===button);item.setAttribute('aria-pressed',item===button?'true':'false');}});draw();}}));}})();</script></body></html>'''


def validate(summary_rows, grouped, pages):
    problems = []
    summary_by_state = {row["state"]: row for row in summary_rows}
    if set(summary_by_state) != set(grouped):
        problems.append(f"state coverage mismatch: summaries={len(summary_by_state)} system groups={len(grouped)}")
    for code, summary in summary_by_state.items():
        systems = grouped.get(code, [])
        expected = int(summary["eligible_cws_with_complete_monitoring"])
        if len(systems) != expected:
            problems.append(f"{code}: eligible denominator {len(systems)} != {expected}")
        actual_any = sum(int(row.get("any_system_above_mcl_comparison") or 0) for row in systems)
        if actual_any != int(summary["above_any_april_2024_benchmark"]):
            problems.append(f"{code}: any-comparison count {actual_any} mismatch")
        for _, summary_key, system_key in COMPARISONS:
            actual = sum(int(row.get(system_key) or 0) for row in systems)
            if actual != int(summary[summary_key]):
                problems.append(f"{code}: {summary_key} count {actual} mismatch")
    for slug, page in pages.items():
        if "{{" in page or "undefined" in page or "NaN" in page:
            problems.append(f"{slug}: unresolved content")
        for forbidden in ("14,071", "36% of", "detection-only dataset", "represented ZIPs"):
            if forbidden in page:
                problems.append(f"{slug}: legacy text remains: {forbidden}")
    if sum(len(rows) for rows in grouped.values()) != 8936:
        problems.append("national eligible-system total is not 8,936")
    if sum(int(row["above_any_april_2024_benchmark"]) for row in summary_rows) != 1030:
        problems.append("national any-comparison total is not 1,030")
    return problems


def update_sitemap(path, base_url, slugs, lastmod):
    urls = ["", "map/", "state-table/", "states/", "methodology/"] + [f"states/{slug}/" for slug in slugs]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for relative in urls:
        priority = "1.0" if not relative else "0.8" if relative in ("map/", "state-table/", "states/", "methodology/") else "0.6"
        lines.append(f"  <url><loc>{base_url}/{relative}</loc><lastmod>{lastmod}</lastmod><changefreq>monthly</changefreq><priority>{priority}</priority></url>")
    lines.append("</urlset>")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    root = Path(args.repo_root).resolve()
    release_dir = root / RELEASE_SUBDIR
    lookup = load_json(release_dir / "website_lookup_compact.json")
    state_payload = load_json(release_dir / "website_state_summary.json")
    metadata = load_json(release_dir / "website_metadata.json")
    state_names = load_json(root / "config/state_names.json")
    site_meta = load_json(root / "config/site_meta.json")
    template = (root / "templates/state_page_template.html").read_text(encoding="utf-8")
    if not (lookup["release_id"] == state_payload["release_id"] == metadata["release_id"]):
        raise SystemExit("FATAL: website export release identifiers do not match")
    systems = hydrate_systems(lookup)
    grouped = eligible_systems_by_state(systems)
    summaries = state_payload["states"]
    pages = {}
    slugs = []
    for summary in summaries:
        code = summary["state"]
        name = state_names[code]
        slug = slugify(name)
        slugs.append(slug)
        denominator = int(summary["eligible_cws_with_complete_monitoring"])
        above = int(summary["above_any_april_2024_benchmark"])
        pct = above / denominator * 100 if denominator else 0
        description = f"System-level EPA UCMR 5 PFAS technical-comparison summary for {name}: {above} of {denominator} eligible active community water systems with complete monitoring met at least one comparison."
        pages[slug] = render_template(template, {
            "TITLE": f"PFAS Monitoring Comparisons in {name} | PFAS Estimator",
            "META_DESCRIPTION": html.escape(description, quote=True),
            "CANONICAL_URL": f'{site_meta["base_url"]}/states/{slug}/',
            "BASE_URL": site_meta["base_url"],
            "STRUCTURED_DATA_JSON": state_structured_data(site_meta["base_url"], name, slug, description, site_meta["dataset_lastmod"]),
            "STATE_NAME": html.escape(name), "STATE_CODE": code,
            "ELIGIBLE_SYSTEMS": f"{denominator:,}", "ABOVE_SYSTEMS": f"{above:,}", "PCT_ABOVE": f"{pct:.1f}",
            "RELEASE_ID": metadata["release_id"],
            "COMPOUND_TABLE_ROWS": comparison_rows(summary, denominator),
            "SYSTEM_TABLE_ROWS": system_rows(grouped.get(code, [])),
        })
    problems = validate(summaries, grouped, pages)
    if problems:
        raise SystemExit("FATAL: state-page validation failed:\n- " + "\n- ".join(problems))
    index_html = build_state_index(summaries, state_names, site_meta["base_url"], metadata["release_id"], site_meta["states_index_lastmod"])
    if args.dry_run:
        print(f"Validated {len(pages)} state and territory pages from {sum(len(rows) for rows in grouped.values()):,} unique eligible systems.")
        return
    with tempfile.TemporaryDirectory(prefix="pfas_state_build_", dir=root) as tmp:
        build_root = Path(tmp) / "states"
        build_root.mkdir()
        (build_root / "index.html").write_text(index_html, encoding="utf-8")
        for slug, content in pages.items():
            destination = build_root / slug
            destination.mkdir()
            (destination / "index.html").write_text(content, encoding="utf-8")
        target = root / "states"
        backup = Path(tmp) / "states_backup"
        if target.exists():
            target.rename(backup)
        build_root.rename(target)
        shutil.rmtree(backup, ignore_errors=True)
    update_sitemap(root / "sitemap.xml", site_meta["base_url"], slugs, site_meta["dataset_lastmod"])
    print(f"Published {len(pages)} validated state and territory pages from the frozen {metadata['release_id']} release.")


if __name__ == "__main__":
    main()
