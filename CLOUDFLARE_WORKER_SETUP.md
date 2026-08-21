# PFAS Groq Worker deployment

The website sends two restricted request types to the Worker:

- `chat`: one request only when a visitor asks a question. The prompt receives a compact, system-level context and limited conversation history.
- `counter`: atomic reads or increments for the public search and reported-clinical-use counters.

The deterministic ZIP lookup, system results, map, state table, and state pages make no AI request. The Worker does not accept arbitrary Groq models, token counts, or raw system prompts.

## Deploy the Worker

1. Open Cloudflare **Workers & Pages** and select `pfas-groq-proxy`.
2. Open **Edit Code** and replace the existing Worker with `cloudflare-worker.js`.
3. Keep `GROQ_API_KEY` configured as an encrypted secret. Never paste the key into the Worker source.
4. Do not set `GROQ_MODEL` unless you intentionally want to override the defaults. The Worker now uses `openai/gpt-oss-120b`, with `openai/gpt-oss-20b` as a model-availability fallback. The former `llama-3.3-70b-versatile` model was retired for free and developer projects on August 16, 2026.
5. Deploy the Worker.
6. In the Worker's settings, add a Rate Limiting binding named `AI_RATE_LIMITER` when available. A suitable starting rule is 12 requests per 60 seconds per key. The Worker also includes a best-effort burst guard when this binding is absent.

## Configure the search counters

CounterAPI V1 has been removed. The search and reported-clinical-use counters now use a Cloudflare D1 database through the same Worker.

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

Deploy the updated Worker prompt first, verify one chat and both counters, then push the website. The current production Worker already understands the chat request shape, so the deterministic lookup remains safe if the two deployments are separated; deploying the Worker first ensures the stricter system-association language is active before the new interface appears.
