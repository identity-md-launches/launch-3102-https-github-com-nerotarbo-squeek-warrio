// Pure turn-based battle rules. Every random roll comes from the injected rng, so tests are deterministic.
import { SKILLS, STAGES, makeParty, type Unit } from './data';
import type { Stance } from './squeek';

export type Action = 'attack' | 'skill' | 'defend';
export interface Command {
  actor: string;
  action: Action;
  target?: string;
}

export type Phase = 'ready' | 'command' | 'won' | 'lost' | 'complete';

export interface Battle {
  stage: number;
  round: number;
  phase: Phase;
  units: Unit[];
  log: string[];
  /** Credits from the battle that was just won. */
  reward: number;
}

export type Rng = () => number;

/** Small seeded generator (mulberry32) for tests and replays. */
export function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const alive = (u: Unit) => u.hp > 0;
export const partyOf = (b: Battle) => b.units.filter((u) => u.side === 'party');
export const foesOf = (b: Battle) => b.units.filter((u) => u.side === 'foe');

export function newCampaign(): Battle {
  return { stage: 0, round: 0, phase: 'ready', units: makeParty(), log: [], reward: 0 };
}

/** Enter a stage: the party carries its HP, foes are fresh. */
export function startStage(b: Battle, stage: number): Battle {
  const s = STAGES[stage];
  const party = partyOf(b).map((u) => ({ ...u, defending: false }));
  return { stage, round: 1, phase: 'command', units: [...party, ...s.foes()], log: [`${s.name}. ${s.intro}`], reward: 0 };
}

/** Between stages every hamster recovers half of the missing HP (fallen ones get up at a quarter) and all SP. */
export function restParty(b: Battle): Battle {
  const units = b.units.map((u) => {
    if (u.side !== 'party') return u;
    const hp = u.hp > 0 ? u.hp + Math.ceil((u.maxHp - u.hp) / 2) : Math.ceil(u.maxHp / 4);
    return { ...u, hp: Math.min(u.maxHp, hp), sp: u.maxSp, defending: false };
  });
  return { ...b, units };
}

interface DamageInput {
  attacker: Unit;
  target: Unit;
  power: number;
  pierce?: boolean;
  stance: Stance;
  rng: Rng;
}

export function damage({ attacker, target, power, pierce, stance, rng }: DamageInput): { amount: number; crit: boolean } {
  const isParty = attacker.side === 'party';
  const atk = attacker.atk * power * (isParty ? stance.atk : 1);
  let def = target.def * (target.side === 'party' ? stance.def : 1);
  if (target.defending) def *= 2;
  if (pierce) def /= 2;
  const variance = 0.9 + rng() * 0.2;
  const crit = rng() < (isParty ? stance.crit : 0.08);
  const amount = Math.max(1, Math.round((atk - def * 0.5) * variance * (crit ? 1.5 : 1)));
  return { amount, crit };
}

/** Commands the party can still legally give: one per living hamster. */
export function needsCommand(b: Battle): Unit[] {
  return partyOf(b).filter(alive);
}

export function canUseSkill(u: Unit): boolean {
  return u.skill !== null && u.sp >= SKILLS[u.skill].cost;
}

/**
 * Resolve one round. Living units act in speed order. Hamsters follow the player's commands;
 * foes attack the hamster with the least HP half the time and a random one otherwise.
 * Cinder sweeps every hamster on every third round.
 */
export function resolveRound(prev: Battle, commands: Command[], stance: Stance, rng: Rng, chainRound: number | null): Battle {
  const units = prev.units.map((u) => ({ ...u, defending: false }));
  const byId = new Map(units.map((u) => [u.id, u]));
  const log: string[] = [];
  const cmdFor = new Map(commands.map((c) => [c.actor, c]));

  for (const c of commands) {
    const u = byId.get(c.actor);
    if (u && c.action === 'defend') u.defending = true;
  }

  const order = [...units].filter(alive).sort((a, b) => b.spd - a.spd || (a.side === 'party' ? -1 : 1));
  const living = (side: Unit['side']) => units.filter((u) => u.side === side && alive(u));

  const hit = (attacker: Unit, target: Unit, power: number, pierce = false) => {
    const { amount, crit } = damage({ attacker, target, power, pierce, stance, rng });
    target.hp = Math.max(0, target.hp - amount);
    const suffix = target.hp === 0 ? ` ${target.name} is down.` : '';
    log.push(`${attacker.name} hits ${target.name} for ${amount}${crit ? ', critical' : ''}.${suffix}`);
  };

  for (const actor of order) {
    if (!alive(actor)) continue;
    if (living('foe').length === 0 || living('party').length === 0) break;

    if (actor.side === 'party') {
      const c = cmdFor.get(actor.id) ?? { actor: actor.id, action: 'attack' as const };
      if (c.action === 'defend') {
        log.push(`${actor.name} braces behind a seed shield.`);
        continue;
      }
      if (c.action === 'skill' && canUseSkill(actor) && actor.skill) {
        const skill = SKILLS[actor.skill];
        actor.sp -= skill.cost;
        if (skill.id === 'rally') {
          const healed = living('party');
          for (const p of healed) p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp / 4));
          log.push(`${actor.name} uses Rally. ${healed.length} hamsters recover HP.`);
        } else if (skill.id === 'ember') {
          log.push(`${actor.name} scatters Ember seeds.`);
          for (const f of living('foe')) hit(actor, f, 0.8);
        } else {
          const t = byId.get(c.target ?? '');
          const target = t && alive(t) && t.side === 'foe' ? t : living('foe')[0];
          log.push(`${actor.name} uses Thorn lunge.`);
          hit(actor, target, 1.7, true);
        }
        continue;
      }
      const t = byId.get(c.target ?? '');
      const target = t && alive(t) && t.side === 'foe' ? t : living('foe')[0];
      hit(actor, target, 1);
      continue;
    }

    const party = living('party');
    if (actor.id === 'cinder' && prev.round % 3 === 0) {
      log.push(`${actor.name} sweeps a wave of ash.`);
      for (const p of party) hit(actor, p, 0.7);
      continue;
    }
    const weakest = [...party].sort((a, b) => a.hp - b.hp)[0];
    const target = rng() < 0.5 ? weakest : party[Math.floor(rng() * party.length)];
    hit(actor, target, 1);
  }

  const next: Battle = { ...prev, units, round: prev.round + 1, log: [...prev.log, `Round ${prev.round}`, ...log].slice(-40) };
  if (living('foe').length === 0) {
    const reward = rewardFor(prev.stage, stance, chainRound);
    const last = prev.stage === STAGES.length - 1;
    next.phase = last ? 'complete' : 'won';
    next.reward = reward;
    next.log.push(`${STAGES[prev.stage].name} cleared. You earn ${reward} SQK credits.`);
  } else if (living('party').length === 0) {
    next.phase = 'lost';
    next.log.push('Every hamster is down. Retry the stage to try again.');
  }
  return next;
}

/** Stage base, x1.5 in Wheel frenzy, plus the last digit of the live Squeekchain round. */
export function rewardFor(stage: number, stance: Stance, chainRound: number | null): number {
  const base = STAGES[stage].reward * (stance.id === 'frenzy' ? 1.5 : 1);
  return Math.round(base + (chainRound !== null ? chainRound % 10 : 0));
}
