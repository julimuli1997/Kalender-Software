import { useEffect } from 'react';

const SPEED = 40;     // px per second
const PAUSE_MS = 4000; // rest at either end so the TV audience can read

/**
 * Slowly pans an overflowing container left -> right and back again. Does nothing while
 * everything fits on screen. `deps` should change whenever the content's size can change.
 */
export function useAutoScroll(ref, deps = []) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let raf;
    let direction = 1;
    let pausedUntil = performance.now() + PAUSE_MS;
    let last = performance.now();
    let position = el.scrollLeft;

    const tick = (now) => {
      const max = el.scrollWidth - el.clientWidth;
      const dt = (now - last) / 1000;
      last = now;
      if (max <= 1) {
        position = 0;
        if (el.scrollLeft !== 0) el.scrollLeft = 0;
      } else if (now >= pausedUntil) {
        position = Math.min(max, Math.max(0, position + direction * SPEED * dt));
        el.scrollLeft = position;
        if (position <= 0 || position >= max) {
          direction = -direction;
          pausedUntil = now + PAUSE_MS;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
