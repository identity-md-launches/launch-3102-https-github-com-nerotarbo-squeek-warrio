// Squeekchain live data: parsing the public REST API and turning it into a battle stance.

export const API_BASE = 'https://api.squeekchain.com/v1';

export type WheelState = 'running' | 'resting' | 'unknown';

export interface WheelReading {
  state: WheelState;
  /** Revolutions per minute, one decimal. */
  rpm: number;
  /** Raw core status string reported by the API, e.g. RUNNING or IDLE. */
  coreStatus: string;
  workUnits: string;
  observedAt: string | null;
  stale: boolean;
  round: string | null;
  chainId: string | null;
}

export const EMPTY_READING: WheelReading = {
  state: 'unknown',
  rpm: 0,
  coreStatus: 'unknown',
  workUnits: '0',
  observedAt: null,
  stale: true,
  round: null,
  chainId: null,
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' ? (v as Json) : {});
const str = (v: unknown): string | null => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null);

/** Parse the body of GET /v1/status. */
export function parseStatus(body: unknown): Pick<WheelReading, 'state' | 'rpm' | 'coreStatus' | 'workUnits' | 'observedAt' | 'stale'> {
  const m = obj(obj(body).measurement);
  const rpmMilli = typeof m.rpmMilli === 'number' ? m.rpmMilli : 0;
  const rpm = Math.round((rpmMilli / 1000) * 10) / 10;
  const coreStatus = str(m.coreStatus) ?? 'unknown';
  const stale = m.freshness !== 'online';
  const state: WheelState = coreStatus === 'RUNNING' && rpm > 0 && !stale ? 'running' : 'resting';
  return {
    state,
    rpm,
    coreStatus,
    workUnits: str(m.cumulativeWorkUnits) ?? '0',
    observedAt: str(m.observedAt),
    stale,
  };
}

/** Parse the body of GET /v1/economy/state. */
export function parseEconomy(body: unknown): Pick<WheelReading, 'round' | 'chainId'> {
  const b = obj(body);
  if (b.status !== 'available') return { round: null, chainId: null };
  return { round: str(obj(b.lifecycle).currentRound), chainId: str(obj(b.chain).chainId) };
}

export interface Stance {
  id: 'frenzy' | 'guard';
  name: string;
  /** Party attack multiplier. */
  atk: number;
  /** Party defence multiplier. */
  def: number;
  /** Party critical hit chance, 0..1. */
  crit: number;
  summary: string;
}

/**
 * A running wheel gives Wheel frenzy: attack x1.2 plus up to +0.3 more at 100 RPM, 25% crits.
 * A resting wheel, stale reading or no data gives Burrow guard: defence x1.2, 10% crits.
 */
export function stanceFor(reading: WheelReading): Stance {
  if (reading.state === 'running') {
    const atk = Math.round((1.2 + Math.min(0.3, (reading.rpm / 100) * 0.3)) * 100) / 100;
    return {
      id: 'frenzy',
      name: 'Wheel frenzy',
      atk,
      def: 1,
      crit: 0.25,
      summary: `Attack x${atk.toFixed(2)}, 25% critical hits`,
    };
  }
  return { id: 'guard', name: 'Burrow guard', atk: 1, def: 1.2, crit: 0.1, summary: 'Defence x1.20, 10% critical hits' };
}

export function formatWork(units: string): string {
  const n = Number(units);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : units;
}
