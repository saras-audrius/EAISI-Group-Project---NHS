# Data Agent — setup for segment 7 and the app's `/ask` page

Item: **Data agent** in `Healthcare-FabCon2026-Demo`, filed under `50_Delivery`.
Suggested name: `knee_risk_agent` (the name is free; the app only needs the item id).

## 1. Data source: the Lakehouse, not the app's SQL database

Connect **`NHS_PROMs_LH`** (the Lakehouse) and select these tables only:

| Table | Why the agent needs it |
|---|---|
| `gold.patient_risk` | the score, band, provider, surgery date — every question starts here |
| `gold.risk_explanation` | six rows per patient; the only way "why" is answerable as SQL |
| `gold.threshold_sweep` | the cut-off what-if (written by notebook 42; if absent, skip and the sweep question falls back to the built-in engine) |
| `silver.provider` | provider name, type, region for the comparison question |

Do **not** connect the Rayfin SQL database (`knee-risk-clinician-app-…`). Three reasons:

1. **Grounding lives in gold.** Notebooks 30 and 50 wrote table and column comments on
   the gold tables; the Data Agent and Fabric IQ read that metadata. The SQL database has
   camelCase columns and no comments — the agent would guess.
2. **The story.** "Same OneLake tables the app was scored from" is the segment-7 line.
   Reading the app's own copy breaks the one-estate argument.
3. **RLS in the SQL database is enforced by Data API Builder**, which the agent does not
   go through. Connecting it would bypass the app's policy with nothing in its place.

Fewer tables = better answers. Leave `bronze.*`, `ml.*` and `gold.knee_features` out.

## 2. Agent instructions (paste into *AI instructions*)

```
You answer questions from an orthopaedic clinician about patients awaiting knee
replacement, using only the connected tables. The score is a calibrated probability
of a POOR outcome: an Oxford Knee Score gain of 7 points or fewer at six months.

Rules:
- risk_poor_outcome is a probability 0-1. Report it as a percentage with one decimal.
- risk_band values are low (<20%), moderate (20-40%), high (40-60%), very_high (>60%).
  These are clinical policy thresholds, not model output. Say so if asked.
- "Flagged" means risk_poor_outcome >= 0.50, the operating cut-off in use. If the user
  gives a different cut-off, use theirs and say which one you used.
- To explain WHY a patient scores what they do, join gold.risk_explanation on
  episode_id and list feature_label in rank order, with direction. Never show the raw
  feature column name to the user; always use feature_label. Contributions are
  log-odds; positive raises risk.
- "My patients" or "our patients" means provider_code = the user's provider, which the
  user will state. If they have not, ask which provider code, do not guess.
- Always say how many rows the answer is based on.
- Do not give clinical advice. If asked whether to operate, cancel, prescribe, or what
  the clinician should do, decline and say the decision is theirs to record in the
  clinician app. You may still report the score and its drivers.
- If a question cannot be answered from these tables, say so plainly rather than
  approximating. Do not invent columns or patients.
- When comparing providers, always add that the flag rate reflects the case mix a
  provider sees and not the quality of its surgery: a unit treating patients with
  worse pre-operative scores will flag more of them. Say that the NHS PROMs
  predicted score is the case-mix adjusted instrument for provider benchmarking
  and this model is not. Never rank providers as better or worse.
```

## 3. Data source instructions (on the Lakehouse source)

```
gold.patient_risk: one row per pre-operative patient. Key is episode_id. display_name is
a pseudonym. provider_code joins to silver.provider.provider_code.
gold.risk_explanation: six rows per episode_id, rank 1 = strongest. direction is
'increases_risk' or 'reduces_risk'. Prefer feature_label in answers.
gold.threshold_sweep: one row per candidate cut-off (threshold). Counts are per 1,000
patients on the held-out test set. is_chosen marks the cut-off in use.
silver.provider: provider dimension. university_hospital and independent_hospital are
0/1 flags; both 0 means an NHS trust.
Dates are DATE. Use CURRENT_DATE for "next two weeks".
```

