import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  HOLE_RADIUS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  ROWS,
  SPAWN_INTERVAL,
  UP_TIME,
  createState,
  holeAt,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

const first = () => 0;

describe('whack-a-mole', () => {
  it('starts a full round with an empty grid and no score', () => {
    const state = createState();
    expect(state.holes).toHaveLength(COLUMNS * ROWS);
    expect(state.holes.every((hole) => hole.moleLeft === 0)).toBe(true);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up when the spawn timer runs out', () => {
    const state = createState();
    state.nextSpawn = 0.1;
    step(state, 0.2, first);
    expect(state.holes[0].moleLeft).toBeCloseTo(UP_TIME.start, 1);
    expect(state.holes.filter((hole) => hole.moleLeft > 0)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    state.nextSpawn = 100;
    state.holes[4].moleLeft = 0.5;
    step(state, 0.6, first);
    expect(state.holes[4].moleLeft).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    const hole = state.holes[4];
    hole.moleLeft = 1;
    expect(whack(state, hole.x + 10, hole.y - 10)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.moleLeft).toBe(0);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('scores nothing for an empty hole or a miss', () => {
    const state = createState();
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    hole.moleLeft = 1;
    expect(whack(state, hole.x + HOLE_RADIUS + 5, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('finds the hole under a point', () => {
    const state = createState();
    const hole = state.holes[2];
    expect(holeAt(state, hole.x, hole.y)).toBe(hole);
    expect(holeAt(state, 0, 0)).toBeUndefined();
  });

  it('pops moles up faster and for less time as the round goes on', () => {
    const state = createState();
    expect(spawnInterval(state)).toBe(SPAWN_INTERVAL.start);
    expect(upTime(state)).toBe(UP_TIME.start);
    state.timeLeft = ROUND_SECONDS / 2;
    expect(spawnInterval(state)).toBeLessThan(SPAWN_INTERVAL.start);
    expect(upTime(state)).toBeLessThan(UP_TIME.start);
    state.timeLeft = 0;
    expect(spawnInterval(state)).toBe(SPAWN_INTERVAL.end);
    expect(upTime(state)).toBe(UP_TIME.end);
  });

  it('ends the round when time runs out and stops scoring', () => {
    const state = createState();
    state.holes[0].moleLeft = 5;
    step(state, ROUND_SECONDS + 1, first);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((hole) => hole.moleLeft === 0)).toBe(true);
    const hole = state.holes[0];
    hole.moleLeft = 1;
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('keeps playing until the time is up', () => {
    const state = createState();
    step(state, ROUND_SECONDS - 1, first);
    expect(state.phase).toBe('playing');
  });
});
