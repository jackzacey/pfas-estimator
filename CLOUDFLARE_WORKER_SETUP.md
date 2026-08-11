# PFAS Groq Worker deployment

The website now sends two restricted request types to the Worker:

- `summary`: one cached AI request creates the ZIP overview and every compound explanation.
- `chat`: a short, ZIP-grounded health conversation with limited history.

The Worker no longer accepts arbitrary Groq models, token counts, or raw prompts.

## Deploy the Worker

1. Open Cloudflare **Workers & Pages** and select `pfas-groq-proxy`.
2. Open **Edit Code** and replace the existing Worker with `cloudflare-worker.js`.
3. Keep `GROQ_API_KEY` configured as an encrypted secret. Never paste the key into the Worker source.
4. Deploy the Worker.
5. In the Worker's settings, add a Rate Limiting binding named `AI_RATE_LIMITER` when available. A suitable starting rule is 12 requests per 60 seconds per key. The Worker also includes a best-effort burst guard when this binding is absent.

## Configure the search counters

CounterAPI V1 has been removed. The search and patient-case counters now use a Cloudflare D1 database through the same Worker.

1. In Cloudflare, open **Storage & Databases**, then **D1 SQL Database**.
2. Create a database named `pfas-estimator-counters`.
3. Return to the `pfas-groq-proxy` Worker and open **Settings**, then **Bindings**.
4. Add a **D1 database** binding with the variable name `COUNTERS_DB` and select `pfas-estimator-counters`.
5. Deploy `cloudflare-worker.js` before uploading the updated website files.

No SQL setup is required. The Worker creates the counter table and records when they are first used. Both badges load their current totals when the homepage opens, and valid ZIP searches increment the search total atomically.

The default allowed browser origins are:

- `https://pfasestimator.org`
- `https://www.pfasestimator.org`
- `http://localhost:8000`
- `http://127.0.0.1:8000`

To override that list, add a plain-text Worker variable named `ALLOWED_ORIGINS` containing comma-separated origins.

## Rotate the Groq key

After the restricted Worker is deployed, create a replacement Groq API key, update the `GROQ_API_KEY` Worker secret, verify the site, and revoke the previous key. Rotating a key does not reset an organization-level daily quota; it prevents continued use through the old key after the quota resets.

## Deployment order

Push the updated website first, then deploy the Worker immediately afterward. The old Worker does not understand the new request format, so AI requests may be unavailable during the short interval between those two deployments.
