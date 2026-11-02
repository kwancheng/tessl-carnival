import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const CASTS = 10;
export const DUCK_SPEED = 110;
export const DUCK_RADIUS = 22;
/** How close the hook has to land to a duck's centre to catch it. */
export const CATCH_RADIUS = 26;
/** Seconds the hook takes to go down, and again to come back up. */
export const DROP_TIME = 0.35;
/** The number on the base of each duck, in order round the stream. */
export const DUCK_VALUES = [5, 10, 5, 20, 5, 10, 5, 50] as const;

/** The stream: two straights joined by half circles, ducks going round anticlockwise on screen. */
export const STREAM = { left: 200, right: 600, centerY: 290, radius: 110 } as const;
const STRAIGHT = STREAM.right - STREAM.left;
export const LOOP_LENGTH = 2 * STRAIGHT + 2 * Math.PI * STREAM.radius;
/** Where the rod hangs the hook from, and how far down it reaches. */
const ROD_Y = 70;

export interface Duck {
  /** Distance travelled round the loop, from the left end of the front straight. */
  distance: number;
  value: number;
}

export interface Hook {
  x: number;
  /** 0 is up at the rod, 1 is fully lowered. */
  depth: number;
  motion: 'idle' | 'lowering' | 'raising';
  /** The value of the duck on the hook, while it comes back up. */
  caught: number | null;
}

