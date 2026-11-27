# Phase 4 implementation and verification report

26 November 2026 · `jaffukhandu-rgb/WEDDING_VIDIO` · `feature/wedding-vintage-storybook`

**READY FOR REVIEW.** Studio published both kinds of invitation without generating an MP4. A customer personalized, previewed and downloaded both in Chromium. The final regression run passed 139 of 139 tests and Vite built the production assets. Live storage, physical devices and production process reaping still need acceptance testing.

## Checkout and review scope

| Item | Result |
| --- | --- |
| Phase 4 checkout | `/workspace/work/phase-4`, initially clean, on the requested feature branch |
| Starting HEAD | `87392bc736647b606160802eb3fa85b500139db4` |
| Final HEAD | `87392bc736647b606160802eb3fa85b500139db4` |
| Resume point | The implementation, focused tests and successful browser exports were already present. Verification resumed from their working-tree changes and logs. |
| Local review | Reviewed the original 15 changed or new files against the starting commit, then reviewed both additional regression files. The complete 17-file manifest follows. |
| Delivery | 11 tracked files modified, 6 new files including this report, zero staged files. No commit, push, merge or PR. |

This checkout includes the existing Phase 1–3 work and the gallery Retry behavior. The baseline at its own HEAD was 130 passing tests and a successful production build. The older Phase 1–3 SHAs in the conversation are not the base of this review. No credential, environment, dependency manifest or template artwork change is in the Phase 4 diff.

## Targeted corrections after the first review

**Secure, recoverable customer export.** At `src/components/CustomerInvitationDialog.jsx:80`, the dialog now gets a native UUIDv4 before taking the render lock, displaying progress or starting any timers. An insecure context gets HTTPS guidance. An absent or throwing UUID method produces an actionable browser error. The same preview and edit state survive. The Chromium regression exercises all three failure conditions, checks for zero submitted jobs and observed polls, edits the saved name, restores native Web Crypto, and observes two fresh, distinct UUIDv4s on retry.

**Browser shutdown ordering.** The timeout trace recorded two overlapping Playwright close calls. The cleanup call settled 51 ms before the original call. At the first sample after progress cleared, the original close still had 25 ms to run and a direct Chromium child was visible. The shared renderer now keeps and awaits the first close promise at `server/render-server.js:239`. In the corrected live trace, exactly one close ran for 104 ms. It settled before the first observation of an available slot, which had zero direct children. A separate deterministic HTTP regression holds that close open, verifies progress remains available and a competing request returns 429, then releases it and verifies progress returns 404.

**Defunct descendants.** PID 1 on this host is `tail`. A plain Playwright launch/open/close, independent of the application, produced the same exited descendants as a timed-out invitation job. Under a test-only Linux child subreaper each run adopted two Chromium processes and one crashpad process, all already in zombie state at collection. All three could be reaped, leaving no children. No persistent active browser or encoder leak was observed in these runs. The app change addresses the premature slot release. Production child adoption and reaping remain responsibilities of the deployment supervisor.

**Final diff review.** Reviewed admin publication gates and messaging, source revision and published-only lookup, validated CONFIG/media, sandbox and CSP, gallery state, UUID privacy, slot ownership, cancellation, and the timing of FFmpeg and Chromium shutdown. The two targeted application changes are confined to the dialog and the shared renderer. No new provider, dependency, worker or process scanner was added. Remaining operational findings include the socket-peer limiter behind proxies, uncapped accumulation of FFmpeg error output (`server/render-server.js:377`) and best-effort temporary-directory removal (`server/render-server.js:459`). These warrant staging observation under failed-media and filesystem-error conditions.

## Requirements and workflows

| Requirement | Implementation and evidence |
| --- | --- |
| **4.1 Optional admin export** | Previously Studio required a successful MP4 for the current prepared HTML before enabling publication. Now the admin prepares the template, runs validation, previews it and confirms visual review. Publish then becomes available. Generate MP4 remains a separate action. Both source types completed the Studio flow with zero admin render POSTs during publication. A subsequent optional admin export opened as a six-second video. |
| **4.2 Customer personalization** | Opening a published card fetches its master, then the existing analyzer supplies its supported scalar fields, event fields and actual photo slots. The form supports partner names, date, time, venue, address, message and blessing where declared. A shared validation path checks text, dates, event shape and selected photos. Unsupported fields are rejected. The fixture masters were byte-identical when fetched again after export. |
| **4.3 Personalized preview** | The customer prepares a copy of the source in the native dialog. The existing template engine applies literal CONFIG overrides, initial bindings and the preview CSP. The iframe allows scripts in its isolated origin. Returning to editing retains the entered values. Customer preview makes no render request. |
| **4.4 Customer export** | Generate MP4 sends the published template ID, revision, editable data and selected media. The server re-fetches the published master, validates and prepares it, then uses the existing Chromium and FFmpeg renderer. Progress and errors are shown in the dialog. Download becomes available when the POST returns an MP4. Both paths produced valid H.264/AAC downloads. |

