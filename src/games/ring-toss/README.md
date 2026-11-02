# Ring Toss

Land rings on the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim. The circle shows where the ring will land.
- Click to throw a ring. You throw one ring at a time: the next throw waits
  until the last ring has landed.
- The throw sways from side to side by up to 18 px, so time your click.
- You have 8 rings. The round ends when the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of a bottle's neck. Each bottle takes
one ring; a second ring on the same bottle scores nothing.

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `toss`, `step`, `bottleAt`, `swayAt`,
  `ringPosition`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
