import test from "node:test";
import assert from "node:assert/strict";
import { parseDiagnosticArgs, syntheticSample, runGeminiDiagnostics } from "../scripts/diagnose-gemini.js";

test("Diagnostic defaults to both Lite models, accepts only allowed models and a local video option", () => {
  assert.deepEqual(parseDiagnosticArgs([]).models, ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]);
  assert.deepEqual(parseDiagnosticArgs(["--models", "gemini-3.8-flash,gemini-3.8-flash", "--video", "sample.mp4"]),
    { models: ["gemini-3.8-flash"], video: "sample.mp4" });
  assert.throws(() => parseDiagnosticArgs(["--models", "../wrong"]), /Unsupported/);
  const sample = syntheticSample();
  assert.equal(sample.frames.length, 8);
  const bytes = Buffer.from(sample.frames[0].jpeg, "base64");
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
});

test("Diagnostic labels the exact model, exercises both production schemas and a follow-up", async () => {
  const calls = [], rows = [];
  const model = "gemini-3.1-flash-lite";
  const result = await runGeminiDiagnostics({ apiKey: "secret", models: [model], log: row => rows.push(row),
    fetcher: async (url, opts) => {
      assert.ok(url.includes(model));
      assert.equal(opts.headers["x-goog-api-key"], "secret");
      return { ok: true, json: async () => url.endsWith(":generateContent")
        ? { candidates: [{ content: { parts: [{ text: "OK" }] } }] }
        : { supportedGenerationMethods: ["generateContent"] } };
    },
    requestPlan: async (sample, _key, _fetch, name, _budget, options) => {
      assert.equal(name, model); assert.equal(options.allowModelFallback, false);
      assert.equal(sample.frames.length, 8); calls.push("scene");
      return { scenes: [] };
    },
    requestDesign: async (sample, _key, _fetch, name, _budget, options) => {
      assert.equal(name, model); assert.equal(options.allowModelFallback, false);
      calls.push(sample.previousDesign ? "followup" : "design");
      return sample.previousDesign ? { ...sample.previousDesign, nameSize: 10.5, borderWidth: 0 }
        : { surface: "glass", nameSize: 8.5 };
    }
  });
  assert.deepEqual(calls, ["scene", "design", "followup"]);
  assert.equal(result.length, 5);
  assert.ok(result.every(row => row.outcome === "pass" && row.model === model));
  assert.ok(!JSON.stringify(rows).includes("secret"));
});

test("Diagnostic stops model calls after a failed metadata check and reports only safe fields", async () => {
  let count = 0;
  const result = await runGeminiDiagnostics({ apiKey: "secret", models: ["gemini-3.5-flash-lite"], log: () => {},
    fetcher: async () => {
      count++;
      return { ok: false, status: 503, json: async () => ({ error: { status: "UNAVAILABLE", message: "secret" } }) };
    }
  });
  assert.equal(count, 1);
  assert.equal(result[0].upstreamStatus, 503);
  assert.equal(result[0].reason, "provider_unavailable");
  assert.ok(!JSON.stringify(result).includes("secret"));
});

test("Diagnostic separates local edit success from model instruction mismatch", async () => {
  const rows = [];
  const model = "gemini-3.5-flash-lite";
  const result = await runGeminiDiagnostics({ apiKey: "secret", models: [model], log: row => rows.push(row),
    fetcher: async url => ({ ok: true, json: async () => url.endsWith(":generateContent")
      ? { candidates: [{ content: { parts: [{ text: "OK" }] } }] }
      : { supportedGenerationMethods: ["generateContent"] } }),
    requestPlan: async () => ({ scenes: [] }),
    requestDesign: async sample => sample.previousDesign
      ? { ...sample.previousDesign, nameSize: 10.5, blur: 2 }
      : { surface: "glass", blur: 8, nameSize: 8.5 }
  });
  const local = rows.find(row => row.stage === "local_exact_edit");
  assert.equal(local.outcome, "pass");
  assert.equal(local.apiCalls, 0);
  assert.equal(result.at(-1).reason, "followup_mismatch");
  assert.deepEqual(result.at(-1).requestedChangesMissed, ["borderWidth"]);
  assert.deepEqual(result.at(-1).unexpectedChanges, ["blur"]);
  assert.equal(result.length, 5);
});

test("Diagnostic distinguishes invalid design properties from a valid but incorrect edit", async () => {
  const result = await runGeminiDiagnostics({ apiKey: "secret", models: ["gemini-3.5-flash-lite"], log: () => {},
    fetcher: async url => ({ ok: true, json: async () => url.endsWith(":generateContent")
      ? { candidates: [{ content: { parts: [{ text: "OK" }] } }] }
      : { supportedGenerationMethods: ["generateContent"] } }),
    requestPlan: async () => ({ scenes: [] }),
    requestDesign: async sample => {
      if (sample.previousDesign) throw Object.assign(Error("invalid"), { reason: "invalid_layout", layoutDetail: "design_schema" });
      return { surface: "glass" };
    }
  });
  assert.equal(result.at(-1).reason, "invalid_layout");
  assert.equal(result.at(-1).layoutDetail, "design_schema");
});
