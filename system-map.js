(() => {
  'use strict';
  if (!document.getElementById('systemMap')) return;
  const $ = id => document.getElementById(id);
  const model = PFASSystemMapModel;
  const base = '/analysis/exports/ucmr5_final_aug2026_v1/';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let map, clusters, systems = [], locations, periods, selected = null, byId, markers = new Map();
  let renderVersion = 0;

  function metric(s) { return $('systemMapMetric').value === 'summary' ? model.summary(s) : model.chemical(s, $('systemMapChemical').value); }
  function community(s) { return locations.locations[s.pwsid]?.[2] || ''; }
  function locationDescription(s) {
    const row = locations.locations[s.pwsid];
    return row ? `Approximate service-area center · ${row[3] === 'Modeled' ? 'EPA-modeled service area' : row[3] === 'System Sourced' ? 'Service area supplied by the water system' : 'EPA boundary source'}` : 'No usable service-area location in this map snapshot';
  }
  function tooltip(s) { return `<strong>${escape(s.ucmr_pws_name)}</strong><br>${escape(community(s) || 'Community not reported')} · ${escape(s.sdwis_state_code)}<br><span>${escape(metric(s).label)}</span><br><small>Select for details and results</small>`; }
  function icon(s) {
    const m = metric(s);
    return L.divIcon({className:'system-map-dot-host' + (selected?.pwsid === s.pwsid ? ' is-selected' : ''),html:`<span class="system-map-dot" style="--dot-color:${m.color}"></span>`,iconSize:[24,24],iconAnchor:[12,12]});
  }
  function showDetails(s, focus = false) {
    const previous = selected;
    selected = s;
    if (previous && previous.pwsid !== s.pwsid) markers.get(previous.pwsid)?.setIcon(icon(previous)).setZIndexOffset(0);
    markers.get(s.pwsid)?.setIcon(icon(s)).setZIndexOffset(1000);
    const m = model.summary(s);
    const key = $('systemMapChemical').value;
    const c = model.chemical(s, key);
    const period = periods.get(s.pwsid);
    const dateText = period ? `${period.monitoring_start} to ${period.monitoring_end}` : 'Sampling dates not reported';
    $('systemMapDetails').innerHTML = `<div><span class="national-section-label">Selected water system · ${escape(s.sdwis_state_code)}</span><h3 tabindex="-1" id="selectedSystemHeading">${escape(s.ucmr_pws_name)}</h3><p>${escape(community(s) || 'Community not reported')} · System ID ${escape(s.pwsid)}</p><p class="system-map-finding">${escape(m.label)}${s._comparisonCoverage?.all ? '' : '. Some location or chemical comparisons are incomplete.'}</p></div><div class="system-map-detail-result"><span>${escape(model.CHEMICALS[key].name)}</span><strong>${escape(c.valueLabel)}</strong><p>Highest yearly average among locations with complete samples.${c.all ? '' : ' Other locations may lack complete comparisons.'}</p><p>Historical sampling: ${escape(dateText)}</p><a class="system-map-result-link" href="${model.resultUrl(s.pwsid)}">View this system’s results →</a><small>${escape(locationDescription(s))}. This does not confirm your home’s provider.</small></div>`;
    $('systemMapDetails').classList.add('has-selection');
    if (focus) $('selectedSystemHeading').focus({preventScroll:true});
    history.replaceState({}, '', `${location.pathname}?system=${encodeURIComponent(s.pwsid)}`);
  }
  function selectSystem(s, focus = true) {
    showDetails(s, focus);
    const marker = markers.get(s.pwsid);
    if (marker && clusters.hasLayer(marker)) clusters.zoomToShowLayer(marker, () => marker.openTooltip());
  }
  function filteredSystems() {
    const state = $('systemMapState').value;
    return systems.filter(s => !state || s.sdwis_state_code === state);
  }
  function renderSearch() {
    const query = $('systemMapSearch').value.trim().toLowerCase();
    const host = $('systemSearchResults');
    if (!query) { host.hidden = true; host.innerHTML = ''; return; }
    const matches = filteredSystems().filter(s => `${s.ucmr_pws_name} ${s.pwsid} ${community(s)}`.toLowerCase().includes(query));
    host.hidden = false;
    host.innerHTML = `<p>${matches.length.toLocaleString()} matching ${matches.length === 1 ? 'system' : 'systems'}${matches.length > 12 ? '; showing the first 12. Refine your search for more.' : ''}</p>` + matches.slice(0,12).map(s => `<button type="button" data-system="${escape(s.pwsid)}"><strong>${escape(s.ucmr_pws_name)}</strong><span>${escape(community(s) || 'Community not reported')} · ${escape(s.sdwis_state_code)} · ${escape(s.pwsid)}${locations.locations[s.pwsid] ? '' : ' · Location unavailable'}</span></button>`).join('');
  }
  function renderLegend() {
    const summary = $('systemMapMetric').value === 'summary';
    $('systemChemicalControl').hidden = summary;
    const swatch = (color, text) => `<span><i style="background:${color}"></i>${text}</span>`;
    $('systemMapLegend').innerHTML = summary
      ? swatch(model.COLORS.above,'Above a study comparison level') + swatch(model.COLORS.below,'No exceedance identified; complete data') + swatch(model.COLORS.incomplete,'Incomplete comparison data')
      : model.concentrationColors.map((c,i) => swatch(c, ['Detected: below 4','4 to below 10','10 to below 20','20 or more'][i])).join('') + swatch(model.COLORS.nondetect,'Below reporting limit') + swatch(model.COLORS.incomplete,'Incomplete comparison data');
    $('systemMapMetricNote').textContent = summary
      ? 'Historical study comparisons, not current compliance or safety. Blue requires complete comparison data; it does not mean no PFAS were detected. Numbered circles count systems; select one to zoom in.'
      : `Colors show ${model.CHEMICALS[$('systemMapChemical').value].short} in parts per trillion (ppt), using the highest yearly average among sampling locations. Gray marks incomplete comparisons, even when an available average is shown. White means below the reporting limit, not zero. Numbered circles count systems.`;
  }
  function renderMarkers(fit = false, afterRender = null) {
    if (!map) return;
    const version = ++renderVersion;
    renderLegend();
    clusters.clearLayers();
    const rows = filteredSystems();
    const layers = rows.filter(s => markers.has(s.pwsid)).map(s => {
      const marker = markers.get(s.pwsid);
      marker.setIcon(icon(s)).setTooltipContent(tooltip(s));
      return marker;
    });
    // Add in short batches; newer filter selections cancel stale batches.
    let n = 0;
    function addNext() {
      if (version !== renderVersion) return;
      clusters.addLayers(layers.slice(n, n + 600));
      n += 600;
      if (n < layers.length) requestAnimationFrame(addNext);
      else {
        if (fit && layers.length) map.fitBounds(L.latLngBounds(layers.map(m => m.getLatLng())), {padding:[32,32],maxZoom:10});
        if (afterRender) afterRender();
      }
    }
    addNext();
    $('systemMapCoverage').textContent = `${layers.length.toLocaleString()} of ${rows.length.toLocaleString()} systems mapped${$('systemMapState').value ? ' in this state or territory' : ' in the website dataset'}. ${(rows.length - layers.length).toLocaleString()} without usable geography remain searchable. Location snapshot: ${locations.retrieved_utc.slice(0,10)}.`;
    renderSearch();
    if (selected) showDetails(selected);
  }
  async function read(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Map data unavailable: ' + path);
    return response;
  }
  async function initialize() {
    try {
      const responses = await Promise.all([read(base+'website_lookup_compact.json'),read('/data/system-map-locations.json'),read(base+'website_metadata.json'),read(base+'website_monitoring_periods.json'),read(base+'lookup-evidence.json'),read('/config/state_names.json')]);
      const lookupText = await responses[0].text();
      const lookup = JSON.parse(lookupText);
      const [geo, metadata, periodData, evidence, stateNames] = await Promise.all(responses.slice(1).map(r => r.json()));
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(lookupText))), x => x.toString(16).padStart(2,'0')).join('');
      if ([geo,metadata,periodData,evidence].some(d => d.release_id !== lookup.release_id) || geo.lookup_sha256 !== digest) throw new Error('Map data release mismatch');
      PFASLookupEvidence.validate(evidence,lookup,digest);
      locations = geo;
      systems = model.hydrate(lookup).sort((a,b) => a.ucmr_pws_name.localeCompare(b.ucmr_pws_name) || a.pwsid.localeCompare(b.pwsid));
      systems.forEach(s => { s._comparisonCoverage = PFASLookupEvidence.coverage(s,evidence.systems[s.pwsid]); });
      byId = new Map(systems.map(s => [s.pwsid,s]));
      periods = new Map(model.hydrate(periodData).map(s => [s.pwsid,s]));
      Object.keys(model.CHEMICALS).forEach(k => { const o=document.createElement('option'); o.value=k;o.textContent=model.CHEMICALS[k].name;$('systemMapChemical').appendChild(o); });
      [...new Set(systems.map(s => s.sdwis_state_code))].sort((a,b) => (stateNames[a] || a).localeCompare(stateNames[b] || b)).forEach(state => { const o=document.createElement('option');o.value=state;o.textContent=stateNames[state] || state;$('systemMapState').appendChild(o); });
      if (!window.L?.markerClusterGroup) throw new Error('Map library unavailable');
      map = L.map('systemMap',{scrollWheelZoom:false,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([38,-97],4);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',() => {
        $('systemMapStatus').textContent='Some background map tiles could not load. The system markers, search, and results remain available.';
        $('systemMapStatus').hidden=false;
      }).addTo(map);
      clusters = L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:45,animate:false,
        iconCreateFunction: cluster => L.divIcon({html:`<span aria-label="${cluster.getChildCount().toLocaleString()} water systems; zoom in">${cluster.getChildCount().toLocaleString()}</span>`,className:'system-map-cluster',iconSize:[38,38]})});
      map.addLayer(clusters);
      for (const s of systems) {
        const row = geo.locations[s.pwsid];
        if (!row) continue;
        if (!Number.isFinite(row[0]) || !Number.isFinite(row[1]) || Math.abs(row[0]) > 180 || Math.abs(row[1]) > 85) throw new Error('Invalid map coordinate');
        const marker = L.marker([row[1],row[0]],{icon:icon(s),keyboard:true,title:`${s.ucmr_pws_name}; ${community(s) || s.sdwis_state_code}`,alt:`Select ${s.ucmr_pws_name}`}).bindTooltip(tooltip(s),{direction:'top'});
        marker.on('click',() => showDetails(s,true));
        markers.set(s.pwsid,marker);
      }
      $('systemMapStatus').hidden = true;
      $('systemMapSearch').disabled = false;
      $('systemMapState').disabled = false;
      const direct = byId.get(new URLSearchParams(location.search).get('system'));
      resetView();
      renderMarkers(false,direct ? () => selectSystem(direct,false) : null);
      new ResizeObserver(() => map.invalidateSize()).observe($('systemMap'));
    } catch (error) {
      console.error(error);
      $('systemMapStatus').textContent = 'The system map could not load. Please try the state overview or ZIP lookup.';
      $('systemMapStatus').hidden = false;
      $('systemMapStatus').classList.add('is-error');
    }
  }
  $('systemMapMetric').addEventListener('change',() => renderMarkers());
  $('systemMapChemical').addEventListener('change',() => renderMarkers());
  $('systemMapState').addEventListener('change',() => {
    selected=null;
    history.replaceState({},'',location.pathname);
    renderMarkers(Boolean($('systemMapState').value));
    if (!$('systemMapState').value) resetView();
    $('systemMapDetails').classList.remove('has-selection');
    $('systemMapDetails').textContent='Select a water system to view its details.';
  });
  $('systemMapSearch').addEventListener('input',renderSearch);
  $('systemMapSearch').addEventListener('keydown',event => { if (event.key === 'Escape') { event.target.value='';renderSearch(); } });
  $('systemSearchResults').addEventListener('click',event => {
    const button = event.target.closest('button[data-system]');
    if (button) selectSystem(byId.get(button.dataset.system));
  });
  function resetView() {
    if (!map) return;
    const stateLayers = $('systemMapState').value ? filteredSystems().map(s => markers.get(s.pwsid)).filter(Boolean) : [];
    const bounds = stateLayers.length ? L.latLngBounds(stateLayers.map(m => m.getLatLng())) : L.latLngBounds([[24,-125],[50,-66]]);
    map.fitBounds(bounds,{padding:[20,20],maxZoom:10});
  }
  $('systemMapReset').addEventListener('click',resetView);
  $('systemMapFullscreen').addEventListener('click',async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen();else await $('systemMapFrame').requestFullscreen(); }
    catch (_) {
      const expanded=$('systemMapFrame').classList.toggle('system-map-expanded');
      $('systemMapFullscreen').textContent=expanded ? 'Exit fullscreen' : 'Fullscreen';
      map?.invalidateSize();
    }
  });
  document.addEventListener('fullscreenchange',() => { $('systemMapFullscreen').textContent=document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';map?.invalidateSize(); });
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && $('systemMapFrame').classList.contains('system-map-expanded')) {
      $('systemMapFrame').classList.remove('system-map-expanded');
      $('systemMapFullscreen').textContent='Fullscreen';map?.invalidateSize();
    }
  });
  document.querySelectorAll('[data-map-view]').forEach(button => button.addEventListener('click',() => {
    const systemView = button.dataset.mapView === 'systems';
    $('systemView').hidden = !systemView;$('stateView').hidden = systemView;
    document.querySelectorAll('[data-map-view]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
    if (systemView) map?.invalidateSize();else window.dispatchEvent(new Event('resize'));
  }));
  initialize();
})();
