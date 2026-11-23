// The screenshot scenes behind ?shot=start|play|win|loss. Each one plays the real
// rules forward from a fresh game, steered by a simple autopilot, so the frame is
// what a real game looks like and the same seed always gives the same frame.
// - start: one scripted turn, shown under the title screen.
// - play: the autopilot plays its best card every turn for five turns, mid-game.
// - win: the autopilot plays its best card every turn until the Vizier falls.
// - loss: the autopilot never plays a card, and the Vizier grinds it down.
import { PHASE_LOST, PHASE_PLAY, PHASE_WON } from './world.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

const PLAY_TURNS = 5;
const MAX_TURNS = 60;

/** Play the best card the player can, again and again, until nothing is worth playing. */
function playBestCards(world) {
  const state = world.state;
  for (;;) {
    const move = world.bestPlay(state.player, state.vizier, 0);
    if (!move) break;
    const result = world.playCard(state.player, state.vizier, move.handIndex, move.lane, 'You', 'the Vizier');
    if (!result.ok) break;
  }
}

/**
 * Run turns with `policy` ('best' plays the best cards, 'pass' plays none) until
 * `until` returns true or the game ends. Returns the number of turns played.
 */
function runTurns(world, policy, until) {
  let turns = 0;
  while (world.state.phase === PHASE_PLAY && turns < MAX_TURNS) {
    if (policy === 'best') playBestCards(world);
    world.endTurn();
    turns += 1;
    if (until && until(world.state)) break;
  }
  return turns;
}

/**
 * Set `world` to the named scene (start, play, win, loss; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.startGame();
  if (name === 'play') {
    runTurns(world, 'best', (state) => state.turn >= PLAY_TURNS);
    const over = world.state.phase !== PHASE_PLAY;
    return {
      screen: over ? (world.state.phase === PHASE_WON ? SCREEN_WON : SCREEN_LOST) : SCREEN_PLAY,
      best: world.state.score,
    };
  }
  if (name === 'win') {
    runTurns(world, 'best', (state) => state.phase === PHASE_WON);
    return { screen: world.state.phase === PHASE_WON ? SCREEN_WON : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'loss') {
    runTurns(world, 'pass', (state) => state.phase === PHASE_LOST);
    return { screen: world.state.phase === PHASE_LOST ? SCREEN_LOST : SCREEN_PLAY, best: world.state.score };
  }
  // start: one turn, then the title screen over the table.
  playBestCards(world);
  world.endTurn();
  return { screen: SCREEN_TITLE, best: 0 };
}
