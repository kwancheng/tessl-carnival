import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 8;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How close to a bottle's neck a ring must land, in pixels. */
export const NECK_RADIUS = 14;
/** How far the throw drifts from the aim, at most, in pixels. */
export const SWAY = 18;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
/** Rows from the back of the booth to the front. Further back scores more. */
const ROWS = [
  { y: 130, points: 30 },
  { y: 200, points: 20 },
  { y: 270, points: 10 },
];
const BOTTLES_PER_ROW = 5;

export interface Bottle {
  x: number;
  /** Where the neck is: the point a ring has to land on. */
  y: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  ring: Ring | null;
  /** Where missed rings came down, so the player can see how far off they were. */
  misses: { x: number; y: number }[];
  rings: number;
  score: number;
  /** Seconds since the round started; drives the sway of the throw. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = WIDTH / (BOTTLES_PER_ROW + 1);
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: BOTTLES_PER_ROW }, (_, i) => ({
      x: spacing * (i + 1),
      y: row.y,
      points: row.points,
      ringed: false,
    })),
  );
  return {
    bottles,
    ring: null,
    misses: [],
    rings: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** The throw drifts side to side over time, so aiming takes a steady hand. */
export function swayAt(time: number): number {
  return SWAY * Math.sin(time * 3);
}

/** The bottle a ring landing at (x, y) rings, if any. A bottle only takes one ring. */
export function bottleAt(state: RingTossState, x: number, y: number): Bottle | undefined {
  return state.bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= NECK_RADIUS);
}

/** Throws one ring towards the aim point. Returns false if nothing was thrown. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.rings === 0 || state.ring) return false;
  state.ring = {
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + swayAt(state.time),
    toY: Math.min(aimY, THROWER.y - 1),
    age: 0,
  };
  state.rings -= 1;
  return true;
}

/** Where a ring in the air is now, and how high above the ground it is. */
export function ringPosition(ring: Ring): { x: number; y: number; height: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t,
    height: 120 * 4 * t * (1 - t),
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const ring = state.ring;
  if (ring) {
    ring.age += dt;
    if (ring.age >= FLIGHT_TIME) {
      const bottle = bottleAt(state, ring.toX, ring.toY);
      if (bottle) {
        bottle.ringed = true;
        state.score += bottle.points;
      } else {
        state.misses.push({ x: ring.toX, y: ring.toY });
      }
      state.ring = null;
    }
  }

  if (state.rings === 0 && !state.ring) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Shelves, one under each row.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(40, row.y + 40, WIDTH - 80, 8);
  }

  for (const bottle of state.bottles) {
    ctx.fillStyle = colors.water;
    ctx.fillRect(bottle.x - 12, bottle.y + 12, 24, 28);
    ctx.fillRect(bottle.x - 5, bottle.y - 4, 10, 18);
    ctx.fillStyle = colors.surface;
    ctx.fillRect(bottle.x - 6, bottle.y - 8, 12, 5);
    if (bottle.ringed) drawRing(ctx, bottle.x, bottle.y + 8);
  }

  ctx.fillStyle = colors.muted;
  for (const miss of state.misses) {
    ctx.beginPath();
    ctx.arc(miss.x, miss.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Where the next ring would land, with the sway.
  if (state.phase === 'playing' && !state.ring && state.rings > 0) {
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      aim.x + swayAt(state.time),
      Math.min(aim.y, THROWER.y - 1),
      NECK_RADIUS,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  if (state.ring) {
    const { x, y, height } = ringPosition(state.ring);
    drawRing(ctx, x, y - height, 1 + height / 240);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.rings}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: HEIGHT / 2 };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
