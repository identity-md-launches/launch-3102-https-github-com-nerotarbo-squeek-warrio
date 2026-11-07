import type { FeedStatus } from '../hooks/useSqueekchain';
import { formatWork, type Stance, type WheelReading } from '../game/squeek';

export interface Telemetry {
  reading: WheelReading;
  status: FeedStatus;
  checkedAt: Date | null;
  onRefresh: () => void;
}

interface Props extends Telemetry {
  stance: Stance;
  scenePaused?: boolean;
  onToggleScene?: () => void;
}

export function wheelLabel(reading: WheelReading, status: FeedStatus): string {
  if (status === 'loading') return 'Checking the wheel';
  if (status === 'error') return 'Live feed unreachable';
  if (reading.stale) return 'Reading is stale';
  return reading.state === 'running' ? 'Wheel running' : 'Wheel resting';
}

/** Small header status: a coloured dot plus the same state in words. */
export function LiveChip({ reading, status, stance }: Pick<Props, 'reading' | 'status' | 'stance'>) {
  const tone = status === 'live' && reading.state === 'running' ? 'run' : status === 'error' ? 'off' : 'rest';
  return (
    <a className="chip" href="#wheel" data-tone={tone}>
      <span className="dot" aria-hidden="true" />
      <span>
        <span className="chip-state">{wheelLabel(reading, status)}, </span>
        {stance.name}
      </span>
    </a>
  );
}

export function LivePanel({ reading, status, checkedAt, stance, onRefresh, scenePaused, onToggleScene }: Props) {
  const tone = status === 'live' && reading.state === 'running' ? 'run' : status === 'error' ? 'off' : 'rest';
  const connection = status === 'loading' ? 'Checking' : status === 'error' ? 'Offline' : reading.stale ? 'Stale' : 'Online';
  return (
    <section className="battle-hud" id="wheel" aria-label="Live wheel telemetry">
      <div className="hud-head">
        <p className="hud-state" data-tone={tone} role="status" title={`Core status: ${status === 'live' ? reading.coreStatus : 'Not available'}`}>
          <span className="dot" aria-hidden="true" />
          {wheelLabel(reading, status)}
        </p>
        <div className="hud-actions">
          <button type="button" className="btn btn-quiet" onClick={onRefresh} disabled={status === 'loading'}>
            {status === 'loading' ? 'Checking' : 'Refresh'}
          </button>
          {onToggleScene && (
            <button type="button" className="btn btn-quiet" onClick={onToggleScene} aria-pressed={scenePaused}
              aria-label={scenePaused ? 'Resume scene effects' : 'Pause scene effects'}>
              {scenePaused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
      </div>
      <dl className="hud-facts num">
        <div>
          <dt>Speed</dt>
          <dd>{status === 'live' ? `${reading.rpm.toFixed(1)} RPM` : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Work units</dt>
          <dd>{status === 'live' ? formatWork(reading.workUnits) : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Round</dt>
          <dd>{reading.round ? `#${reading.round}` : 'Unavailable'}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd>{connection}</dd>
        </div>
      </dl>
      <p className="hud-caption" title={`${stance.summary}. Updates every 20 seconds${reading.chainId ? ` from chain ${reading.chainId}` : ''}.`}>
        <span>{stance.name}</span>
        <span>{checkedAt ? `Checked ${checkedAt.toLocaleTimeString('en-GB')}` : 'Awaiting feed'}</span>
      </p>
      {status === 'error' && <p className="hud-error">Feed unavailable. Burrow guard is active. Refresh to retry.</p>}
    </section>
  );
}
