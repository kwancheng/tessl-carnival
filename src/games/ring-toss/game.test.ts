import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  NECK_RADIUS,
  RINGS_PER_ROUND,
  SWAY,
  bottleAt,
  createState,
  ringPosition,
  step,
  swayAt,
  toss,
} from './game';

/** Throws at (x, y) with no sway and lets the ring land. */
function tossAndLand(state: ReturnType<typeof createState>, x: number, y: number) {
  state.time = 0;
  toss(state, x, y);
  step(state, FLIGHT_TIME);
}

describe('ring toss', () => {
  it('starts with a full set of rings, no score and no bottles ringed', () => {
    const state = createState();
    expect(state.rings).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles.length).toBeGreaterThan(0);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('uses one ring per toss', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
    expect(state.ring).not.toBeNull();
  });

  it('throws only one ring at a time', () => {
    const state = createState();
    toss(state, 400, 200);
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toBe(RINGS_PER_ROUND - 1);
  });

  it('cannot toss once the rings run out', () => {
    const state = createState();
    state.rings = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.ring).toBeNull();
  });

  it('scores a ring that lands on a bottle neck, once the ring comes down', () => {
    const state = createState();
    const bottle = state.bottles[0];
    state.time = 0;
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
    expect(state.ring).toBeNull();
  });

  it('scores nothing for a ring that misses every neck', () => {
    const state = createState();
    tossAndLand(state, 5, 450);
    expect(state.score).toBe(0);
    expect(state.misses).toHaveLength(1);
  });

  it('lets each bottle take only one ring', () => {
    const state = createState();
    const bottle = state.bottles[0];
    tossAndLand(state, bottle.x, bottle.y);
    tossAndLand(state, bottle.x, bottle.y);
    expect(state.score).toBe(bottle.points);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const back = state.bottles.reduce((a, b) => (b.y < a.y ? b : a));
    const front = state.bottles.reduce((a, b) => (b.y > a.y ? b : a));
    expect(back.points).toBeGreaterThan(front.points);
  });

  it('detects a ring on the neck and a ring beside it', () => {
    const state = createState();
    const bottle = state.bottles[0];
    expect(bottleAt(state, bottle.x + NECK_RADIUS - 1, bottle.y)).toBe(bottle);
    expect(bottleAt(state, bottle.x + NECK_RADIUS + 1, bottle.y)).toBeUndefined();
  });

  it('drifts the throw with the sway, never further than SWAY', () => {
    expect(swayAt(0)).toBe(0);
    for (let t = 0; t < 5; t += 0.1) expect(Math.abs(swayAt(t))).toBeLessThanOrEqual(SWAY);
    const state = createState();
    state.time = 0.5;
    toss(state, 400, 200);
    expect(state.ring?.toX).toBeCloseTo(400 + swayAt(0.5));
  });

  it('arcs the ring through the air and brings it down on the aim', () => {
    const state = createState();
    state.time = 0;
    toss(state, 400, 200);
    const ring = state.ring!;
    ring.age = FLIGHT_TIME / 2;
    expect(ringPosition(ring).height).toBeGreaterThan(0);
    ring.age = FLIGHT_TIME;
    expect(ringPosition(ring)).toEqual({ x: 400, y: 200, height: 0 });
  });

  it('ends the round when the last ring has landed', () => {
    const state = createState();
    state.rings = 1;
    state.time = 0;
    toss(state, 5, 450);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('over');
  });
});
