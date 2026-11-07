import { useEffect, useMemo, useRef, useState } from 'react';
import { SKILLS, STAGES, type Unit } from '../game/data';
import {
  alive,
  canUseSkill,
  foesOf,
  needsCommand,
  newCampaign,
  partyOf,
  resolveRound,
  restParty,
  startStage,
  type Battle,
  type Command,
} from '../game/battle';
import type { Stance } from '../game/squeek';
import { Sprite } from './Sprite';
import { BattleScene } from './BattleScene';
import { LivePanel, type Telemetry } from './LivePanel';

interface Props {
  stance: Stance;
  chainRound: number | null;
  onReward: (credits: number, campaignDone: boolean, genesisAura: number) => void;
  telemetry: Telemetry;
}

type Pending = { action: 'attack' | 'skill' } | null;

export function Game({ stance, chainRound, onReward, telemetry }: Props) {
  const [battle, setBattle] = useState<Battle>(newCampaign);
  const [orders, setOrders] = useState<Command[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [hurt, setHurt] = useState<Set<string>>(new Set());
  const [scenePaused, setScenePaused] = useState(false);
  const stageStart = useRef<Battle | null>(null);
  const focusRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const actors = needsCommand(battle);
  const actor: Unit | undefined = battle.phase === 'command' ? actors[orders.length] : undefined;
  const foes = foesOf(battle);
  const party = partyOf(battle);
  const livingFoes = foes.filter(alive);
  const choosingTarget = pending !== null;

  // Move focus to the panel heading when the phase changes, so keyboard and screen reader users follow along.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    focusRef.current?.focus();
  }, [battle.phase, battle.stage]);

  const begin = (b: Battle, stage: number) => {
    const next = startStage(b, stage);
    stageStart.current = next;
    setBattle(next);
    setOrders([]);
    setPending(null);
    setHurt(new Set());
  };

  const give = (cmd: Command) => {
    setOrders((o) => [...o, cmd]);
    setPending(null);
  };

  const choose = (action: 'attack' | 'skill' | 'defend') => {
    if (!actor) return;
    if (action === 'defend') return give({ actor: actor.id, action });
    const needsTarget = action === 'attack' || (actor.skill && SKILLS[actor.skill].target === 'foe');
    if (!needsTarget) return give({ actor: actor.id, action });
    if (livingFoes.length === 1) return give({ actor: actor.id, action, target: livingFoes[0].id });
    setPending({ action });
  };

  const resolve = () => {
    const next = resolveRound(battle, orders, stance, Math.random, chainRound);
    const before = new Map(battle.units.map((u) => [u.id, u.hp]));
    setHurt(new Set(next.units.filter((u) => u.hp < (before.get(u.id) ?? 0)).map((u) => u.id)));
    setBattle(next);
    setOrders([]);
    setPending(null);
    if (next !== battle && (next.phase === 'won' || next.phase === 'complete')) {
      onReward(next.reward, next.phase === 'complete', next.genesisAura);
    }
  };

  const roundLog = useMemo(() => {
    const i = battle.log.lastIndexOf(`Round ${battle.round - 1}`);
    return i >= 0 ? battle.log.slice(i + 1) : battle.log.slice(-1);
  }, [battle.log, battle.round]);

  const stage = STAGES[battle.stage];

  // Command buttons are replaced as orders are given; keep keyboard focus on the next thing to press.
  const commandRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const stepCount = useRef(0);
  useEffect(() => {
    if (stepCount.current++ === 0) return;
    if (!document.activeElement || document.activeElement === document.body) {
      const scope = pending ? fieldRef.current?.querySelector<HTMLElement>('.is-target') : commandRef.current?.querySelector<HTMLElement>('button');
      scope?.focus();
    }
  }, [orders.length, pending]);

  if (battle.phase === 'ready') {
    return (
      <div className="game-body">
        <h2 id="game-title" ref={focusRef} tabIndex={-1}>
          Three battles to the Ashwood gate
        </h2>
        <ul className="roster" aria-label="Your party">
          {party.map((u) => (
            <li key={u.id} className="roster-item">
              <Sprite kind={u.sprite} size={56} />
              <span className="name">{u.name}</span>
              <span className="sub">{u.title}</span>
            </li>
          ))}
        </ul>
        <ol className="stages">
          {STAGES.map((s) => (
            <li key={s.id}>
              <strong>{s.name}.</strong> {s.intro}
            </li>
          ))}
        </ol>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => begin(battle, 0)}>
            Start campaign
          </button>
          <p className="hint">Give each hamster an order, then resolve the round.</p>
        </div>
        <LivePanel {...telemetry} stance={stance} />
      </div>
    );
  }

  return (
    <div className="game-body">
      <div className="stage-head">
        <h2 id="game-title" ref={focusRef} tabIndex={-1}>
          {stage.name}
        </h2>
        <p className="sub num">
          Battle {battle.stage + 1} of {STAGES.length}, round {battle.phase === 'command' ? battle.round : battle.round - 1}
        </p>
      </div>

      <div className="field" ref={fieldRef}>
        <LivePanel {...telemetry} stance={stance} scenePaused={scenePaused} onToggleScene={() => setScenePaused((p) => !p)} />
        <div className="battle-stage">
          <BattleScene stage={battle.stage} paused={scenePaused} hurt={hurt} />
          <ul className="row foes" aria-label="Foes">
            {foes.map((u) => (
              <li key={u.id}>
                <UnitCard
                  key={battle.round}
                  unit={u}
                  hurt={hurt.has(u.id)}
                  onPick={choosingTarget && alive(u) ? () => give({ actor: actor!.id, action: pending!.action, target: u.id }) : undefined}
                />
              </li>
            ))}
          </ul>
          <ul className="row party" aria-label="Your party">
            {party.map((u) => (
              <li key={u.id}>
                <UnitCard
                  key={battle.round}
                  unit={u}
                  hurt={hurt.has(u.id)}
                  active={actor?.id === u.id}
                  order={describe(orders.find((o) => o.actor === u.id), battle)}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="command" ref={commandRef}>
        {battle.phase === 'command' && actor && !choosingTarget && (
          <>
            <p className="prompt">
              Order for <strong>{actor.name}</strong> ({orders.length + 1} of {actors.length})
            </p>
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => choose('attack')}>
                Attack
              </button>
              {actor.skill && (
                <button type="button" className="btn" onClick={() => choose('skill')} disabled={!canUseSkill(actor)}>
                  {SKILLS[actor.skill].name} <span className="cost">{SKILLS[actor.skill].cost} SP</span>
                </button>
              )}
              <button type="button" className="btn" onClick={() => choose('defend')}>
                Defend
              </button>
              {orders.length > 0 && (
                <button type="button" className="btn btn-quiet" onClick={() => setOrders((o) => o.slice(0, -1))}>
                  Undo last order
                </button>
              )}
            </div>
            {actor.skill && (
              <p className="hint">
                {SKILLS[actor.skill].name}: {SKILLS[actor.skill].help}
                {!canUseSkill(actor) ? ` Needs ${SKILLS[actor.skill].cost} SP.` : ''}
              </p>
            )}
          </>
        )}
        {battle.phase === 'command' && actor && choosingTarget && (
          <>
            <p className="prompt">
              Choose a highlighted foe for <strong>{actor.name}</strong>.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-quiet" onClick={() => setPending(null)}>
                Back
              </button>
            </div>
          </>
        )}
        {battle.phase === 'command' && !actor && (
          <>
            <p className="prompt">Every hamster has an order. Stance this round: {stance.name}.</p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={resolve}>
                Resolve round
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setOrders((o) => o.slice(0, -1))}>
                Undo last order
              </button>
            </div>
          </>
        )}
        {battle.phase === 'won' && (
          <>
            <p className="prompt">
              {stage.name} cleared. You earn <strong className="num">{battle.reward} SQK credits</strong>. Your party rests before the next battle.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => begin(restParty(battle), battle.stage + 1)}>
                Continue to {STAGES[battle.stage + 1].name}
              </button>
            </div>
          </>
        )}
        {battle.phase === 'lost' && (
          <>
            <p className="prompt">Every hamster is down. The stage resets to how it began.</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const start = stageStart.current!;
                  setBattle(start);
                  setOrders([]);
                  setHurt(new Set());
                }}
              >
                Retry {stage.name}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => begin(newCampaign(), 0)}>
                Restart campaign
              </button>
            </div>
          </>
        )}
        {battle.phase === 'complete' && (
          <>
            <p className="prompt">
              Cinder retreats and the kingdom is safe. The final battle paid <strong className="num">{battle.reward} SQK credits</strong>.
              {' '}Campaign reward: <strong className="num">+{battle.genesisAura} Genesis Aura (simulated)</strong>.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={() => begin(newCampaign(), 0)}>
                Play again
              </button>
            </div>
          </>
        )}
      </div>

      <div className="log" role="log" aria-label="Battle log">
        <h3>{battle.round > 1 ? `Round ${battle.round - 1} report` : 'Battle report'}</h3>
        <ol>
          {roundLog.map((line, i) => (
            <li key={`${battle.round}-${i}`}>{line}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function describe(cmd: Command | undefined, b: Battle): string | undefined {
  if (!cmd) return undefined;
  const target = b.units.find((u) => u.id === cmd.target)?.name;
  if (cmd.action === 'defend') return 'Defend';
  if (cmd.action === 'skill') {
    const u = b.units.find((x) => x.id === cmd.actor);
    const name = u?.skill ? SKILLS[u.skill].name : 'Skill';
    return target ? `${name} on ${target}` : name;
  }
  return `Attack ${target ?? ''}`.trim();
}

function UnitCard({ unit, active, hurt, order, onPick }: { unit: Unit; active?: boolean; hurt?: boolean; order?: string; onPick?: () => void }) {
  const down = unit.hp === 0;
  const pct = Math.round((unit.hp / unit.maxHp) * 100);
  const body = (
    <>
      <Sprite kind={unit.sprite} size={unit.sprite === 'weasel' ? 64 : 48} />
      <span className="unit-info">
        <span className="name">{unit.name}</span>
        <span className="bar" aria-hidden="true">
          <span style={{ inlineSize: `${pct}%` }} data-low={pct <= 30 ? '' : undefined} />
        </span>
        <span className="stats num">
          <span>{down ? 'Down' : `HP ${unit.hp}/${unit.maxHp}`}</span>
          {unit.side === 'party' && !down ? <span>SP {unit.sp}</span> : null}
        </span>
        {order && <span className="order">{order}</span>}
      </span>
    </>
  );
  const cls = `unit${active ? ' is-active' : ''}${down ? ' is-down' : ''}${hurt ? ' is-hurt' : ''}`;
  if (onPick) {
    return (
      <button type="button" className={`${cls} is-target`} onClick={onPick} aria-label={`Target ${unit.name}, HP ${unit.hp} of ${unit.maxHp}`}>
        {body}
      </button>
    );
  }
  return (
    <div className={cls} aria-current={active ? 'step' : undefined}>
      {body}
    </div>
  );
}
