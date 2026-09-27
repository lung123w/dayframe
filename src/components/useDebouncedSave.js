import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * One debounced writer per surface (stage 4 of `ui-modernization-calm-canvas`,
 * ADR-012 / design.md §8 D12).
 *
 * Contract:
 *   - `schedule(payload)` marks the write pending and restarts a 500 ms timer;
 *     N keystrokes therefore produce exactly one write.
 *   - `flush()` cancels the timer and writes immediately — used on blur and
 *     before navigating away from the document.
 *   - `saveNow()` writes immediately without debouncing — for discrete actions
 *     (a checkbox, an add, a remove) which should not feel laggy.
 *   - the hook also flushes on unmount, so switching view never drops a write.
 *   - `status` is `idle | pending | saved | error`; a failed payload is kept so
 *     `retry()` can resend it.
 */
export function useDebouncedSave(saveFn, { delay = 500, savedFadeMs = 2000 } = {}) {
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);
  const fadeRef = useRef(null);
  const pendingRef = useRef(null);
  const mountedRef = useRef(true);
  const saveRef = useRef(saveFn);
  useEffect(() => {
    saveRef.current = saveFn;
  }, [saveFn]);

  const clearFade = () => {
    if (fadeRef.current) {
      clearTimeout(fadeRef.current);
      fadeRef.current = null;
    }
  };

  const write = useCallback(async () => {
    if (pendingRef.current === null) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    if (mountedRef.current) {
      clearFade();
      setStatus('pending');
    }
    try {
      await saveRef.current(payload);
      if (mountedRef.current) {
        setStatus('saved');
        fadeRef.current = setTimeout(() => {
          fadeRef.current = null;
          if (mountedRef.current) setStatus('idle');
        }, savedFadeMs);
      }
    } catch (err) {
      // Keep the payload so the status line's retry can resend it.
      pendingRef.current = payload;
      console.error('Debounced save failed:', err);
      if (mountedRef.current) setStatus('error');
    }
  }, [savedFadeMs]);

  const schedule = useCallback(
    (payload) => {
      pendingRef.current = payload;
      clearFade();
      if (mountedRef.current) setStatus('pending');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        write();
      }, delay);
    },
    [delay, write]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return write();
  }, [write]);

  const saveNow = useCallback(
    (payload) => {
      pendingRef.current = payload;
      return flush();
    },
    [flush]
  );

  const retry = useCallback(() => write(), [write]);

  // Flush whatever is pending when the surface goes away (view switch, unmount).
  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (fadeRef.current) {
        clearTimeout(fadeRef.current);
        fadeRef.current = null;
      }
      flushRef.current();
    };
  }, []);

  return { status, schedule, flush, saveNow, retry };
}

export default useDebouncedSave;
