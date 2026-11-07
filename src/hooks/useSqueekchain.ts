import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, EMPTY_READING, parseEconomy, parseStatus, type WheelReading } from '../game/squeek';

export type FeedStatus = 'loading' | 'live' | 'error';

const POLL_MS = 20_000;
const TIMEOUT_MS = 8_000;

async function getJson(path: string, signal: AbortSignal): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Polls the public Squeekchain API. Battles keep working on Burrow guard stats when it is unreachable. */
export function useSqueekchain() {
  const [reading, setReading] = useState<WheelReading>(EMPTY_READING);
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    setStatus((s) => (s === 'live' ? s : 'loading'));
    try {
      const [s, e] = await Promise.allSettled([getJson('/status', ctrl.signal), getJson('/economy/state', ctrl.signal)]);
      if (s.status === 'rejected') throw s.reason;
      const eco = e.status === 'fulfilled' ? parseEconomy(e.value) : { round: null, chainId: null };
      setReading({ ...parseStatus(s.value), ...eco });
      setStatus('live');
    } catch {
      if (ctrl.signal.aborted && inflight.current !== ctrl) return;
      setReading(EMPTY_READING);
      setStatus('error');
    } finally {
      window.clearTimeout(timer);
      if (inflight.current === ctrl) setCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    return () => {
      window.clearInterval(id);
      inflight.current?.abort();
    };
  }, [refresh]);

  return { reading, status, checkedAt, refresh };
}
