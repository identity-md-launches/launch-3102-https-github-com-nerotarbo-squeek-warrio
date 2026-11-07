import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/game/data';
import { damage, foesOf, needsCommand, newCampaign, partyOf, resolveRound, restParty, rewardFor, seeded, startStage } from '../src/game/battle';
import { EMPTY_READING, parseEconomy, parseStatus, stanceFor } from '../src/game/squeek';

const guard = stanceFor(EMPTY_READING);
const frenzy = stanceFor({ ...EMPTY_READING, state: 'running', rpm: 100 });

describe('squeekchain parsing', () => {
  it('reads a running wheel', () => {
    const s = parseStatus({ measurement: { freshness: 'online', coreStatus: 'RUNNING', rpmMilli: 42500, cumulativeWorkUnits: '18553', observedAt: '2026-11-07T09:21:00Z' } });
    expect(s).toMatchObject({ state: 'running', rpm: 42.5, workUnits: '18553', stale: false });
  });
  it('treats IDLE, zero RPM or stale readings as resting', () => {
    expect(parseStatus({ measurement: { freshness: 'online', coreStatus: 'IDLE', rpmMilli: 0 } }).state).toBe('resting');
    expect(parseStatus({ measurement: { freshness: 'stale', coreStatus: 'RUNNING', rpmMilli: 9000 } }).state).toBe('resting');
    expect(parseStatus(null).state).toBe('resting');
  });
  it('reads the economy round', () => {
    expect(parseEconomy({ status: 'available', lifecycle: { currentRound: '513' }, chain: { chainId: '11155111' } })).toEqual({ round: '513', chainId: '11155111' });
    expect(parseEconomy({ status: 'unavailable' })).toEqual({ round: null, chainId: null });
  });
  it('maps wheel state to a stance', () => {
    expect(guard).toMatchObject({ id: 'guard', atk: 1, def: 1.2 });
    expect(frenzy).toMatchObject({ id: 'frenzy', atk: 1.5, crit: 0.25 });
    expect(stanceFor({ ...EMPTY_READING, state: 'running', rpm: 20 }).atk).toBe(1.26);
  });
});

describe('battle rules', () => {
  it('frenzy hits harder than guard for the same rolls', () => {
    const b = startStage(newCampaign(), 0);
    const [pip] = partyOf(b);
    const [rat] = foesOf(b);
    const a = damage({ attacker: pip, target: rat, power: 1, stance: guard, rng: () => 0.5 });
    const f = damage({ attacker: pip, target: rat, power: 1, stance: frenzy, rng: () => 0.5 });
    expect(f.amount).toBeGreaterThan(a.amount);
  });
  it('defending halves incoming pressure', () => {
    const b = startStage(newCampaign(), 0);
    const [pip] = partyOf(b);
    const [rat] = foesOf(b);
    const open = damage({ attacker: rat, target: pip, power: 1, stance: guard, rng: () => 0.5 });
    const braced = damage({ attacker: rat, target: { ...pip, defending: true }, power: 1, stance: guard, rng: () => 0.5 });
    expect(braced.amount).toBeLessThan(open.amount);
  });
  it('a full campaign can be won by attacking, and pays credits', () => {
    let b = startStage(newCampaign(), 0);
    const rng = seeded(7);
    let total = 0;
    for (let guardRail = 0; guardRail < 200 && b.phase !== 'complete'; guardRail++) {
      if (b.phase === 'won') {
        total += b.reward;
        b = startStage(restParty(b), b.stage + 1);
        continue;
      }
      expect(b.phase).toBe('command');
      const target = foesOf(b).find((f) => f.hp > 0)!.id;
      const cmds = needsCommand(b).map((u) => (u.skill && u.sp >= 6 && u.skill === 'ember' ? { actor: u.id, action: 'skill' as const } : { actor: u.id, action: 'attack' as const, target }));
      b = resolveRound(b, cmds, frenzy, rng, 513);
    }
    expect(b.phase).toBe('complete');
    total += b.reward;
    expect(total).toBe(rewardFor(0, frenzy, 513) + rewardFor(1, frenzy, 513) + rewardFor(2, frenzy, 513));
  });
  it('rewards use the stage base, frenzy bonus and round digit', () => {
    expect(rewardFor(0, guard, null)).toBe(STAGES[0].reward);
    expect(rewardFor(0, guard, 513)).toBe(23);
    expect(rewardFor(2, frenzy, 517)).toBe(97);
  });
  it('skills spend SP and rally heals', () => {
    let b = startStage(newCampaign(), 0);
    b = { ...b, units: b.units.map((u) => (u.id === 'mochi' ? { ...u, hp: 10 } : u)) };
    const next = resolveRound(b, [{ actor: 'pip', action: 'skill' }, { actor: 'mochi', action: 'defend' }, { actor: 'bramble', action: 'defend' }], guard, seeded(1), null);
    const pip = next.units.find((u) => u.id === 'pip')!;
    expect(pip.sp).toBe(pip.maxSp - 5);
    expect(next.log.some((l) => l.includes('Rally'))).toBe(true);
  });
  it('rest restores SP and revives fallen hamsters at a quarter HP', () => {
    const b = startStage(newCampaign(), 0);
    const hurt = { ...b, units: b.units.map((u) => (u.id === 'mochi' ? { ...u, hp: 0, sp: 0 } : u)) };
    const mochi = restParty(hurt).units.find((u) => u.id === 'mochi')!;
    expect(mochi.hp).toBe(Math.ceil(mochi.maxHp / 4));
    expect(mochi.sp).toBe(mochi.maxSp);
  });
});
