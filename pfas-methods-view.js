/* Optional provider-specific calculation detail, loaded on the Methods page. */
(async function(){
  'use strict';
  const id=new URLSearchParams(location.search).get('system');
  const view=new URLSearchParams(location.search).get('view');
  const extra=['lithium','lcr'].includes(view);
  const target=document.getElementById(extra?'additionalCalculation':'providerCalculation');
  if(!id||!target)return;
  target.hidden=false;
  target.textContent='Loading the selected provider’s calculation records…';
  try {
    if(extra) {
      const {systems}=await DrinkingWaterRecords.query({id,mode:view});
      const system=systems[0];
      if(!system){target.textContent='No matching records in this snapshot. Confirm the system ID with your provider.';return;}
      target.replaceChildren();
      const heading=document.createElement('h3');heading.textContent=system.name;target.appendChild(heading);
      const note=document.createElement('p');note.textContent=`System ID ${id}. Source records retained for the selected result view.`;target.appendChild(note);
      const detail=document.createElement('div');detail.innerHTML=DrinkingWaterRecords.renderSourceRecords(system,view);target.appendChild(detail);
      return;
    }
    const response=await fetch('/analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json');
    if(!response.ok)throw new Error('Provider data unavailable');
    const raw=await response.text();
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    const sha=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
    if(sha!=='d550e4671692540111f41da3f050ca866b9b4a7a5e8afac5f424ee36c29ef314')throw new Error('Provider checksum mismatch');
    const data=JSON.parse(raw),row=data.systems.find(r=>r[0]===id);
    if(!row){target.textContent='This system is not in the fixed PFAS release. Confirm the ID with your provider.';return;}
    const system=Object.fromEntries(data.columns.map((key,i)=>[key,row[i]]));
    const locations=await PFASSampleTrace.query(system);
    target.replaceChildren();
    const heading=document.createElement('h3');heading.textContent=system.ucmr_pws_name;target.appendChild(heading);
    const note=document.createElement('p');note.textContent=`System ID ${id}. Expand a location and chemical to inspect source records and the average calculation.`;target.appendChild(note);
    const detail=document.createElement('div');detail.innerHTML=PFASSampleTrace.render(locations,system,'en');target.appendChild(detail);
  } catch(error){target.textContent='The sample records could not be loaded or verified. Reload to retry; the original EPA links remain available below.';console.error(error);}
})();
