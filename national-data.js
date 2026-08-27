(() => {
  "use strict";

  const view = document.body.dataset.nationalView;
  if (view !== "map" && view !== "table") return;

  const RELEASE_PATH = "/analysis/exports/ucmr5_jan2026_v0_2";
  const STATE_DATA_URL = `${RELEASE_PATH}/website_state_summary.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const STATE_NAMES = Object.freeze({
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", GU: "Guam", AS: "American Samoa", MP: "Northern Mariana Islands", VI: "U.S. Virgin Islands"
  });
  const NAME_TO_ABBREV = Object.freeze(Object.fromEntries(Object.entries(STATE_NAMES).map(([code, name]) => [name, code])));
  const COMPOUND_LABELS = Object.freeze({ pfoa: "PFOA", pfos: "PFOS", pfhxs: "PFHxS", pfna: "PFNA", hfpo_da: "HFPO-DA", hazard_index: "Hazard Index" });

  const status = document.getElementById("nationalDataStatus");
  let stateData = {};
  let tableRows = [];
  let topologyData = null;
  let resizeTimer = null;

  function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    status.hidden = !message;
  }

  function slugifyState(name) {
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-pfas-drinking-water`;
  }

  function normalizeStateRows(payload) {
    tableRows = payload.states.map(source => {
      const eligible = Number(source.eligible_cws_with_complete_monitoring || 0);
      const above = Number(source.above_any_april_2024_benchmark || 0);
      const row = {
        state: source.state,
        name: STATE_NAMES[source.state] || source.state,
        eligible,
        above,
        pctAbove: eligible ? Number(((above / eligible) * 100).toFixed(1)) : 0,
        pfoa: Number(source.above_pfoa || 0),
        pfos: Number(source.above_pfos || 0),
        pfhxs: Number(source.above_pfhxs || 0),
        pfna: Number(source.above_pfna || 0),
        hfpo_da: Number(source.above_hfpo_da || 0),
        hazard_index: Number(source.above_hazard_index || 0),
      };
      stateData[row.state] = row;
      return row;
    });
  }

  function renderTable() {
    const tableHost = document.getElementById("stateSummaryTable");
    if (!tableHost) return;
    let sortKey = "eligible";
    let sortDirection = -1;
    const columns = [
      ["name", "State or territory"],
      ["eligible", "Water systems with complete monitoring"],
      ["above", "Water systems meeting any comparison"],
      ["pctAbove", "Percent meeting a comparison"],
      ["pfoa", "PFOA"],
      ["pfos", "PFOS"],
      ["hazard_index", "Hazard Index"],
    ];

    function draw() {
      const sorted = [...tableRows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        return typeof av === "string" ? sortDirection * av.localeCompare(bv) : sortDirection * (av - bv);
      });
      const directionLabel = sortDirection === -1 ? "descending" : "ascending";
      const arrow = sortDirection === -1 ? "↓" : "↑";
      const header = columns.map(([key, label]) => `<th scope="col" aria-sort="${key === sortKey ? directionLabel : "none"}"><button type="button" data-sort="${key}">${label}${key === sortKey ? ` <span aria-hidden="true">${arrow}</span>` : ""}</button></th>`).join("");
      const body = sorted.map(row => {
        const url = `/states/${slugifyState(row.name)}/`;
        return `<tr><td class="state-name-cell"><a href="${url}">${row.name}<span>${row.state}</span></a></td><td>${row.eligible.toLocaleString()}</td><td>${row.above.toLocaleString()}</td><td>${row.pctAbove.toFixed(1)}%</td><td>${row.pfoa.toLocaleString()}</td><td>${row.pfos.toLocaleString()}</td><td>${row.hazard_index.toLocaleString()}</td></tr>`;
      }).join("");
      tableHost.innerHTML = `<table class="state-table national-state-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      tableHost.querySelectorAll("button[data-sort]").forEach(button => {
        button.addEventListener("click", () => {
          const nextKey = button.dataset.sort;
          if (nextKey === sortKey) sortDirection *= -1;
          else { sortKey = nextKey; sortDirection = nextKey === "name" ? 1 : -1; }
          draw();
        });
      });
    }
    draw();
  }

  function metricValue(stateCode, metric) {
    const row = stateData[stateCode];
    return row ? row[metric] ?? null : null;
  }

  function colorScaleFor(metric, maxValue) {
    if (metric === "pctAbove") {
      return value => {
        if (!value) return "#dfeaf0";
        const t = Math.min(value / Math.max(maxValue, 1), 1);
        return `rgb(${Math.round(223 - 48 * t)},${Math.round(234 - 112 * t)},${Math.round(240 - 92 * t)})`;
      };
    }
    return value => {
      if (!value) return "#dfeaf0";
      const t = Math.min(value / Math.max(maxValue, 1), 1);
      return `rgb(${Math.round(223 - 200 * t)},${Math.round(234 - 140 * t)},${Math.round(240 - 89 * t)})`;
    };
  }

  function renderLegend(metric, maxValue, colorScale) {
    const legend = document.getElementById("mapLegend");
    if (!legend) return;
    const steps = [0, 1, 2, 3, 4].map(index => {
      const value = (maxValue / 4) * index;
      const label = metric === "pctAbove" ? `${value.toFixed(index === 0 ? 0 : 1)}%` : Math.round(value).toLocaleString();
      return `<div class="map-legend-item"><span class="map-legend-swatch" style="background:${colorScale(value)}"></span><span>${label}</span></div>`;
    });
    legend.innerHTML = steps.join("");
  }

  async function getTopology() {
    if (!topologyData) topologyData = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    return topologyData;
  }

  function metricDescription(row, metric) {
    if (metric === "pctAbove") return `${row.pctAbove.toFixed(1)}% of active community water systems with complete monitoring met a comparison`;
    if (metric === "eligible") return `${row.eligible.toLocaleString()} active community water systems with complete monitoring`;
    if (metric === "above") return `${row.above.toLocaleString()} water systems met any comparison`;
    return `${Number(row[metric] || 0).toLocaleString()} water systems met the ${COMPOUND_LABELS[metric]} comparison`;
  }

  async function renderMap() {
    const metricSelect = document.getElementById("mapMetric");
    const container = document.getElementById("mapContainer");
    const svg = document.getElementById("pfasMapSvg");
    const tooltip = document.getElementById("mapTooltip");
    if (!metricSelect || !container || !svg || !tooltip) return;
    const metric = metricSelect.value;
    svg.innerHTML = "";
    const values = Object.keys(stateData).map(code => metricValue(code, metric)).filter(value => value !== null && value > 0);
    const maxValue = values.length ? Math.max(...values) : 1;
    const colorScale = colorScaleFor(metric, maxValue);
    renderLegend(metric, maxValue, colorScale);

    try {
      const us = await getTopology();
      const width = container.clientWidth || 900;
      const height = container.clientHeight || 560;
      const features = topojson.feature(us, us.objects.states);
      const projection = d3.geoAlbersUsa().fitExtent([[18, 18], [width - 18, height - 18]], features);
      const path = d3.geoPath().projection(projection);
      const svgSelection = d3.select(svg).attr("viewBox", `0 0 ${width} ${height}`);
      const paths = svgSelection.selectAll(".map-state").data(features.features).join("path")
        .attr("class", "map-state").attr("d", path)
        .attr("fill", feature => {
          const code = NAME_TO_ABBREV[feature.properties.name];
          const value = code ? metricValue(code, metric) : null;
          return value ? colorScale(value) : "#e0e8ee";
        })
        .attr("tabindex", feature => stateData[NAME_TO_ABBREV[feature.properties.name]] ? 0 : null)
        .attr("role", feature => stateData[NAME_TO_ABBREV[feature.properties.name]] ? "link" : null)
        .attr("aria-label", feature => {
          const row = stateData[NAME_TO_ABBREV[feature.properties.name]];
          return row ? `${feature.properties.name}: ${metricDescription(row, metric)}` : null;
        });

      function showTooltip(event, feature) {
        const code = NAME_TO_ABBREV[feature.properties.name];
        const row = stateData[code];
        if (!row) { tooltip.hidden = true; return; }
        tooltip.innerHTML = `<strong>${feature.properties.name} <span>${code}</span></strong><p>${metricDescription(row, metric)}</p><small>${row.above.toLocaleString()} of ${row.eligible.toLocaleString()} active community water systems with complete monitoring met a comparison</small>`;
        const rect = container.getBoundingClientRect();
        let left = event.clientX - rect.left + 16;
        let top = event.clientY - rect.top - 12;
        if (left + 280 > width) left -= 290;
        if (top + 110 > height) top -= 120;
        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
        tooltip.hidden = false;
      }

      function openState(feature) {
        const row = stateData[NAME_TO_ABBREV[feature.properties.name]];
        if (row) window.location.href = `/states/${slugifyState(row.name)}/`;
      }

      paths.on("mousemove", showTooltip).on("mouseleave", () => { tooltip.hidden = true; }).on("click", (event, feature) => openState(feature)).on("keydown", (event, feature) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openState(feature); }
      });
      paths.append("title").text(feature => {
        const row = stateData[NAME_TO_ABBREV[feature.properties.name]];
        return row ? `${feature.properties.name}: ${metricDescription(row, metric)}` : `${feature.properties.name}: no active community water systems with complete monitoring`;
      });
      svgSelection.append("path").datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b)).attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", .8).attr("pointer-events", "none").attr("d", path);
      setStatus("");
    } catch (error) {
      setStatus("The map could not load. The state table and ZIP lookup remain available.", true);
      console.error(error);
    }
  }

  async function initialize() {
    setStatus("Loading verified state summaries…");
    try {
      const [stateResponse, metadataResponse] = await Promise.all([fetch(STATE_DATA_URL, { cache: "no-cache" }), fetch(METADATA_URL, { cache: "no-cache" })]);
      if (!stateResponse.ok || !metadataResponse.ok) throw new Error("State summary release unavailable");
      const [statePayload, metadata] = await Promise.all([stateResponse.json(), metadataResponse.json()]);
      if (statePayload.release_id !== metadata.release_id) throw new Error("Release identifiers do not match");
      normalizeStateRows(statePayload);
      document.querySelectorAll("[data-release-id]").forEach(element => { element.textContent = metadata.release_id; });
      if (view === "table") { renderTable(); setStatus(""); }
      else {
        document.getElementById("mapMetric")?.addEventListener("change", renderMap);
        await renderMap();
        if ("ResizeObserver" in window) {
          new ResizeObserver(() => { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(renderMap, 120); }).observe(document.getElementById("mapContainer"));
        }
      }
    } catch (error) {
      setStatus("Verified state summaries could not be loaded. The ZIP lookup remains available.", true);
      console.error(error);
    }
  }

  initialize();
})();
