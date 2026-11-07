import { useCallback, useEffect, useState } from 'react';
import { Game } from './components/Game';
import { LiveChip, LivePanel } from './components/LivePanel';
import { useSqueekchain } from './hooks/useSqueekchain';
import { stanceFor } from './game/squeek';

const SAVE_KEY = 'squeek-warriors:v1';

interface Save {
  credits: number;
  battlesWon: number;
  campaignsWon: number;
}

const EMPTY_SAVE: Save = { credits: 0, battlesWon: 0, campaignsWon: 0 };

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? { ...EMPTY_SAVE, ...(JSON.parse(raw) as Partial<Save>) } : EMPTY_SAVE;
  } catch {
    return EMPTY_SAVE;
  }
}

export default function App() {
  const { reading, status, checkedAt, refresh } = useSqueekchain();
  const stance = stanceFor(status === 'live' ? reading : { ...reading, state: 'unknown' });
  const [save, setSave] = useState<Save>(loadSave);
  const chainRound = reading.round !== null && Number.isFinite(Number(reading.round)) ? Number(reading.round) : null;

  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch {
      /* storage can be unavailable in private windows; progress then lasts for this visit only */
    }
  }, [save]);

  const onReward = useCallback((credits: number, campaignDone: boolean) => {
    setSave((s) => ({
      credits: s.credits + credits,
      battlesWon: s.battlesWon + 1,
      campaignsWon: s.campaignsWon + (campaignDone ? 1 : 0),
    }));
  }, []);

  const resetSave = () => {
    if (window.confirm('Reset your SQK credits and win counts? This cannot be undone.')) setSave(EMPTY_SAVE);
  };

  return (
    <>
      <a className="skip-link" href="#game">
        Skip to the battle
      </a>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="#top">
            <img src="./favicon.svg" alt="" width="28" height="28" />
            <span>Squeek Warriors</span>
          </a>
          <LiveChip reading={reading} status={status} stance={stance} />
        </div>
      </header>

      <main id="top">
        <section className="wrap intro" aria-labelledby="page-title">
          <h1 id="page-title">Hamster warriors, powered by a wheel</h1>
          <p className="lede">A turn-based hamster RPG. The live Squeekchain wheel sets your party's stance in every fight.</p>
        </section>

        <div className="wrap layout">
          <section className="panel game" id="game" aria-labelledby="game-title">
            <Game stance={stance} chainRound={chainRound} onReward={onReward} />
          </section>

          <div className="side">
            <LivePanel reading={reading} status={status} checkedAt={checkedAt} stance={stance} onRefresh={refresh} />
            <section className="panel" aria-labelledby="save-title">
              <div className="panel-head">
                <h2 id="save-title">Your progress</h2>
                <button type="button" className="btn btn-quiet" onClick={resetSave} disabled={save.credits === 0 && save.battlesWon === 0}>
                  Reset
                </button>
              </div>
              <dl className="facts">
                <div>
                  <dt>SQK credits</dt>
                  <dd className="num">{save.credits.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Battles won</dt>
                  <dd className="num">{save.battlesWon}</dd>
                </div>
                <div>
                  <dt>Campaigns won</dt>
                  <dd className="num">{save.campaignsWon}</dd>
                </div>
              </dl>
              <p className="meta">Credits are simulated and saved in this browser only. They are not tokens.</p>
            </section>
          </div>
        </div>

        <section className="wrap how" aria-labelledby="how-title">
          <h2 id="how-title">How the wheel shapes battle</h2>
          <ul className="how-list">
            <li>
              <h3>Wheel frenzy</h3>
              <p>
                When Squeektoshi runs, your hamsters hit harder: attack x1.2, rising to x1.5 at 100 RPM, and a 25% chance of critical hits.
              </p>
            </li>
            <li>
              <h3>Burrow guard</h3>
              <p>When the wheel rests, or the feed is unreachable, your party digs in with defence x1.2 and a 10% critical chance.</p>
            </li>
            <li>
              <h3>Round settlement</h3>
              <p>
                Each victory pays SQK credits: the stage reward, x1.5 in Wheel frenzy, plus the last digit of the current Squeekchain round.
              </p>
            </li>
          </ul>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            Live data from the public <a href="https://api.squeekchain.com/v1/status">Squeekchain status API</a> and{' '}
            <a href="https://api.squeekchain.com/v1/economy/state">economy state API</a>. Source on{' '}
            <a href="https://github.com/nerotarbo/squeek-warriors">GitHub</a>.
          </p>
          <p className="meta">Squeekchain project a661bb2d-0d46-482c-abba-b63fb4e183c7</p>
        </div>
      </footer>
    </>
  );
}