export interface Catch {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface HookADuckState {
  ducks: Duck[];
  hook: Hook;
  catches: Catch[];
  casts: number;
  score: number;
  phase: 'playing' | 'over';
}

export function createState(): HookADuckState {
  const spacing = LOOP_LENGTH / DUCK_VALUES.length;
  return {
    ducks: DUCK_VALUES.map((value, i) => ({ distance: spacing * i, value })),
    hook: { x: WIDTH / 2, depth: 0, motion: 'idle', caught: null },
    catches: [],
    casts: CASTS,
    score: 0,
    phase: 'playing',
  };
}

/** Where a duck is on the canvas, from how far round the loop it has floated. */
export function duckPosition(distance: number): { x: number; y: number } {
  const { left, right, centerY, radius } = STREAM;
  const arc = Math.PI * radius;
  let d = ((distance % LOOP_LENGTH) + LOOP_LENGTH) % LOOP_LENGTH;
  // Front straight, left to right.
  if (d < STRAIGHT) return { x: left + d, y: centerY + radius };
  d -= STRAIGHT;
  // Right bend, up and round.
  if (d < arc) {
    const angle = Math.PI / 2 - d / radius;
    return { x: right + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  }
  d -= arc;
  // Back straight, right to left.
  if (d < STRAIGHT) return { x: right - d, y: centerY - radius };
  d -= STRAIGHT;
  // Left bend, down and round.
  const angle = -Math.PI / 2 - d / radius;
  return { x: left + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
}

/** Where the hook reaches when fully lowered: the front straight, nearest the player. */
export const HOOK_BOTTOM = STREAM.centerY + STREAM.radius;

export function hookTip(hook: Hook): { x: number; y: number } {
  return { x: hook.x, y: ROD_Y + (HOOK_BOTTOM - ROD_Y) * hook.depth };
}

/** Slides the hook along the rod. It only moves while it is up. */
export function moveHook(state: HookADuckState, x: number): void {
  if (state.hook.motion !== 'idle') return;
  state.hook.x = Math.max(STREAM.left - STREAM.radius, Math.min(STREAM.right + STREAM.radius, x));
}

/** Lowers the hook, using one cast. Returns false if nothing happened. */
export function cast(state: HookADuckState): boolean {
  if (state.phase !== 'playing' || state.casts === 0 || state.hook.motion !== 'idle') return false;
  state.hook.motion = 'lowering';
  state.casts -= 1;
  return true;
}

/** The duck the hook catches when it reaches the water, if one is close enough. */
export function duckUnderHook(state: HookADuckState): Duck | undefined {
  const tip = hookTip({ ...state.hook, depth: 1 });
  return state.ducks.find((duck) => {
    const at = duckPosition(duck.distance);
    return Math.hypot(at.x - tip.x, at.y - tip.y) <= CATCH_RADIUS;
  });
}

/** Advances the game by `dt` seconds. */
export function step(state: HookADuckState, dt: number): void {
  for (const duck of state.ducks) {
    duck.distance = (duck.distance + DUCK_SPEED * dt) % LOOP_LENGTH;
  }

  const { hook } = state;
  if (hook.motion === 'lowering') {
    hook.depth = Math.min(1, hook.depth + dt / DROP_TIME);
    if (hook.depth === 1) {
      const duck = duckUnderHook(state);
      if (duck) {
        hook.caught = duck.value;
        // The duck goes back in the stream behind the others.
        duck.distance = (duck.distance + LOOP_LENGTH / 2) % LOOP_LENGTH;
      }
      hook.motion = 'raising';
    }
  } else if (hook.motion === 'raising') {
    hook.depth = Math.max(0, hook.depth - dt / DROP_TIME);
    if (hook.depth === 0) {
      if (hook.caught !== null) {
        state.score += hook.caught;
        state.catches.push({ x: hook.x, y: ROD_Y + 40, value: hook.caught, age: 0 });
        hook.caught = null;
      }
      hook.motion = 'idle';
    }
  }

  for (const caught of state.catches) caught.age += dt;
  state.catches = state.catches.filter((c) => c.age < 1);

  if (state.casts === 0 && hook.motion === 'idle') state.phase = 'over';
}

function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, label?: number) {
  const { colors } = theme;
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.ellipse(x, y, DUCK_RADIUS, DUCK_RADIUS * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.6, y - DUCK_RADIUS * 0.7, DUCK_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeA;
  ctx.beginPath();
  ctx.moveTo(x + DUCK_RADIUS * 1.0, y - DUCK_RADIUS * 0.75);
  ctx.lineTo(x + DUCK_RADIUS * 1.4, y - DUCK_RADIUS * 0.6);
  ctx.lineTo(x + DUCK_RADIUS * 1.0, y - DUCK_RADIUS * 0.5);
  ctx.fill();
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x + DUCK_RADIUS * 0.7, y - DUCK_RADIUS * 0.8, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (label !== undefined) {
    // A caught duck hangs upside down, showing the number on its base.
    ctx.fillStyle = colors.background;
    ctx.font = canvasFont('small', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(String(label), x, y + 5);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: HookADuckState) {
  const { colors } = theme;
  const { left, right, centerY, radius } = STREAM;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The stream: a wooden trough with water running round it.
  const loopPath = () => {
    ctx.beginPath();
    ctx.arc(right, centerY, radius, -Math.PI / 2, Math.PI / 2);
    ctx.arc(left, centerY, radius, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.closePath();
  };
  ctx.lineCap = 'round';
  loopPath();
  ctx.strokeStyle = colors.wood;
  ctx.lineWidth = 70;
  ctx.stroke();
  loopPath();
  ctx.strokeStyle = colors.water;
  ctx.lineWidth = 56;
  ctx.stroke();

  for (const duck of state.ducks) {
    const at = duckPosition(duck.distance);
    drawDuck(ctx, at.x, at.y);
  }

  // Rod, line and hook.
  const { hook } = state;
  const tip = hookTip(hook);
  ctx.fillStyle = colors.wood;
  ctx.fillRect(40, ROD_Y - 8, WIDTH - 80, 8);
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hook.x, ROD_Y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y + 6, 6, 0, Math.PI);
  ctx.stroke();
  if (hook.caught !== null) drawDuck(ctx, tip.x, tip.y + 12 + DUCK_RADIUS, hook.caught);

  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'center';
  for (const caught of state.catches) {
    ctx.globalAlpha = 1 - caught.age;
    ctx.fillStyle = colors.accent;
    ctx.fillText(`+${caught.value}`, caught.x, caught.y - caught.age * 30);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Casts ${state.casts}/${CASTS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of casts! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const hookADuck: CarnivalGame = {
  id: 'hook-a-duck',
  name: 'Hook a Duck',
  description: 'Lower the hook to catch a duck as it floats past. Each duck hides a number.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => moveHook(state, toCanvasX(event));
    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        moveHook(state, toCanvasX(event));
        cast(state);
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
        recordScore(hookADuck.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
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

export default hookADuck;
