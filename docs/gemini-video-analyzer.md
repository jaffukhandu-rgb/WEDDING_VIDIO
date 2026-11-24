# Optional Gemini-assisted Video + HTML analyzer

This feature augments, but never replaces, the existing browser pixel analyzer.
It does **not** allow Gemini to write or execute HTML/JavaScript.

## Configure

1. Create a Gemini Developer API key in Google AI Studio.
2. Add `GEMINI_API_KEY=your-key` to the **renderer server environment only** (for example its local `.env` file). Do **not** add it to Vite variables or commit it.
3. Optionally set `GEMINI_MODEL=gemini-3.5-flash` on the renderer. It defaults to this model, so no new setting is required for an existing key. Allowed values are `gemini-3.5-flash` and `gemini-3.5-flash-lite` only.
4. Keep the existing `ADMIN_API_KEY` configured. The new routes require the same admin authentication.
5. Restart the existing renderer using the project's normal command.
6. In Admin Studio, upload a portrait MP4 through **Video + HTML** or choose an existing uploaded video from the library. No new UI control is required.

When Gemini is configured, the browser samples 8–18 small, timestamped JPEGs (adapted to the video duration) from the selected MP4 and sends those frames to the authenticated local renderer. The renderer uses **Gemini 3.5 Flash** by default and requests a structured JSON scene plan with safe text areas, estimated timing, and (when possible) two or three readable invitation panels. If Google reports that Gemini 3.5 Flash is unavailable (404), it retries **once** with Gemini 3.5 Flash-Lite. Other failures use the existing local analyzer without another paid API call.

**Important:** This is *sampled-frame* visual understanding, not complete frame-by-frame video analysis. It cannot guarantee frame-exact transitions or a long readable programme on a short ending. If a validated multi-panel timeline is unavailable, the original single-overlay HTML is generated. The existing two-scene HTML structure, CONFIG, and previous templates remain compatible. Generated V2 timelines show names, details and optional event pages against the video playhead. For multiple events, the admin must first define the appropriate number of event entries in the template's CONFIG; the existing customer editor intentionally does not change event counts.

## Privacy, availability, and costs

- Enabling Gemini means sampled frames from videos are transmitted to Google. Do not enable for footage whose owner has not consented to that processing.
- Gemini Developer API free access and limits depend on model, region, account and current quotas. Review the current [pricing](https://ai.google.dev/gemini-api/docs/pricing) and provider data-use terms before production use. ChatGPT and Gemini consumer subscriptions do not automatically grant unlimited Gemini API quota.
- The Gemini key never reaches the browser. The backend sends only the sampled JPEGs, their timestamps and the duration—not the full original MP4 or customer-entered text.
- If the key is absent, a request times out, Gemini fails, or its JSON fails validation, the *existing local analyzer* generates the invitation instead. Export and rendering stay unchanged.

## Safety and checks

- Server endpoints: authenticated `GET/POST /api/admin/video-analysis`.
- Input: 5–18 chronological JPEG samples, each at most 180,000 base64 characters; bounded duration and total size.
- Output: numeric, constrained layout and reveal time; optional validated scene descriptors and ordered 2–3-panel timeline; enumerated text colors/confidence; limited warning text.
- No AI-generated scripts, HTML, external URLs, dependencies, storage changes, or database migrations.
- To test: `npm test`, `npm run build`, and a real MP4 upload → preview → final export with and without a Gemini key. Check the logs for errors, not the key.

The backend model can be configured with `GEMINI_MODEL` and defaults to `gemini-3.5-flash`. `gemini-3.5-flash-lite` is the only supported alternative. The model fallback applies to unavailable-model errors, **not** invalid API keys, permission problems, exhausted quotas, malformed responses, or timeouts. Those continue through the existing local analyzer. A model advertised by Google does not guarantee successful inference for a particular key or quota.

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
