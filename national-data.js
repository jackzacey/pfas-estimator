(() => {
  "use strict";

  const view = document.body.dataset.nationalView;
  if (view !== "map" && view !== "table") return;

  const STATE_NAMES = Object.freeze({
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
    CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
    FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
    IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
    ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
    NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
    NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
    PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
    TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
    PR: "Puerto Rico", GU: "Guam"
  });

  const NAME_TO_ABBREV = Object.freeze(
    Object.fromEntries(Object.entries(STATE_NAMES).map(([abbrev, name]) => [name, abbrev]))
  );

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

  function buildStateData(zipToState) {
    const epaLimits = {};
    for (const [compound, info] of Object.entries(SCIENCE)) {
      if (info.epa_limit) epaLimits[compound] = info.epa_limit;
    }

    const working = {};
    for (const [zip, entries] of Object.entries(DATA)) {
      const state = zipToState[zip.substring(0, 3)];
      if (!state) continue;
      if (!working[state]) {
        working[state] = {
          detections: 0,
          systems: new Set(),
          aboveLimit: 0,
          compounds: {},
          totalLevel: 0,
          levelCount: 0
        };
      }

      const stateRow = working[state];
      for (const entry of entries) {
        stateRow.detections += 1;
        stateRow.systems.add(entry.sys);
        if (epaLimits[entry.compound] && entry.level > epaLimits[entry.compound]) {
          stateRow.aboveLimit += 1;
        }
        stateRow.compounds[entry.compound] = (stateRow.compounds[entry.compound] || 0) + 1;
        stateRow.totalLevel += entry.level;
        stateRow.levelCount += 1;
      }
    }

    stateData = {};
    tableRows = Object.entries(working).map(([state, values]) => {
      const topCompound = Object.entries(values.compounds).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
      const row = {
        state,
        name: STATE_NAMES[state] || state,
        detections: values.detections,
        systems: values.systems.size,
        pctAbove: values.aboveLimit > 0
          ? Number(((values.aboveLimit / values.detections) * 100).toFixed(1))
          : 0,
        avgLevel: values.levelCount > 0
          ? Number((values.totalLevel / values.levelCount).toFixed(4))
          : 0,
        topCompound,
        compounds: values.compounds
      };
      stateData[state] = row;
      return row;
    });
  }

  function renderTable() {
    const tableHost = document.getElementById("stateSummaryTable");
    if (!tableHost) return;

    let sortKey = "detections";
    let sortDirection = -1;
    const columns = [
      ["name", "State or territory"],
      ["detections", "Retained detections"],
      ["systems", "Water systems"],
      ["pctAbove", "% above comparison value"],
      ["avgLevel", "Mean level (µg/L)"],
      ["topCompound", "Most common analyte"]
    ];

    function sortValue(row, key) {
      return key === "name" || key === "topCompound" ? row[key].toLowerCase() : row[key];
    }

    function draw() {
      const sorted = [...tableRows].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (typeof av === "string") return sortDirection * av.localeCompare(bv);
        return sortDirection * (av - bv);
      });

      const directionLabel = sortDirection === -1 ? "descending" : "ascending";
      const arrow = sortDirection === -1 ? "↓" : "↑";
      const header = columns.map(([key, label]) => {
        const active = key === sortKey;
        return `<th scope="col" aria-sort="${active ? directionLabel : "none"}"><button type="button" data-sort="${key}">${label}${active ? ` <span aria-hidden="true">${arrow}</span>` : ""}</button></th>`;
      }).join("");

      const body = sorted.map(row => {
        const stateUrl = row.state === "GU" ? "" : `/states/${slugifyState(row.name)}/`;
        const stateLabel = stateUrl
          ? `<a href="${stateUrl}">${row.name}<span>${row.state}</span></a>`
          : `${row.name}<span>${row.state}</span>`;
        return `<tr>
          <td class="state-name-cell">${stateLabel}</td>
          <td>${row.detections.toLocaleString()}</td>
          <td>${row.systems.toLocaleString()}</td>
          <td>${row.pctAbove.toFixed(1)}%</td>
          <td>${row.avgLevel.toFixed(4)}</td>
          <td><span class="compound-code">${row.topCompound}</span></td>
        </tr>`;
      }).join("");

      tableHost.innerHTML = `<table class="state-table national-state-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
      tableHost.querySelectorAll("button[data-sort]").forEach(button => {
        button.addEventListener("click", () => {
          const nextKey = button.dataset.sort;
          if (nextKey === sortKey) sortDirection *= -1;
          else {
            sortKey = nextKey;
            sortDirection = nextKey === "name" || nextKey === "topCompound" ? 1 : -1;
          }
          draw();
        });
      });
    }

    draw();
  }

  function metricValue(stateCode, metric) {
    const row = stateData[stateCode];
    if (!row) return null;
    if (metric.startsWith("compound_")) {
      return row.compounds[metric.replace("compound_", "")] || 0;
    }
    return row[metric] ?? null;
  }

  function colorScaleFor(metric, maxValue) {
    if (metric === "pctAbove") {
      return value => {
        if (value === null || value === 0) return "#dfeaf0";
        const t = Math.min(value / 60, 1);
        const red = Math.round(203 + (201 - 203) * t);
        const green = Math.round(220 + (112 - 220) * t);
        const blue = Math.round(227 + (31 - 227) * t);
        return `rgb(${red},${green},${blue})`;
      };
    }

    return value => {
      if (!value) return "#dfeaf0";
      const t = Math.min(value / maxValue, 1);
      const red = Math.round(223 + (23 - 223) * t);
      const green = Math.round(234 + (94 - 234) * t);
      const blue = Math.round(240 + (151 - 240) * t);
      return `rgb(${red},${green},${blue})`;
    };
  }

  function renderLegend(metric, maxValue, colorScale) {
    const legend = document.getElementById("mapLegend");
    if (!legend) return;
    legend.innerHTML = "";

    const steps = metric === "pctAbove"
      ? [0, 15, 30, 45, 60].map(value => ({
          label: value === 60 ? "60%+" : `${value}%`,
          color: colorScale(value)
        }))
      : [0, 1, 2, 3, 4].map(index => {
          const value = (maxValue / 4) * index;
          return {
            label: index === 0 ? "0" : index === 4 ? `${Math.round(maxValue).toLocaleString()}+` : Math.round(value).toLocaleString(),
            color: colorScale(value)
          };
        });

    for (const step of steps) {
      const item = document.createElement("div");
      item.className = "map-legend-item";
      item.innerHTML = `<span class="map-legend-swatch" style="background:${step.color}"></span><span>${step.label}</span>`;
      legend.appendChild(item);
    }
  }

  async function getTopology() {
    if (topologyData) return topologyData;
    topologyData = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    return topologyData;
  }

  async function renderMap() {
    const metricSelect = document.getElementById("mapMetric");
    const container = document.getElementById("mapContainer");
    const svg = document.getElementById("pfasMapSvg");
    const tooltip = document.getElementById("mapTooltip");
    if (!metricSelect || !container || !svg || !tooltip) return;

    const metric = metricSelect.value;
    svg.innerHTML = "";
    const values = Object.keys(stateData)
      .map(state => metricValue(state, metric))
      .filter(value => value !== null && value > 0);
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

      const paths = svgSelection.selectAll(".map-state")
        .data(features.features)
        .join("path")
        .attr("class", "map-state")
        .attr("d", path)
        .attr("fill", feature => {
          const abbrev = NAME_TO_ABBREV[feature.properties.name];
          const value = abbrev ? metricValue(abbrev, metric) : null;
          return value === null || value === 0 ? "#e0e8ee" : colorScale(value);
        })
        .attr("tabindex", feature => stateData[NAME_TO_ABBREV[feature.properties.name]] ? 0 : null)
        .attr("role", feature => stateData[NAME_TO_ABBREV[feature.properties.name]] ? "link" : null)
        .attr("aria-label", feature => {
          const abbrev = NAME_TO_ABBREV[feature.properties.name];
          const row = stateData[abbrev];
          return row ? `${feature.properties.name}: ${row.detections.toLocaleString()} retained detections, ${row.systems.toLocaleString()} represented water systems` : null;
        });

      function tooltipContent(feature) {
        const abbrev = NAME_TO_ABBREV[feature.properties.name];
        const row = stateData[abbrev];
        if (!row) return null;
        const value = metricValue(abbrev, metric);
        let primary;
        if (metric === "pctAbove") primary = `${value.toFixed(1)}% of retained records above comparison value`;
        else if (metric === "detections") primary = `${row.detections.toLocaleString()} retained detections`;
        else if (metric === "systems") primary = `${row.systems.toLocaleString()} represented water systems`;
        else primary = `${(value || 0).toLocaleString()} detections`;
        return `<strong>${feature.properties.name} <span>${abbrev}</span></strong><p>${primary}</p><small>Most common analyte: ${row.topCompound} · Open state page for ZIP-level context</small>`;
      }

      paths
        .on("mousemove", function(event, feature) {
          const content = tooltipContent(feature);
          if (!content) {
            tooltip.hidden = true;
            return;
          }
          tooltip.innerHTML = content;
          const rect = container.getBoundingClientRect();
          let left = event.clientX - rect.left + 16;
          let top = event.clientY - rect.top - 12;
          if (left + 260 > width) left -= 270;
          if (top + 100 > height) top -= 110;
          tooltip.style.left = `${Math.max(8, left)}px`;
          tooltip.style.top = `${Math.max(8, top)}px`;
          tooltip.hidden = false;
        })
        .on("mouseleave", () => { tooltip.hidden = true; })
        .on("click", function(event, feature) {
          const abbrev = NAME_TO_ABBREV[feature.properties.name];
          if (!stateData[abbrev] || abbrev === "GU") return;
          window.location.href = `/states/${slugifyState(feature.properties.name)}/`;
        })
        .on("keydown", function(event, feature) {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const abbrev = NAME_TO_ABBREV[feature.properties.name];
          if (!stateData[abbrev] || abbrev === "GU") return;
          window.location.href = `/states/${slugifyState(feature.properties.name)}/`;
        });

      paths.append("title").text(feature => {
        const abbrev = NAME_TO_ABBREV[feature.properties.name];
        const row = stateData[abbrev];
        return row ? `${feature.properties.name}: ${row.detections.toLocaleString()} retained detections` : `${feature.properties.name}: no represented data`;
      });

      svgSelection.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.8)
        .attr("pointer-events", "none")
        .attr("d", path);
      setStatus("");
    } catch (error) {
      setStatus("The map could not load. The state table and ZIP lookup remain available.", true);
    }
  }

  async function initialize() {
    setStatus("Loading national data…");
    try {
      const response = await fetch("/config/zip_to_state.json");
      if (!response.ok) throw new Error("ZIP-to-state crosswalk unavailable");
      const zipToState = await response.json();
      buildStateData(zipToState);

      if (view === "table") {
        renderTable();
        setStatus("");
      } else {
        const metricSelect = document.getElementById("mapMetric");
        metricSelect?.addEventListener("change", renderMap);
        await renderMap();
        if ("ResizeObserver" in window) {
          const mapContainer = document.getElementById("mapContainer");
          new ResizeObserver(() => {
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(renderMap, 120);
          }).observe(mapContainer);
        }
      }
    } catch (error) {
      setStatus("National data could not be loaded. Please try again shortly.", true);
    }
  }

  initialize();
})();
