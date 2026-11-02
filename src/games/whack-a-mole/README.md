# Whack-a-Mole

Whack the moles as they pop up from the nine holes, before they duck back down.

## How to play

- Moles pop up from a 3 by 3 grid of holes, one at a time, and drop back down after a moment.
- Click a mole while it's up to whack it.
- The round lasts 30 seconds. As it goes on, moles pop up more often and stay up for less time:
  a new mole every 1 second at the start, down to every 0.35 seconds at the end, and up for
  1.3 seconds at the start, down to 0.6 seconds at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole or missing costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `holeAt`, `spawnInterval`,
  `upTime`) and the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
