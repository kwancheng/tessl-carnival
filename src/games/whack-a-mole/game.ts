import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 48;
/** Seconds between pop-ups at the start and at the end of a round. */
export const SPAWN_INTERVAL = { start: 1.0, end: 0.35 } as const;
/** Seconds a mole stays up at the start and at the end of a round. */
export const UP_TIME = { start: 1.3, end: 0.6 } as const;
const BONK_SECONDS = 0.25;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole has left above ground; 0 when the hole is empty. */
  moleLeft: number;
  /** Seconds left on the whack flash. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextSpawn: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({
        x: (WIDTH / COLUMNS) * (col + 0.5),
        y: 130 + row * 120,
        moleLeft: 0,
        bonk: 0,
      });
    }
  }
  return {
    holes,
    timeLeft: ROUND_SECONDS,
    nextSpawn: 0.5,
    score: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(Math.max(1 - state.timeLeft / ROUND_SECONDS, 0), 1);
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Seconds between pop-ups: shorter as the round goes on. */
export function spawnInterval(state: WhackAMoleState): number {
  return lerp(SPAWN_INTERVAL.start, SPAWN_INTERVAL.end, progress(state));
}

/** Seconds a new mole stays up: shorter as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

/** Returns the hole under a point, if any. */
export function holeAt(state: WhackAMoleState, x: number, y: number): Hole | undefined {
  return state.holes.find((hole) => Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS);
}

/** Whacks at a point. Returns true if it hit a mole that was up. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = holeAt(state, x, y);
  if (!hole || hole.moleLeft <= 0) return false;
  hole.moleLeft = 0;
  hole.bonk = BONK_SECONDS;
  state.score += POINTS_PER_WHACK;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` picks which empty hole the next
 * mole pops up from; tests pass their own.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(state.timeLeft - dt, 0);
  for (const hole of state.holes) {
    hole.moleLeft = Math.max(hole.moleLeft - dt, 0);
    hole.bonk = Math.max(hole.bonk - dt, 0);
  }

  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.moleLeft = 0;
    state.phase = 'over';
    return;
  }

  state.nextSpawn -= dt;
  if (state.nextSpawn <= 0) {
    const empty = state.holes.filter((hole) => hole.moleLeft === 0 && hole.bonk === 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(Math.floor(random() * empty.length), empty.length - 1)];
      hole.moleLeft = upTime(state);
    }
    state.nextSpawn = spawnInterval(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The mole, drawn behind the front lip of its hole.
    if (hole.moleLeft > 0 || hole.bonk > 0) {
      const headY = hole.y - HOLE_RADIUS * 0.45;
      ctx.fillStyle = hole.bonk > 0 ? colors.danger : colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, headY, HOLE_RADIUS * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(hole.x - 12, headY - 8, 5, 0, Math.PI * 2);
      ctx.arc(hole.x + 12, headY - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, headY + 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y, HOLE_RADIUS, HOLE_RADIUS * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.wood;
    ctx.fillRect(hole.x - HOLE_RADIUS, hole.y, HOLE_RADIUS * 2, HOLE_RADIUS * 0.35);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Whack the moles before they duck back down. They get quicker as time runs out.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      whack(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(whackAMole.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default whackAMole;
