// src/security/idleSession.ts
export function startIdleLogout(ms: number, onTimeout: () => void) {
  let t: number | null = null;
  const reset = () => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(onTimeout, ms) as any;
  };
  ['click','keydown','touchstart'].forEach(evt => window.addEventListener(evt, reset, { passive: true }));
  reset();
  return () => {
    if (t) window.clearTimeout(t);
    ['click','keydown','touchstart'].forEach(evt => window.removeEventListener(evt, reset));
  };
}
