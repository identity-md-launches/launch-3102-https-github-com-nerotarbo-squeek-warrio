// Original cast and stages for Squeek Warriors.

export type Side = 'party' | 'foe';
export type SpriteKind = 'guard' | 'sage' | 'lancer' | 'rat' | 'crow' | 'weasel';
export type SkillId = 'rally' | 'ember' | 'lunge';

export interface Unit {
  id: string;
  name: string;
  title: string;
  side: Side;
  sprite: SpriteKind;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  atk: number;
  def: number;
  spd: number;
  skill: SkillId | null;
  defending: boolean;
}

export interface Skill {
  id: SkillId;
  name: string;
  cost: number;
  /** Who the player picks: one foe, or nobody (the skill covers a whole side). */
  target: 'foe' | 'none';
  help: string;
}

export const SKILLS: Record<SkillId, Skill> = {
  rally: { id: 'rally', name: 'Rally', cost: 5, target: 'none', help: 'Heals every hamster by a quarter of their max HP.' },
  ember: { id: 'ember', name: 'Ember seeds', cost: 6, target: 'none', help: 'Hits every foe for most of a normal attack.' },
  lunge: { id: 'lunge', name: 'Thorn lunge', cost: 4, target: 'foe', help: 'One heavy strike that pierces half of the defence.' },
};

const unit = (u: Omit<Unit, 'maxHp' | 'maxSp' | 'defending'>): Unit => ({ ...u, maxHp: u.hp, maxSp: u.sp, defending: false });

export const makeParty = (): Unit[] => [
  unit({ id: 'pip', name: 'Pip', title: 'Seed guard', side: 'party', sprite: 'guard', hp: 130, sp: 12, atk: 22, def: 16, spd: 8, skill: 'rally' }),
  unit({ id: 'mochi', name: 'Mochi', title: 'Ember sage', side: 'party', sprite: 'sage', hp: 90, sp: 18, atk: 26, def: 8, spd: 12, skill: 'ember' }),
  unit({ id: 'bramble', name: 'Bramble', title: 'Thorn lancer', side: 'party', sprite: 'lancer', hp: 105, sp: 10, atk: 32, def: 11, spd: 15, skill: 'lunge' }),
];

export interface Stage {
  id: string;
  name: string;
  intro: string;
  reward: number;
  foes: () => Unit[];
}

const rat = (id: string, name = 'Rust rat') =>
  unit({ id, name, title: 'Raider', side: 'foe', sprite: 'rat', hp: 60, sp: 0, atk: 20, def: 6, spd: 10, skill: null });
const crow = (id: string) =>
  unit({ id, name: 'Soot crow', title: 'Scout', side: 'foe', sprite: 'crow', hp: 52, sp: 0, atk: 24, def: 4, spd: 16, skill: null });

export const STAGES: Stage[] = [
  {
    id: 'meadow',
    name: 'Clover meadow',
    intro: 'Two rust rats are chewing through the seed store.',
    reward: 20,
    foes: () => [rat('rat-a'), rat('rat-b')],
  },
  {
    id: 'bridge',
    name: 'Burrow bridge',
    intro: 'Soot crows guard the bridge to the old wheel house.',
    reward: 35,
    foes: () => [crow('crow-a'), rat('rat-c', 'Rat sergeant'), crow('crow-b')],
  },
  {
    id: 'gate',
    name: 'Ashwood gate',
    intro: 'Cinder, the weasel warlord, blocks the gate to the kingdom.',
    reward: 60,
    foes: () => [
      rat('rat-d'),
      unit({ id: 'cinder', name: 'Cinder', title: 'Weasel warlord', side: 'foe', sprite: 'weasel', hp: 240, sp: 0, atk: 30, def: 12, spd: 11, skill: null }),
      rat('rat-e'),
    ],
  },
];