## 4. Example queries (add as *example queries*, one per scripted question)

Q: Which of my pre-operative patients are flagged, and why? (provider RJ1)
```sql
SELECT r.display_name, ROUND(r.risk_poor_outcome*100,1) AS risk_pct, r.risk_band,
       r.surgery_scheduled_date,
       CONCAT_WS('; ', COLLECT_LIST(e.feature_label)) AS top_drivers
FROM gold.patient_risk r
JOIN gold.risk_explanation e
  ON e.episode_id = r.episode_id AND e.rank <= 3 AND e.direction = 'increases_risk'
WHERE r.provider_code = 'RJ1' AND r.risk_poor_outcome >= 0.50
GROUP BY r.display_name, r.risk_poor_outcome, r.risk_band, r.surgery_scheduled_date
ORDER BY r.risk_poor_outcome DESC
```

Q: Which factors contributed most for this patient? (episode_id = …)
```sql
SELECT rank, feature_label, ROUND(contribution, 3) AS contribution, direction
FROM gold.risk_explanation
WHERE episode_id = '<MARGARET_EPISODE_ID>'
ORDER BY rank
```

Q: How does our flag rate compare with other providers?
```sql
SELECT r.provider_code, COUNT(*) AS patients,
       ROUND(AVG(r.risk_poor_outcome)*100, 1) AS mean_risk_pct,
       ROUND(100.0 * SUM(CASE WHEN r.risk_poor_outcome >= 0.50 THEN 1 ELSE 0 END) / COUNT(*), 1) AS flag_rate_pct
FROM gold.patient_risk r
GROUP BY r.provider_code
HAVING COUNT(*) >= 20
ORDER BY flag_rate_pct DESC
```

Q: What happens to the flagged count at a threshold of 0.7?
```sql
SELECT COUNT(*) AS flagged,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM gold.patient_risk), 1) AS pct_of_cohort
FROM gold.patient_risk
WHERE risk_poor_outcome >= 0.70
```

Q (the refusal, on purpose): Should we cancel Margaret's operation? → no query; the
instructions make it decline.

## 5. Publish, then wire the app

1. **Publish** the agent. The MCP endpoint does not exist until it is published.
2. Settings → *Model Context Protocol* → copy the server URL. The second GUID is the
   agent id.
3. `fabric/rayfin-clinician-app/tools/.env.agent`:
   ```
   FABRIC_WORKSPACE_ID=1b136d57-daff-4d47-85f6-a2cfcd405736
   FABRIC_DATA_AGENT_ID=<agent id>
   ```
4. `npm run agent:setup` once (creates `tools/.venv`; Homebrew Python is externally
   managed, so a bare `pip install` is refused). Then
   `az login --scope "https://api.fabric.microsoft.com/.default"`, `npm run agent:proxy`,
   and `npm run dev:agent` — or set `VITE_AGENT_PROXY_URL` in `.env.local` before building.

   The SDK is version-adaptive: `mcp` 1.x and 2.x both work (2.x renamed
   `streamablehttp_client` and `inputSchema`). `GET /health` on the proxy confirms the ids
   without touching the agent.

## 6. The permission caveat, stated honestly

The app's row-level security is per **clinician** (Data API Builder). The Lakehouse has
no such policy, so the agent sees the whole cohort for anyone who can read the Lakehouse.
"Permission-aware" on stage means: the presenter's own Entra identity is what the proxy
sends, and a user with no access to the workspace gets nothing. If you want "my patients"
to be enforced rather than requested in the prompt, apply OneLake security (or SQL
endpoint RLS on `provider_code`) to `NHS_PROMs_LH` for the second demo account before
freeze. Otherwise keep the provider code in the question, as the example above does.

Tenant prerequisites: F2+ capacity and the two *cross-geo for AI* settings on
(`data-agent-tenant-settings`), otherwise the agent will not create.
