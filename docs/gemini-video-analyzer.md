# Optional Gemini-assisted Video + HTML analyzer

This feature augments, but never replaces, the existing browser pixel analyzer.
It does **not** allow Gemini to write or execute HTML/JavaScript.

## Configure

1. Create a Gemini Developer API key in Google AI Studio.
2. Add `GEMINI_API_KEY=your-key` to the **renderer server environment only** (for example its local `.env` file). Do **not** add it to Vite variables or commit it.
3. Set the model choices in your **private** renderer environment only after the diagnostic passes:
   ```dotenv
   GEMINI_MODEL=gemini-3.5-flash-lite
   GEMINI_FALLBACK_MODEL=gemini-3.1-flash-lite
   ```
   These are the defaults for an unset configuration. Explicit existing model settings are respected. Server-approved IDs are `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, legacy `gemini-3.5-flash`, `gemini-3.6-flash` and `gemini-3.8-flash`. Set `GEMINI_FALLBACK_MODEL=none` to disable switching. Availability and quality still require a live test.
4. Keep the existing `ADMIN_API_KEY` configured.
5. Restart the renderer with its normal command.
6. Use **Video + HTML** in Admin Studio, optionally with a creative prompt.

The browser samples up to 14 timestamped JPEGs for scene analysis and up to three for a separate design request. Each stage has a 90-second backend budget (105-second browser timeout). Fast transient upstream failures may get one delayed retry, then one fallback model attempt; a missing model or slow timeout can switch directly. The entire stage, including delays, stays within the budget. Quota, authentication, invalid request and invalid output errors are not retried automatically. Successful stages are retained; managed style edits preserve existing code and timing.

**Important:** This is *sampled-frame* visual understanding, not complete frame-by-frame video analysis. It cannot guarantee frame-exact transitions or a long readable programme on a short ending. If a validated multi-panel timeline is unavailable, the original single-overlay HTML is generated. The existing two-scene HTML structure, CONFIG, and previous templates remain compatible. Generated V2 timelines show names, details and optional event pages against the video playhead. For multiple events, the admin must first define the appropriate number of event entries in the template's CONFIG; the existing customer editor intentionally does not change event counts.

## Privacy, availability, and costs

- Enabling Gemini means sampled frames from videos are transmitted to Google. Do not enable for footage whose owner has not consented to that processing.
- Gemini Developer API free access and limits depend on model, region, account and current quotas. Review the current [pricing](https://ai.google.dev/gemini-api/docs/pricing) and provider data-use terms before production use. ChatGPT and Gemini consumer subscriptions do not automatically grant unlimited Gemini API quota.
- The Gemini key never reaches the browser. The backend sends sampled JPEGs, timestamps, duration, bounded readable-window data, and optional creative instructions/validated prior design—not the full MP4 or customer-entered configuration fields. Do not put personal data in the creative prompt.
- If the key is absent, a request times out, Gemini fails, or its JSON fails validation, the *existing local analyzer* or standard design is used for the failed stage; failed follow-up edits preserve existing HTML. Export and rendering stay unchanged.

## Safety and checks

- Server endpoints: authenticated `GET/POST /api/admin/video-analysis` and `POST /api/admin/video-design`.
- Input: 5–18 chronological JPEG samples, each at most 180,000 base64 characters; bounded duration and total size.
- Output: numeric, constrained layout and reveal time; optional validated scene descriptors and ordered 2–3-panel timeline; enumerated text colors/confidence; limited warning text.
- No AI-generated scripts, HTML, external URLs, dependencies, storage changes, or database migrations.
- To test: `npm test`, `npm run build`, and a real MP4 upload → preview → final export with and without a Gemini key. Check the logs for errors, not the key.

A model advertised by Google does not guarantee successful inference for a particular key or quota. Admin Studio reports the actual successful model per stage, including a fallback model. Safe diagnostics include numeric upstream HTTP status and a fixed provider status when available; no raw provider bodies are returned.

## Diagnose a 502 from the browser

A successful `GET /api/admin/video-analysis` with `enabled:true` **only means the renderer can see a configured key**. It does not establish that Google accepted the key or can perform inference.

After attempting an upload, open Chrome DevTools → Network → Fetch/XHR, select the failing `POST /api/admin/video-analysis`, then open **Response**. The backend now returns a safe `reason` code:

- `invalid_key`, `permission_denied`: check API key permissions or project access with Google AI Studio.
- `quota_exceeded`: inspect the key's free-tier/paid API quotas; consumer subscriptions are not API quota.
- `model_unavailable`: selected Gemini model is not supported for this API key/project.
- `invalid_request`: Google rejected the model request, parameters or image format.
- `provider_unavailable`, `timeout`: upstream availability/network issue.
- `empty_response`, `invalid_json`, `invalid_layout`: Gemini responded but did not return a valid layout plan.

The Admin Studio's analysis report includes the same safe reason; **never share request headers, keys, or the full frame payload**. The original analyzer still creates a template on any Gemini failure.

The Gemini 3 request uses `thinkingLevel: low`, keeps the default temperature, and reserves 2600 output tokens for structured JSON; coarse keyframes cover the complete MP4, with extra samples near detected motion boundaries throughout the clip. The browser measures low-resolution motion across the whole video, refines up to eight boundary regions, and intersects Gemini's safe surface scenes with quiet intervals. Panels do not cross detected motion gaps. Personalized reading time is estimated from word counts and the schedule can be reassigned across the verified safe windows; insufficient time is flagged in runtime validation. Font sizes are fitted to the actual panel. Motion thresholds and reading speed are estimates, not guarantees. Timing is still an estimate from sampled frames and should be visually reviewed, especially on transitions.

## Phase 1 — model diagnostic (run locally before switching production settings)

From the repository root with Node.js 22+ and existing dependencies installed:

```powershell
node --env-file=.env scripts/diagnose-gemini.js
```

This tests the two Flash-Lite candidates independently: model metadata, text generation, production scene JSON schema with valid JPEGs, production style schema, and a follow-up edit. No automatic retries or fallback are used by the diagnostic; successful output cannot be attributed to another model. The default synthetic board tests connectivity and schema acceptance, not real footage quality.

To compare a consented portrait test MP4, use the existing ffmpeg-static binary:

```powershell
node --env-file=.env scripts/diagnose-gemini.js --video "C:\path\to\test.mp4"
```

This sends representative JPEGs to Google (not the entire MP4). Frame sampling is a diagnostic approximation, not the browser's motion-refined sampler. To include the low-quota quality model, explicitly pass:

```powershell
node --env-file=.env scripts/diagnose-gemini.js --models gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash
```

Each model uses up to four generation calls plus one metadata request. Review timings, scene summaries and safe style settings; a pass on the synthetic board does not guarantee high-quality timing on real video. Never share the private .env, request headers or frame payloads. The CLI prints safe status codes and deliberately omits provider bodies.

## Implementation checklist

- [x] Add standalone exact-model diagnostic; valid synthetic JPEG and optional real video input.
- [x] Configurable server-approved primary and fallback models.
- [x] Bounded delayed transient recovery and actual-model reporting.
- [x] No automatic retry on exhausted quota, invalid credentials or invalid output.
- [x] Preserve existing scene/design separation, safe timing, CSS-only follow-up and unified loader.
- [x] Add focused mocked regression tests for model switching and diagnostics.
- [ ] Run the diagnostic against this project's live API key and compare real-video/design quality.
- [ ] Set the private environment model choices using the diagnostic results; restart renderer.
- [ ] Run full npm test and npm run build on the local checkout.
- [ ] Verify upload, follow-up prompt, customer form, preview and MP4 export in the browser.
- [ ] Optional later experiment: Gemma 4 and native MP4 analysis (not integrated into production).

### Follow-up reliability checkpoint

- [x] Live synthetic diagnostic reported by the developer: both Lite model IDs and text/initial design requests worked; 3.5 Flash Lite also passed scene analysis. The other model reported HTTP 503 for scene and follow-up. Neither passed the AI follow-up check.
- [x] Separate exact local edits from creative AI edits. Examples: `Set nameSize to 10.5 and remove border`, `Set body size to 4.2`. Only fully recognized commands are applied locally to verified managed CSS; mixed/creative prompts still use Gemini. Out-of-range exact values are rejected rather than clamped.
- [x] Separate initial-design and follow-up prompts; preserve unchanged properties and validate all returned settings.
- [x] Diagnostic distinguishes invalid style schema (`invalid_layout`, `design_schema`) from valid output that missed requested changes (`followup_mismatch`). The local exact-edit check is logged separately and never counted as an AI model pass.
- [ ] Re-run live model diagnostic; compare follow-up results and real-video quality.
- [ ] Verify precise local follow-up and creative AI follow-up in Admin Studio; run full build/test and preview/export checks.