**HTML workflow.** Select a published design, edit its fields, attach photos to the offered slots and optionally select a soundtrack. Preview renders the original scenes with the new values. Edit returns to the same form. Generate and Download save the personalized MP4. In the desktop fixture, the preview showed the submitted name and decoded a 32-pixel PNG. The exported frame also contained the submitted name.

**Video + HTML workflow.** Select the published design and edit its CONFIG. Generated single-event boards keep duplicate date, time and venue fields in sync. The original background ID, layout, overlay timing and animations stay in the master. No background upload or AI analysis is part of personalization. The mobile-width fixture had zero photo inputs, mirrored the edited venue and exported the six-second source with its scheduled overlay.

## Architecture, APIs and storage

- The gallery keeps its catalogue Retry, thumbnail loading and per-category master cache. The customer editor owns transient form, preview, polling and download state. A low-specificity wrapping rule permits line breaks where the master layout allows them. Master-specific typography and panel sizes still determine fit.
- Public template detail responses include a source revision. Existing records use their stored source hash or a SHA-256 hash of the original HTML. Publication still writes the original source. The server requires a literal boolean confirmation on publication. Human review is an attestation, and Studio performs the browser runtime validation.
- `POST /api/customer/render` accepts a published ID, its revision, supported details/photos and optional soundtrack data. It rejects arbitrary HTML, background URLs and unsupported top-level properties. It accepts a UUIDv4 attempt ID in `X-Render-Job`. `GET /api/customer/render/progress` only returns the active customer job for the matching ID. The customer interface never needs an admin key. The ID is a bearer secret for progress.
- The MP4 is returned in the initiating response with `Cache-Control: no-store`. There is no public result lookup or permanent customer video library. The browser creates a download URL and revokes it when replaced or unmounted. Closing the dialog aborts its active request. A stale revision returns 409 and requires refreshing the gallery master.
- The public route admits one preparation at a time, before buffering JSON, and shares the existing render slot with admin exports. Its 36 MiB JSON cap applies before validation. Prepared HTML is limited to 25 MiB. A selected image is limited to 3 MiB and 32 megapixels, with a cumulative 64-megapixel limit. The server checks declared signatures/dimensions, and the browser also decodes selected images. Optional audio is limited to 8 MiB. The encoder uses format-specific demuxers and a restricted protocol list for customer audio.
- The per-process limiter admits six starts per minute per socket peer, with at most 1,024 peer entries. A busy renderer returns 429. Progress polling avoids overlapping polls. Client export has a 22-minute timeout. The renderer retains its 90-second initialization budget, bounded browser launch, encoder backpressure and duration-dependent 10–20 minute render watchdog. Its browser blocks external network requests and serves the selected background locally.
- Published templates and background references continue to use the existing MongoDB and Cloudinary/GridFS interfaces. The customer export path looks up a published record with a bounded query and prepares a copy in memory. It writes job files temporarily. There is no database migration, new collection, customer record, new service or new dependency.

## Changed files

| File | Reason |
| --- | --- |
| `admin.html` | Update Studio guidance for publication and optional MP4 export. |
| `src/admin-delivery.js` | Remove the exported-MP4 dependency from the publish button and retain prepared-state, runtime and manual review gates. |
| `src/admin-studio.js` | Disable the manual-review checkbox when a static validation check fails or the runtime check has yet to pass. |
| `src/admin-workspace-state.js` | Update guidance when editing an existing published master. |
| `src/admin-engine.js` | Reuse analysis, preserve master-only CONFIG entries during personalization, handle literal initials and add wrapping to customer output. |
| `src/customer-invitation.js` *(new)* | Share template-bound validation, image limits and personalized preparation between server and browser. |
| `src/components/PublishedTemplateGallery.jsx` | Connect the existing gallery to the personalized dialog and manage selection while retaining catalogue Retry and thumbnail behavior. |
| `src/components/CustomerInvitationDialog.jsx` *(new)* | Dynamic fields, selected media, preview/edit state, secure job creation before locking the dialog, render progress, cancellation and download. |
| `src/styles/published-template-gallery.css` | Style the customer dialog and its form within the current gallery. |
| `server/template-api.js` | Return master revision and require a boolean visual-review confirmation. |
| `server/template-store.js` | Allow the render lookup to supply database operation options while retaining the published-only filter. |
| `server/render-server.js` | Add public render admission, validation, private progress and disconnect handling. Share the original browser-close promise across all renderer exit paths. |
| `test/customer-invitation.test.js` *(new)* | Six tests covering CONFIG, dates, media, event/timing preservation, initials and image dimensions. |
| `test/render-api-boundaries.test.js` | Cover the public request contract and hold the shared render slot across an interrupted render until browser shutdown settles. |
| `tests/customer-export-recovery.test.js` *(new)* | Exercise missing and throwing UUID APIs and an insecure-context signal in the live dialog, then retry with native UUIDs. |
| `tests/fixtures/delayed-browser-close.mjs` *(new)* | Make the first browser close wait for a test signal after disconnection, so premature slot release can be tested deterministically. |
| `PHASE_4_IMPLEMENTATION_REPORT.md` *(new)* | This review, results and acceptance checklist. |

