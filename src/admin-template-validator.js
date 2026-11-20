// Static validation is conservative: it never executes uploaded template code.
// "pass" means only the named check passed, not that arbitrary HTML is safe.
export function validateTemplateSource(html, analysis) {
  const checks = [];
  const add = (id, status, title, detail) => checks.push({ id, status, title, detail });

  add('structure', 'pass', 'Supported template structure',
    analysis.sceneCount + (analysis.layoutType==='book'
      ? ' animated book pages and a readable CONFIG block detected.'
      : ' sequential scenes and a readable CONFIG block detected.'));

  const dates = Array.isArray(analysis.config.events)
    ? analysis.config.events.map(event => event.date)
    : ('date' in analysis.config ? [analysis.config.date] : []);
  add('dates', dates.length ? 'pass' : 'warning', 'Sample event dates',
    dates.length
      ? dates.length + ' calendar date(s) passed the analyzer’s validity check.'
      : 'No editable date found; confirm the invitation is intentionally date-free.');

  const css = [...html.matchAll(/\.go\s+\.scene\s*\{([^}]*)\}/g)].map(match => match[1]).join('\n');
  const durationMatch = css.match(/animation\s*:\s*[\w-]+\s+(\d+(?:\.\d+)?)s\b/);
  const delayMatch = css.match(/animation-delay\s*:\s*calc\(\s*var\(--i\)\s*\*\s*(\d+(?:\.\d+)?)s\s*\)/);
  const duration = durationMatch ? Number(durationMatch[1]) : null;
  const step = delayMatch ? Number(delayMatch[1]) : null;
  // Book layouts have page flips instead of a .scene timing schedule.
  // A 30s progress track is a duration hint; manual video review is still required.
  const bookTrack=/\.go\s+\.bar\s+i\s*\{[^}]*\banimation\s*:\s*fill\s+30s\b/i.test(html);
  const total = analysis.layoutType==='book'
    ? (bookTrack?30:null)
    : duration != null && step != null
      ? (analysis.sceneCount - 1) * step + duration
      : null;
  add('timeline', total === 30 ? 'pass' : 'warning', '30-second scene schedule',
    total == null
      ? 'Scene durations could not be confirmed statically. Review all scenes in the preview.'
      : total === 30
        ? analysis.sceneCount + ' scenes span 30 seconds in the detected CSS schedule.'
        : 'Detected scene schedule spans ' + total + ' seconds, not the expected 30. Review timing.');

  const externalScript = /<script\b[^>]*\bsrc\s*=/i.test(html);
  const dynamicCode = /\b(?:eval\s*\(|new\s+Function\s*\(|import\s*\()/i.test(html);
  add('dependencies', externalScript || dynamicCode ? 'warning' : 'pass', 'Code dependencies',
    externalScript || dynamicCode
      ? 'External scripts or dynamic evaluation may be blocked in the isolated preview.'
      : 'No external script tags or dynamic evaluation patterns detected (not a security audit).');

  const fonts = analysis.fonts || {};
  add('fonts', fonts.remote ? 'warning' : 'pass', 'Font dependencies',
    fonts.remote
      ? 'Remote fonts are blocked in the isolated preview; fallback fonts may change appearance.'
      : 'No Google Fonts dependency found. Font metrics still require visual review.');

  const photoSlots = analysis.photoSlots || [];
  const defaults = Array.isArray(analysis.config.photos) ? analysis.config.photos : [];
  const namedDefaults = photoSlots
    .filter(slot => slot.key !== 'photos')
    .map(slot => analysis.config[slot.key]);
  const placeholder = [...defaults, ...namedDefaults].some(value =>
    typeof value === 'string' && /YOUR[-_ ]?PHOTO[-_ ]?LINK|example\.com|placeholder/i.test(value));
  add('media', placeholder ? 'warning' : 'pass', 'Template photo references',
    placeholder
      ? 'Placeholder photo links detected. Upload real sample images before visual approval.'
      : photoSlots.length
        ? photoSlots.length + ' photo slot(s) detected. Actual image loading needs a preview check.'
        : 'No customer photo slots detected in this template.');

  const warnings = (analysis.warnings || []).filter(warning =>
    /random|replay|deterministic|export/i.test(warning));
  if (warnings.length) {
    add('export', 'warning', 'Animation/export compatibility',
      'Random motion or replay logic needs deterministic MP4 validation separately.');
  } else {
    add('export', 'pending', 'MP4 compatibility',
      'No MP4 render has been run. Browser preview does not certify export.');
  }

  return checks;
}

// Only a smoke check. Never treat it as a complete 30s visual inspection.
export function validateRuntimeReport(runtime, expectedScenes) {
  if (!runtime) return {
    id: 'runtime', status: 'pending', title: 'Browser preview smoke test',
    detail: 'Prepare the sample preview to check its runtime.'
  };
  if (!Number.isInteger(runtime.sceneCount)
      || runtime.sceneCount !== expectedScenes
      || !Number.isFinite(runtime.stageWidth)
      || !Number.isFinite(runtime.stageHeight)
      || runtime.stageWidth <= 0 || runtime.stageHeight <= 0) {
    return {
      id: 'runtime', status: 'fail', title: 'Browser preview smoke test',
      detail: 'Preview scene count or visible stage size is incorrect.'
    };
  }
  const portraitRatio = runtime.stageWidth / runtime.stageHeight;
  if (Math.abs(portraitRatio - 9 / 16) > 0.04) {
    return {
      id: 'runtime', status: 'fail', title: 'Browser preview smoke test',
      detail: 'Invitation stage is not close to 9:16 portrait size. Check layout and viewport styles.'
    };
  }
  if (runtime.errors?.length) {
    return {
      id: 'runtime', status: 'fail', title: 'Browser preview smoke test',
      detail: runtime.errors.length + ' script error(s) detected: ' +
        runtime.errors.slice(0, 2).join(' | ').slice(0, 250)
    };
  }
  if (!runtime.started) {
    return {
      id: 'runtime', status: 'warning', title: 'Browser preview smoke test',
      detail: 'The page loaded, but playback start was not confirmed. Restart and inspect the preview.'
    };
  }
  return {
    id: 'runtime', status: 'pass', title: 'Browser preview smoke test',
    detail: runtime.sceneCount + ' scenes found, 9:16 stage visible, playback started, and no script errors reported at check time.'
  };
}
