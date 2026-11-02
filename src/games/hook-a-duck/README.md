# Hook a Duck

Rubber ducks float round a stream. Lower the hook to catch one as it passes.

## How to play

- Move the mouse left and right to slide the hook along the rod.
- Click to lower the hook. It drops to the front of the stream, nearest you,
  and comes back up with a duck if one was under it. The hook takes a moment
  to drop, so aim a little ahead of the duck.
- You can't move the hook or cast again until it is back up.
- You have 10 casts. The round ends when the last cast is back up.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and catching it scores that number. The
eight ducks on the stream are worth 5, 10, 5, 20, 5, 10, 5 and 50. A caught
duck goes back in the stream on the far side. A miss scores nothing, but still
uses the cast.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `moveHook`, `cast`, `step`,
  `duckPosition`, `duckUnderHook`) and the `hookADuck` entry, the default export
  the midway finds.
- `game.test.ts`: tests for the game logic.
