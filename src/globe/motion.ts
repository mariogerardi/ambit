/** Camera motion uses bounded frame time so a busy frame cannot skip the approach. */
export function motionFrameDelta(now: number, previous: number, first = false) {
  return Math.max(0, Math.min(first ? 16 : 32, now - previous));
}

export function motionDistance(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const longitude = ((((to.lng - from.lng + 540) % 360) + 360) % 360) - 180;
  return Math.hypot(
    to.lat - from.lat,
    longitude * Math.cos(((from.lat + to.lat) * Math.PI) / 360),
  );
}

export function focusDuration(distance: number, closeDeparture: boolean) {
  return closeDeparture
    ? 4200
    : distance < 0.5
      ? 1400
      : 2600 + Math.min(600, distance * 6);
}

/** Tours have a calm entry followed by longer legs; normal question focus stays separate. */
export function tourDuration(distance: number, entry = true) {
  return entry
    ? Math.max(3000, Math.min(6500, distance * 35))
    : Math.max(6000, Math.min(10000, distance * 70));
}
