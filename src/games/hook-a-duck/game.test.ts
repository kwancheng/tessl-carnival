import { describe, expect, it } from 'vitest';
import {
  CASTS,
  DROP_TIME,
  DUCK_VALUES,
  HOOK_BOTTOM,
  LOOP_LENGTH,
  STREAM,
  cast,
  createState,
  duckPosition,
  duckUnderHook,
  moveHook,
  step,
  type HookADuckState,
} from './game';

/** A state with one duck sitting right under the hook, and the ducks stopped. */
function withDuckUnderHook(value: number): HookADuckState {
  const state = createState();
  state.ducks = [{ distance: 0, value }];
  state.hook.x = STREAM.left;
  return state;
}

/** Runs the hook all the way down and back up, holding the ducks still until it lands. */
function runCast(state: HookADuckState) {
  const held = state.ducks.map((d) => d.distance);
  for (let t = 0; t < DROP_TIME * 2 + 0.1; t += 0.01) {
    if (state.hook.motion === 'lowering') state.ducks.forEach((d, i) => (d.distance = held[i]));
    step(state, 0.01);
  }
}

describe('hook a duck', () => {
  it('starts with every cast left, no score and a duck for each number', () => {
    const state = createState();
    expect(state.casts).toBe(CASTS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.ducks.map((d) => d.value)).toEqual([...DUCK_VALUES]);
  });

  it('floats the ducks round the stream in a loop', () => {
    expect(duckPosition(0)).toEqual({ x: STREAM.left, y: HOOK_BOTTOM });
    const back = duckPosition(LOOP_LENGTH / 2);
    expect(back.x).toBeCloseTo(STREAM.right);
    expect(back.y).toBeCloseTo(STREAM.centerY - STREAM.radius);
    const round = duckPosition(LOOP_LENGTH);
    expect(round.x).toBeCloseTo(STREAM.left);
    expect(round.y).toBeCloseTo(HOOK_BOTTOM);
  });

  it('uses one cast each time the hook goes down', () => {
    const state = createState();
    expect(cast(state)).toBe(true);
    expect(state.casts).toBe(CASTS - 1);
    expect(state.hook.motion).toBe('lowering');
  });

  it('cannot cast again while the hook is still down', () => {
    const state = createState();
    cast(state);
    expect(cast(state)).toBe(false);
    expect(state.casts).toBe(CASTS - 1);
  });

  it('cannot move the hook while it is down', () => {
    const state = createState();
    const x = state.hook.x;
    cast(state);
    moveHook(state, x + 100);
    expect(state.hook.x).toBe(x);
  });

  it('scores the number on the base of the duck it catches', () => {
    const state = withDuckUnderHook(20);
    expect(duckUnderHook(state)?.value).toBe(20);
    cast(state);
    runCast(state);
    expect(state.score).toBe(20);
    expect(state.hook.motion).toBe('idle');
  });

  it('scores nothing when the hook misses', () => {
    const state = withDuckUnderHook(20);
    state.hook.x = STREAM.right;
    expect(duckUnderHook(state)).toBeUndefined();
    cast(state);
    runCast(state);
    expect(state.score).toBe(0);
  });

  it('ends the round when the last cast is back up', () => {
    const state = withDuckUnderHook(5);
    state.casts = 1;
    cast(state);
    step(state, 0.01);
    expect(state.phase).toBe('playing');
    runCast(state);
    expect(state.phase).toBe('over');
    expect(cast(state)).toBe(false);
  });
});
