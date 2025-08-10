import { useRef, useCallback } from 'react';

/**
 * Reusable horizontal swipe navigation hook.
 * @param {Object} opts
 * @param {Function} opts.onPrev - Called on left-to-right swipe.
 * @param {Function} opts.onNext - Called on right-to-left swipe.
 * @param {number} [opts.threshold=40] - Min horizontal px before triggering.
 * @param {number} [opts.axisLockRatio=1.2] - |dx| must exceed |dy|*ratio to count horizontal.
 * @returns {{ handleTouchStart, handleTouchMove, handleTouchEnd, containerProps }}
 */
export default function useHorizontalSwipeNav({ onPrev, onNext, threshold = 40, axisLockRatio = 1.2 } = {}) {
  const startX = useRef(null);
  const startY = useRef(null);
  const done = useRef(false);

  const reset = () => {
    startX.current = null;
    startY.current = null;
    done.current = false;
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length !== 1) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    done.current = false;
  }, []);

  const commit = useCallback((dir) => {
    if (done.current) return;
    if (dir === 'prev' && typeof onPrev === 'function') onPrev();
    else if (dir === 'next' && typeof onNext === 'function') onNext();
    done.current = true;
  }, [onPrev, onNext]);

  const handleTouchMove = useCallback((e) => {
    if (startX.current == null || startY.current == null || done.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * axisLockRatio) {
      commit(dx > 0 ? 'prev' : 'next');
      reset();
    }
  }, [threshold, axisLockRatio, commit]);

  const handleTouchEnd = useCallback((e) => {
    if (done.current || startX.current == null || startY.current == null) { reset(); return; }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * axisLockRatio) {
      commit(dx > 0 ? 'prev' : 'next');
    }
    reset();
  }, [threshold, axisLockRatio, commit]);

  const containerProps = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    style: { touchAction: 'pan-y' },
  };

  return { handleTouchStart, handleTouchMove, handleTouchEnd, containerProps };
}
