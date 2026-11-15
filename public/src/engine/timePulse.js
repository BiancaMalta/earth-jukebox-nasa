// Calendar boundaries use the supplied timestamp labels, without inventing offsets.
export function calendarBucket(date, period = 'day') {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(date)) return null;
  const day = Date.parse(date.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== date.slice(0, 10)) return null;
  // Weeks start on Monday; UTC is used only for calendar arithmetic on the labels.
  return period === 'week' ? Math.floor((day / 86400000 + 3) / 7) : day / 86400000;
}

export function createTimePulseTracker() {
  let previous = null;
  return {
    reset() { previous = null; },
    advance(date, period, playback) {
      const next = calendarBucket(date, period);
      const crossed = playback && previous !== null && next !== null && next > previous;
      previous = next;
      return crossed;
    },
  };
}
