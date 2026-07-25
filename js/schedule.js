// Resolves "today's" target mic from the precomputed SCHEDULE.order (see
// data/schedule.js and scripts/build-schedule.mjs — never hand-edit
// `order` directly, and never seed anything here off pool size/contents,
// that's what made past days unstable before).

function dayIndexFor(launchDateStr, now = new Date()) {
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = launchDateStr.split("-").map(Number);
  const launchUTC = Date.UTC(y, m - 1, d);
  return Math.round((todayUTC - launchUTC) / 86400000);
}

function debugDayIndexOverride() {
  const params = new URLSearchParams(location.search);
  if (params.get("debug") !== "1") return null;
  const dateStr = params.get("date");
  if (!dateStr) return null;
  return dayIndexFor(SCHEDULE.launchDate, new Date(dateStr + "T00:00:00Z"));
}

function todayDayIndex(now = new Date()) {
  const override = debugDayIndexOverride();
  return override !== null ? override : dayIndexFor(SCHEDULE.launchDate, now);
}

// SCHEDULE.order should always comfortably cover "today" (build-schedule.mjs
// keeps ~2 years of runway) — the modulo below is a last-resort safety net
// only, in case the schedule genuinely wasn't topped up in time. It's the
// one place staleness could reintroduce a detectable repeating pattern; see
// build-schedule.mjs's top comment for the real fix (re-run it).
function targetIdForDayIndex(dayIndex) {
  const order = SCHEDULE.order;
  if (dayIndex < 0 || order.length === 0) return order[0];
  if (dayIndex < order.length) return order[dayIndex];
  return order[((dayIndex % order.length) + order.length) % order.length];
}

function dateStringForDayIndex(dayIndex) {
  const [y, m, d] = SCHEDULE.launchDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dayIndex);
  return dt.toISOString().slice(0, 10);
}

function todayTargetMic(now = new Date()) {
  const dayIndex = todayDayIndex(now);
  const id = targetIdForDayIndex(dayIndex);
  return { dayIndex, dateStr: dateStringForDayIndex(dayIndex), mic: MIC_DB.find((m) => m.id === id) };
}
