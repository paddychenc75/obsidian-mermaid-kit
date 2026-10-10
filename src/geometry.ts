export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Pan range along one axis. A diagram that fits inside the padded frame is pinned to the
 * centre; one that overflows can travel until either edge clears the pad.
 */
export function panRange(view: number, used: number, pad: number): [number, number] {
  if (used <= view - pad * 2) return [(view - used) / 2, (view - used) / 2];
  return [view - used - pad, pad];
}

/** The largest scale at which `nat` fits a padded `view`, kept inside the zoom limits. */
export function containScale(
  view: { w: number; h: number },
  nat: { w: number; h: number },
  pad: number,
  limits: { min: number; max: number },
): number {
  const scale = Math.min((view.w - pad * 2) / nat.w, (view.h - pad * 2) / nat.h, limits.max);
  return clamp(scale, limits.min, limits.max);
}
