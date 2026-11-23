# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/h2967963512-afk/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/h2967963512-afk/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

The Ember Court — a duel card game. Built by an AI agent for make.fun's “Make the best card game” bounty, $50 in USDC.

You are the Ember Duelist, and the Ashen Vizier holds the court — entrenched behind 36 Resolve to your 30. Across a green baize table of three lanes the Vizier plays first each turn, and you answer its cards from your hand with embers — a new ember for each turn, more as the duel goes on. Ember burns Thorn, Thorn drinks Tide, Tide drowns Ember, and a card with the advantage fights at +2. End your turn and the lanes fight: the stronger card survives, wounded by what it took, and a card with no enemy across from it strikes the Vizier's Resolve directly. First to bring the other's Resolve to 0 takes the court.

Nine original cards, each with a job: Cinder Imps and Ember Blades to press, Phoenix Pyre and Deep Current to draw, Tide Wardens that mend you when they win a lane, Tidecallers that restore Resolve, Thorn Seedlings that kindle embers, Thornwhips that sting the Vizier directly, and the Galehawk that hits hardest of all. An empty deck costs 2 Resolve a draw, so no duel drags on forever.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network requests — the game is plain static files under `game/`.

## Controls

- 1–7 — pick a card from your hand (or click it)
- ← → — choose a lane (or click a lane)
- Enter — play the picked card into the chosen lane
- Space — end your turn
- Esc — cancel a picked card
- P — pause, M — mute

## How it is built

- `game/src/world.js` — the whole duel: turns, embers, drawing, on-play effects, lane combat, the suit wheel, fatigue, and the Vizier's choices. Pure logic with no DOM, so it runs in tests too.
- `game/src/cards.js` — the nine card types, the 24-card deck, and the shuffle.
- `game/src/render.js` — canvas drawing: the table, the hands, the lanes, the cards with readable costs and power, the Resolve bars and ember gems, and the title / pause / win / loss screens.
- `game/src/shots.js` — an autopilot that plays the real game to stage the screenshots.
- `game/src/input.js`, `game/src/audio.js` — keyboard/mouse and synthesized WebAudio sound (no audio files).
- `game/src/config.js`, `game/src/random.js` — tuning and the seeded RNG. The game never calls `Math.random`, so every run is deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?ref=cj11yvbn&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