## Verification commands and results

| Command or instrument | Actual result |
| --- | --- |
| Baseline `npm test` | 130 passed, 0 failed, 0 skipped. |
| Baseline `npm run build` | Vite succeeded in 609 ms, 42 modules. Website JS 231.70 kB, 72.71 kB gzip. |
| Final `npm test` | 139 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo in 13.486 s. The preceding review passed 137. The two additions cover dialog recovery and render-slot release. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for this run. The UI test can also use an installed Playwright Chromium. It reports a skip if the default binary is missing and no override is supplied. |
| Final `npm run build` | Vite 8.3.8 succeeded in 411 ms, 44 modules. Website JS 237.18 kB, 75.10 kB gzip. |
| `git diff --check`, `git diff --stat`, `git status --short --branch`, `git rev-parse HEAD` | Clean tracked whitespace check. The tracked diff contains 210 insertions and 227 deletions across 11 files. New files are listed separately above. Starting and final HEAD match. |
| Browser and API integration | Isolated Playwright Chromium sessions against the local UI and Express API. The package UI regression used the Vite development server and intercepted API responses. The production bundle was also served locally for the separate export verification below. |
| Media inspection | Real system Chromium, FFmpeg and ffprobe, plus OCR and pixel sampling on decoded MP4 frames. MongoDB and the background byte store used fixture adapters. No production data or credentials were required. |

Repository regressions cover the earlier Phase 1–3 analyzer, AI-off/fallback behavior, motion and timing, contrast warnings, admin cancellation, upload limits, range handling, render boundaries, existing CONFIG and scene types, drafts and template validation. AI/provider cases use fixtures. There is no separate lint or typecheck script in the package manifest.

### Browser, export and timing evidence

| Customer master | Chromium viewport | MP4 duration | Picture and sound | Bytes | Click to saved download |
| --- | --- | ---: | --- | ---: | ---: |
| HTML with one photo slot | 1280 × 800 | 30.000 s | 540 × 960, 30 fps, H.264 + AAC | 602,707 | 32.386 s |
| Video + HTML with no photo slots | 390 × 844 | 6.000 s | 540 × 960, 30 fps, H.264 + AAC | 241,546 | 10.117 s |

For the final production-bundle run, the harness disabled UUID generation at the point of export, observed the recoverable error, restored native Web Crypto and completed each real download from the same dialog. Timings in the table start at the successful retry. Both final MP4s matched their pre-correction fixture exports byte for byte (SHA-256). The earlier export times were 30.802 s and 8.996 s respectively.

Both fixtures recovered from an induced catalogue 503 using Retry. Both preserved the name after Preview → Edit → Preview and passed the horizontal overflow check at the tested viewport. A customer network trace showed no admin, video-analysis or video-design calls. Both resulting source masters matched their original bytes. The optional Studio MP4 is a separate observation from the two customer downloads.

Both audio streams from the WAV fixture started at 0.000 s and ended with their respective picture streams. Frame OCR at 2.4 s found the personalized name in both exports. For the video fixture the planned overlay window was 1.0–5.8 s. On its solid background, decoded frames had 0 bright pixels at 0.4 s, 21,180 at 2.4 s and 0 at 5.95 s, using a threshold of 160 on all three RGB channels. These are three timing samples. They do not establish frame accuracy for arbitrary footage or perceptual sync across every codec.

### Failure handling, security and cleanup

