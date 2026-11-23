# Optional Gemini-assisted Video + HTML analyzer

This feature augments, but never replaces, the existing browser pixel analyzer.
It does **not** allow Gemini to write or execute HTML/JavaScript.

## Configure

1. Create a Gemini Developer API key in Google AI Studio.
2. Add `GEMINI_API_KEY=your-key` to the **renderer server environment only** (for example its local `.env` file). Do **not** add it to Vite variables or commit it.
3. Keep the existing `ADMIN_API_KEY` configured. The new routes require the same admin authentication.
4. Restart the existing renderer using the project's normal command.
5. In Admin Studio, upload a portrait MP4 through **Video + HTML** or choose an existing uploaded video from the library. No new UI control is required.

When Gemini is configured, the browser samples nine small, timestamped JPEGs from the selected MP4 and sends those frames to the authenticated local renderer. The renderer sends the samples to Gemini 2.5 Flash, requests JSON fields for text reveal time, safe rectangle, text ink, confidence, and warnings, and validates the result before using it.

**Important:** This is *sampled-frame* visual understanding, not complete frame-by-frame video analysis. It improves semantic scene awareness but cannot guarantee exact transition timing, perfectly clear text regions, or complete event-card layouts. Existing generated invitation HTML stays compatible. Manually review video and text before publishing.

## Privacy, availability, and costs

- Enabling Gemini means sampled frames from videos are transmitted to Google. Do not enable for footage whose owner has not consented to that processing.
- Gemini Developer API free access and limits depend on model, region, account and current quotas. Review the current [pricing](https://ai.google.dev/gemini-api/docs/pricing) and provider data-use terms before production use. ChatGPT and Gemini consumer subscriptions do not automatically grant unlimited Gemini API quota.
- The Gemini key never reaches the browser. The backend sends only the sampled JPEGs, their timestamps and the duration—not the full original MP4 or customer-entered text.
- If the key is absent, a request times out, Gemini fails, or its JSON fails validation, the *existing local analyzer* generates the invitation instead. Export and rendering stay unchanged.

## Safety and checks

- Server endpoints: authenticated `GET/POST /api/admin/video-analysis`.
- Input: 5–10 chronological JPEG samples, each at most 180,000 base64 characters; bounded duration and total size.
- Output: numeric, constrained layout and reveal time; enumerated text colors/confidence; limited warning text.
- No AI-generated scripts, HTML, external URLs, dependencies, storage changes, or database migrations.
- To test: `npm test`, `npm run build`, and a real MP4 upload → preview → final export with and without a Gemini key. Check the logs for errors, not the key.

The engine uses a fixed model name `gemini-2.5-flash`; provider availability may change. If it becomes unavailable, the local analyzer continues to function.

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

The request now disables extra Gemini 2.5 Flash thinking and reserves more output tokens for JSON; image sampling concentrates around the locally predicted final scene. Timing is still an estimate from sampled frames and should be visually reviewed, especially on transitions.
