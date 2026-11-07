import type { FeedStatus } from '../hooks/useSqueekchain';
import { formatWork, type Stance, type WheelReading } from '../game/squeek';

interface Props {
  reading: WheelReading;
  status: FeedStatus;
  checkedAt: Date | null;
  stance: Stance;
  onRefresh: () => void;
}

export function wheelLabel(reading: WheelReading, status: FeedStatus): string {
  if (status === 'loading') return 'Checking the wheel';
  if (status === 'error') return 'Live feed unreachable';
  if (reading.stale) return 'Reading is stale';
  return reading.state === 'running' ? 'Wheel running' : 'Wheel resting';
}

/** Small header status: a coloured dot plus the same state in words. */
export function LiveChip({ reading, status, stance }: Omit<Props, 'checkedAt' | 'onRefresh'>) {
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

export function LivePanel({ reading, status, checkedAt, stance, onRefresh }: Props) {
  const tone = status === 'live' && reading.state === 'running' ? 'run' : status === 'error' ? 'off' : 'rest';
  return (
    <section className="panel live" id="wheel" aria-labelledby="wheel-title">
      <div className="panel-head">
        <h2 id="wheel-title">Live wheel</h2>
        <button type="button" className="btn btn-quiet" onClick={onRefresh} disabled={status === 'loading'}>
          {status === 'loading' ? 'Checking' : 'Refresh'}
        </button>
      </div>
      <p className="state" data-tone={tone} role="status">
        <span className="dot" aria-hidden="true" />
        {wheelLabel(reading, status)}
      </p>
      {status === 'error' && (
        <p className="note">Unable to reach api.squeekchain.com. Battles use Burrow guard until the next check.</p>
      )}
      <dl className="facts">
        <div>
          <dt>Core status</dt>
          <dd>{status === 'live' ? reading.coreStatus : 'Not available'}</dd>
        </div>
        <div>
          <dt>Wheel speed</dt>
          <dd className="num">{status === 'live' ? `${reading.rpm.toFixed(1)} RPM` : 'Not available'}</dd>
        </div>
        <div>
          <dt>Work units</dt>
          <dd className="num">{status === 'live' ? formatWork(reading.workUnits) : 'Not available'}</dd>
        </div>
        <div>
          <dt>Round</dt>
          <dd className="num">{reading.round ? `#${reading.round}` : 'Not available'}</dd>
        </div>
        <div>
          <dt>Party stance</dt>
          <dd>
            <strong>{stance.name}</strong>
            <span className="sub">{stance.summary}</span>
          </dd>
        </div>
      </dl>
      <p className="meta">
        {checkedAt ? `Checked at ${checkedAt.toLocaleTimeString('en-GB')}. ` : ''}
        Updates every 20 seconds{reading.chainId ? ` from chain ${reading.chainId}` : ''}.
      </p>
    </section>
  );
}
