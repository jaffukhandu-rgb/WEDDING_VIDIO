// Overall progress is stage-weighted. Frame and upload fractions are measured;
// AI percentages are explicitly estimated, capped below completion.
const STAGES = {
  validate: [2, 4], frames: [5, 30], evidence: [31, 38],
  scene: [39, 59], design: [60, 77], aiDone: [78, 78],
  upload: [79, 94], generate: [95, 99]
};
export function createVideoGenerationProgress(render, {
  now = Date.now, schedule = setInterval, cancel = clearInterval
} = {}) {
  let value = 0, timer = null, active = false, stage = null, message = "";
  const stop = () => { if (timer !== null) cancel(timer); timer = null; };
  const update = (next, label = message, estimated = false) => {
    value = Math.max(value, Math.min(99, Math.round(next)));
    message = label;
    render({ value, message, estimated, state: "running" });
  };
  return {
    start(label) {
      stop(); value = 0; stage = null; active = true;
      update(0, label);
    },
    set(name, label, fraction = 0) {
      if (!active || !Object.hasOwn(STAGES, name)) return;
      const [min, max] = STAGES[name];
      const ratio = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
      if (stage !== name) {
        stop(); stage = name;
        if (name === "scene" || name === "design") {
          const started = now();
          timer = schedule(() => {
            if (!active || stage !== name) return;
            update(min + (max - min) * Math.min(.95, (now() - started) / 90_000), message, true);
          }, 500);
        }
      }
      update(min + (max - min) * ratio, label, name === "scene" || name === "design");
    },
    complete(label = "Invitation HTML ready") {
      if (!active) return;
      stop(); active = false; value = 100;
      render({ value, message: label, estimated: false, state: "complete" });
    },
    fail(label) {
      if (!active) return;
      stop(); active = false;
      render({ value, message: label, estimated: false, state: "failed" });
    }
  };
}
