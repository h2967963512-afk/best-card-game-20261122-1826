// Boot and the one loop: input is read every frame, the world advances only when
// the player acts (it is a turn-based duel), and the renderer paints what is
// there, easing cards toward their places. The game moves between five screens:
// title, play, paused, won and lost.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|loss (with &seed=N) stages that
// scene instead of running the loop, paints it until the cards settle and sets
// window.__shotReady for a screenshot. Without ?seed=, each "Play again" in a visit steps the seed
// on, so rematches shuffle differently — still with no unseeded randomness and
// no clock in the game itself.
import { BASE_SEED, FIELD, BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, PHASE_LOST, PHASE_PLAY, PHASE_WON } from './world.js';
import {
  ACTION_CANCEL,
  ACTION_CONFIRM,
  ACTION_END,
  ACTION_LEFT,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RIGHT,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  END_TURN_RECT,
  SCREEN_LOST,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WON,
  createRenderer,
  handRect,
  laneRect,
} from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : BASE_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/** The scale and offset the renderer uses to fit the 1280x720 table in the window. */
function viewTransform() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
  return {
    scale,
    offsetX: (rect.width - FIELD.width * scale) / 2,
    offsetY: (rect.height - FIELD.height * scale) / 2,
  };
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

let restarts = 0;
function makeWorld() {
  return createWorld(createRandom(seed + restarts * 7919));
}

let world = makeWorld();
let screen = SCREEN_TITLE;
let best = readBest();
let selectedHand = -1;
let handCursor = 0;
let laneCursor = 1;

function announce(message) {
  status.textContent = message;
}

function startGame() {
  restarts += 1;
  world = makeWorld();
  world.startGame();
  selectedHand = -1;
  handCursor = 0;
  laneCursor = 1;
  screen = SCREEN_PLAY;
  audio.unlock();
  audio.turn();
  announce(`Turn 1. ${world.state.player.hand.length} cards in hand, ${world.state.player.embers} ember.`);
}

function endTurn() {
  const before = world.state;
  const result = world.endTurn();
  selectedHand = -1;
  if (!result.ok) return;
  const joined = result.messages.join(' ');
  if (/strikes|destroyed|shatter/.test(joined)) audio.hit();
  else if (/restores|mends/.test(joined)) audio.heal();
  else if (/draws/.test(joined)) audio.draw();
  else audio.turn();
  if (before.phase === PHASE_WON) {
    audio.win();
    if (before.score > best) {
      best = before.score;
      saveBest(best);
    }
    screen = SCREEN_WON;
    announce(`Victory! Score ${before.score}.`);
  } else if (before.phase === PHASE_LOST) {
    audio.lose();
    screen = SCREEN_LOST;
    announce(`Defeat. Score ${before.score}.`);
  } else {
    announce(`Turn ${before.turn}. ${before.player.embers} embers.`);
  }
}

function tryPlayCard(handIndex, laneIndex) {
  const result = world.playCard(world.state.player, world.state.vizier, handIndex, laneIndex, 'You', 'the Vizier');
  if (!result.ok) {
    announce(result.reason);
    return false;
  }
  audio.playCard();
  selectedHand = -1;
  announce(result.messages.join(' '));
  return true;
}

function selectCard(handIndex) {
  const card = world.state.player.hand[handIndex];
  if (!card) return;
  if (card.cost > world.state.player.embers) {
    announce(`${card.name} costs ${card.cost} embers — you have ${world.state.player.embers}.`);
    return;
  }
  selectedHand = selectedHand === handIndex ? -1 : handIndex;
  handCursor = handIndex;
  audio.select();
}

function handleClick(click) {
  const view = viewTransform();
  const x = (click.x - view.offsetX) / view.scale;
  const y = (click.y - view.offsetY) / view.scale;
  audio.unlock();
  if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
    startGame();
    return;
  }
  if (screen === SCREEN_PAUSED) {
    screen = SCREEN_PLAY;
    return;
  }
  if (screen !== SCREEN_PLAY || world.state.phase !== PHASE_PLAY) return;
  // End Turn button.
  if (x >= END_TURN_RECT.x && x <= END_TURN_RECT.x + END_TURN_RECT.w && y >= END_TURN_RECT.y && y <= END_TURN_RECT.y + END_TURN_RECT.h) {
    endTurn();
    return;
  }
  // A picked card goes into the clicked lane.
  if (selectedHand >= 0) {
    for (let lane = 0; lane < 3; lane += 1) {
      const slot = laneRect(true, lane);
      if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
        if (tryPlayCard(selectedHand, lane)) return;
      }
    }
  }
  // Otherwise a click picks a hand card.
  const count = world.state.player.hand.length;
  for (let index = 0; index < count; index += 1) {
    const rect = handRect(index, count);
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      selectCard(index);
      return;
    }
  }
  selectedHand = -1;
}

function handleActions(input) {
  const actions = input.takeActions();
  for (const digit of input.takeDigits()) {
    if (screen === SCREEN_PLAY && world.state.phase === PHASE_PLAY) selectCard(digit);
  }
  for (const click of input.takeClicks()) handleClick(click);
  if (actions & ACTION_MUTE) {
    const muted = audio.toggleMute();
    announce(muted ? 'Muted.' : 'Sound on.');
  }
  if (actions & ACTION_PAUSE && (screen === SCREEN_PLAY || screen === SCREEN_PAUSED)) {
    screen = screen === SCREEN_PLAY ? SCREEN_PAUSED : SCREEN_PLAY;
    announce(screen === SCREEN_PAUSED ? 'Paused.' : 'Playing.');
  }
  if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
    if (actions & (ACTION_CONFIRM | ACTION_END)) startGame();
    return;
  }
  if (screen === SCREEN_PAUSED) {
    if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
    return;
  }
  if (screen !== SCREEN_PLAY || world.state.phase !== PHASE_PLAY) return;
  if (actions & ACTION_LEFT) {
    if (selectedHand >= 0) laneCursor = (laneCursor + 2) % 3;
    else handCursor = Math.max(0, handCursor - 1);
    audio.select();
  }
  if (actions & ACTION_RIGHT) {
    if (selectedHand >= 0) laneCursor = (laneCursor + 1) % 3;
    else handCursor = Math.min(world.state.player.hand.length - 1, handCursor + 1);
    audio.select();
  }
  if (actions & ACTION_CANCEL) selectedHand = -1;
  if (actions & ACTION_CONFIRM) {
    if (selectedHand >= 0) tryPlayCard(selectedHand, laneCursor);
    else selectCard(handCursor);
  }
  if (actions & ACTION_END) endTurn();
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  best = Math.max(best, scene.best);
  let painted = 0;
  // Paint enough frames for the cards to slide into their places before the
  // screenshot is taken.
  const FRAMES = 40;
  function paint() {
    renderer.draw(world.state, screen, best, { selectedHand: -1, laneCursor: 1, hoveredHand: -1 }, STEP);
    painted += 1;
    if (painted < FRAMES) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  // For the playtest: the live state, screen and actions.
  window.__cardgame = {
    get state() {
      return world.state;
    },
    get screen() {
      return screen;
    },
    startGame,
    endTurn,
  };

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions(input);
    while (accumulator >= STEP) {
      accumulator -= STEP;
    }
    renderer.draw(world.state, screen, best, { selectedHand, laneCursor, hoveredHand: -1 }, STEP);
  }

  announce('The Ember Court. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
