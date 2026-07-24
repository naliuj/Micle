// Resolves "today's" target mic from the precomputed, append-only SCHEDULE.
// See data/schedule.js for the schedule itself and scripts/build-schedule.mjs
// for how it's generated/extended — never hand-edit SCHEDULE.order directly.

function dayIndexFor(launchDateStr, now = new Date()) {
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = launchDateStr.split("-").map(Number);
  const launchUTC = Date.UTC(y, m - 1, d);
  return Math.round((todayUTC - launchUTC) / 86400000);
}

function todayDayIndex(now = new Date()) {
  return dayIndexFor(SCHEDULE.launchDate, now);
}

function targetIdForDayIndex(dayIndex) {
  const order = SCHEDULE.order;
  if (dayIndex < 0 || order.length === 0) return order[0];
  return order[((dayIndex % order.length) + order.length) % order.length];
}

function todayTargetMic(now = new Date()) {
  const dayIndex = todayDayIndex(now);
  const id = targetIdForDayIndex(dayIndex);
  return { dayIndex, mic: MIC_DB.find((m) => m.id === id) };
}