| Exercise | Observed result |
| --- | --- |
| Publish without review or with invalid source | Studio Publish stayed disabled before review. API rejected unreviewed and malformed-source fixtures. Both valid masters published after Studio runtime and review checks. |
| Public admission and admin compatibility | Non-JSON 415, missing job ID 400, disallowed origin 403, oversized customer JSON 413. Raw HTML, background URL and invalid ID shape returned 400. Mixed-case protected admin/render paths returned 401 on unauthorized malformed requests. CORS preflight returned 204 and health remained public. |
| Missing storage, stale revision, missing template | Disabled database returned 503. Stale revision returned 409. Lookup with no matching published record returned 404. Published-only filtering was also checked in source. |
| Invalid field or media | Unsupported field and wrong audio signature returned 400. A WAV-looking fixture that FFmpeg could not decode returned a generic 500. A fresh attempt subsequently encoded frames. Bad dates, markup, oversize text/media and unknown photo slots are covered in the suite. |
| Competing requests and progress privacy | With the new job past frame three, another POST returned 429. An unrelated token received 404 for progress. The sixth admitted attempt exhausted the per-minute allowance and the next attempt returned 429. |
| Customer cancellation | Aborting an active POST raised AbortError at the client. Progress disappeared and the temporary job directory returned to its pre-test state. Tested at the HTTP boundary. The dialog’s close-to-abort wiring was reviewed in source. |
| Forced watchdog | An isolated harness shortened only the named 10-minute watchdog to 1.5 s. The corrected renderer returned its generic failure in 2.420 s. Progress disappeared, no job directory remained and subsequent requests reached validation. The production-duration timer was left intact. |
| Process lifetime | After the correction the first sample following slot release showed zero direct renderer children and the temporary directory was gone. Repeated samples stayed empty. The controlled process-reaping experiment below distinguishes the earlier race from defunct descendants. |

**Failed or inconclusive verification attempts.** The initial gallery test injected only one failed request, which React development remounting could mask. Holding the outage until Retry made the result reproducible. The first optional-export check sampled metadata too early and saw an indeterminate duration. Waiting for the finished result verified six seconds. A separate admin browser pass was interrupted by a Vite hot reload and passed on the stable rerun. An intermediate concurrency test expected 429 but got 200. It reused the previous failed job ID while cleanup was finishing. Waiting for the old progress to disappear, assigning a fresh ID as the UI does, and observing actual frames from the new job reproduced 429 and verified cancellation. An initial timeout probe could not complete its process inspection through the procfs children file. A subsequent isolated probe used process-table sampling and produced the results above. These integration harnesses ran outside the repository and are separate from the package test count.

## Delivery and patch verification

The companion `PHASE_4_IMPLEMENTATION.patch` includes all 17 paths listed above, including this report. The patch was generated from tracked edits and explicitly named new files. It excludes environment files, credentials, dependency directories, build output, recordings and external verification harnesses. On a separate archive of the exact starting HEAD, `git apply --check --whitespace=error-all` passed and applying the patch reproduced the reviewed file contents byte for byte. The feature checkout and its Git index were not used as patch targets.

## Remaining risks and acceptance checks

| Area | Limitation and next check |
| --- | --- |
| Deployment and storage | Live MongoDB, Cloudinary and GridFS round trips, legacy production records, deployed binary versions, HTTPS/CORS settings and reverse-proxy timeouts remain unverified. In staging, publish and reopen a master of each type through the actual storage backends, including one older record. |
| Devices, accessibility and typography | The narrow test was desktop Chromium at mobile dimensions. Verify Safari/iOS and Chrome/Android on real devices, keyboard focus and Escape, a screen reader, scrolling, media selection, long names, non-Latin text, missing optional values and all scenes. At 2.4 s the narrow video fixture wrapped part of the sample name across lines. Approve the rendered typography for real templates. |
| Client environment | Export requires native crypto.randomUUID in a secure context. Unsupported contexts show guidance and keep the invitation editable. Verify HTTPS in the deployed customer journey and confirm the supported browser matrix. |
| Public capacity | A single customer upload/preparation or active render can occupy the public slot. The peer-based limiter is local to a process and a reverse proxy can group customers under one address. Exercise slow clients, concurrent admin/customer requests, timeouts and retry behavior behind the intended proxy. No sustained-load, memory profile or multi-instance benchmark was performed. |
| Cleanup in production | Verify cancellation during upload, database lookup, background retrieval, browser startup, encoding and slow download under the target process supervisor. A lookup in progress may continue to its bounded timeout after disconnect. Confirm container PID 1 reaps descendants and monitor temporary disk on permissions errors or abrupt termination. |
| Media limits and timing | Only the two measured durations and the selected WAV soundtrack were exported in this integration run. Check a near-120-second background, variable-frame-rate footage, silent output, embedded soundtracks, all allowed codecs, JPEG/WebP photos, high-resolution inputs and memory on the intended hardware. Review music fade and timing by ear and eye. |
| Security and compatibility | Defensive contract tests and source inspection covered the named boundaries. Image header checks do not validate a whole server-side image decode. Check deployed CSP, proxy body limits, no-store delivery, failed requests, and a second customer’s inability to retrieve the first customer’s result. The public generation endpoint is intentionally available to anonymous customers. |
| Existing admin operations | Regression coverage exercised existing APIs, drafts, templates and validation. Run a staging create/edit/update/draft/delete cycle with disposable records and verify that manual review is required again after an edit. Production CRUD was not exercised. |

**Recommendation.** Proceed to manual review and staging acceptance on the feature branch. Use the deployed storage, proxy, process supervisor and target phones before authorizing production use. All Phase 4 source, tests and this report remain uncommitted for review.
