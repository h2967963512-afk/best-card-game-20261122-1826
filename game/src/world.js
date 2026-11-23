// The game's rules and state, with no drawing and no browser in it: the duel, the
// three lanes, embers, drawing, on-play effects, lane combat, the suit wheel and
// the Ashen Vizier's choices. Every function is pure logic over `state`, so it runs
// in tests too. All randomness comes from the seeded random passed to createWorld.
import {
  EMBER_CAP,
  EMBER_PER_TURN_CAP,
  FATIGUE_DAMAGE,
  HAND_MAX,
  LANES,
  SCORE,
  START_RESOLVE,
  VIZIER_RESOLVE,
} from './config.js';
import { advantageBonus, buildDeck, cardLabel, effectivePower } from './cards.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

/** The smallest value the Vizier will play a card for; below it, it holds the card. */
const AI_PLAY_THRESHOLD = 2.5;

function createSide(random, resolve = START_RESOLVE) {
  return {
    resolve,
    maxResolve: resolve,
    embers: 0,
    deck: buildDeck(random),
    hand: [],
    lanes: [null, null, null],
    discard: [],
  };
}

export function createWorld(random, options = {}) {
  const aiThreshold = options.aiThreshold ?? AI_PLAY_THRESHOLD;
  // Extra embers the Vizier gains each turn: the court's edge, balancing the
  // player's edge of answering the Vizier's cards with the table in view.
  const vizierEmberBonus = options.vizierEmberBonus ?? 1;
  // The Vizier's Resolve: the entrenched holder of the court holds more of it.
  const vizierResolve = options.vizierResolve ?? VIZIER_RESOLVE;
  const state = {
    phase: PHASE_TITLE,
    turn: 0,
    player: createSide(random),
    vizier: createSide(random, vizierResolve),
    log: [],
    score: 0,
    damageDealt: 0,
    cardsPlayed: 0,
    cardsDestroyed: 0,
    lanesWon: 0,
    events: [],
  };

  function say(message) {
    state.log.push(message);
    if (state.log.length > 6) state.log.shift();
  }

  function reset() {
    state.phase = PHASE_TITLE;
    state.turn = 0;
    state.player = createSide(random);
    state.vizier = createSide(random, vizierResolve);
    state.log = [];
    state.score = 0;
    state.damageDealt = 0;
    state.cardsPlayed = 0;
    state.cardsDestroyed = 0;
    state.lanesWon = 0;
    state.events = [];
  }

  /** Draw one card for a side; an empty deck costs 2 Resolve (fatigue). */
  function drawCard(side, who) {
    if (side.deck.length === 0) {
      side.resolve -= FATIGUE_DAMAGE;
      say(`${who} draws from an empty deck and loses ${FATIGUE_DAMAGE} Resolve.`);
      return null;
    }
    const card = side.deck.pop();
    if (side.hand.length >= HAND_MAX) {
      side.discard.push(card);
      say(`${who} draws ${card.name} but the hand is full — it is discarded.`);
      return card;
    }
    side.hand.push(card);
    return card;
  }

  /** Start of a side's turn: gain embers for the turn number, then draw. */
  function beginTurn(side, who, emberBonus = 0) {
    side.embers = Math.min(EMBER_CAP, side.embers + Math.min(state.turn, EMBER_PER_TURN_CAP) + emberBonus);
    drawCard(side, who);
  }

  function startGame() {
    reset();
    state.turn = 1;
    for (let index = 0; index < 3; index += 1) {
      drawCard(state.player, 'You');
      drawCard(state.vizier, 'The Vizier');
    }
    state.player.embers = 1;
    state.phase = PHASE_PLAY;
    say('Turn 1 — play a card into a lane, then end your turn.');
  }

  function canPlay(side, handIndex, laneIndex) {
    if (state.phase !== PHASE_PLAY) return { ok: false, reason: 'It is not the play phase.' };
    const card = side.hand[handIndex];
    if (!card) return { ok: false, reason: 'No card there.' };
    if (laneIndex < 0 || laneIndex >= LANES) return { ok: false, reason: 'No such lane.' };
    if (side.lanes[laneIndex]) return { ok: false, reason: 'That lane is taken.' };
    if (card.cost > side.embers) return { ok: false, reason: `${card.name} costs ${card.cost} embers.` };
    return { ok: true, card };
  }

  /** Apply a card's on-play effect; returns the messages it produced. */
  function applyEffect(side, foe, card, who, foeWho) {
    const messages = [];
    if (card.effect === 'draw1') {
      const drawn = drawCard(side, who);
      if (drawn) messages.push(`${card.name} draws ${drawn.name}.`);
    } else if (card.effect === 'heal3') {
      const healed = Math.min(side.maxResolve - side.resolve, 3);
      side.resolve += healed;
      messages.push(`${card.name} restores ${healed} Resolve.`);
    } else if (card.effect === 'damage2') {
      foe.resolve -= 2;
      if (side === state.player) {
        state.damageDealt += 2;
        state.score += 2 * SCORE.damage;
      }
      messages.push(`${card.name} strikes ${foeWho} for 2 damage.`);
    } else if (card.effect === 'embers2') {
      side.embers = Math.min(EMBER_CAP, side.embers + 2);
      messages.push(`${card.name} kindles 2 embers.`);
    }
    return messages;
  }

  /**
   * Play a card from a side's hand into one of its lanes. `who` is the side's name
   * for the log. Returns { ok, reason?, messages }.
   */
  function playCard(side, foe, handIndex, laneIndex, who, foeWho) {
    const check = canPlay(side, handIndex, laneIndex);
    if (!check.ok) return { ok: false, reason: check.reason, messages: [] };
    const card = check.card;
    side.hand.splice(handIndex, 1);
    side.embers -= card.cost;
    side.lanes[laneIndex] = card;
    if (side === state.player) state.cardsPlayed += 1;
    const messages = [`${who} plays ${cardLabel(card)} in lane ${laneIndex + 1}.`];
    messages.push(...applyEffect(side, foe, card, who, foeWho));
    for (const message of messages) say(message);
    return { ok: true, messages };
  }

  /** How much the Vizier (or any side) likes playing `card` into `lane`. */
  function evaluatePlay(side, foe, card, lane) {
    const enemy = foe.lanes[lane];
    let value = card.power;
    if (enemy) {
      const mine = effectivePower(card, enemy);
      const theirs = effectivePower(enemy, card);
      if (mine > theirs) value += 3;
      else if (mine === theirs) value += 1;
      else value -= 2;
      value += advantageBonus(card.suit, enemy.suit) * 0.5;
    } else {
      value += card.power * 0.8;
    }
    if (card.effect === 'draw1') value += 2;
    if (card.effect === 'heal3') value += (side.maxResolve - side.resolve) / 8;
    if (card.effect === 'damage2') value += 2;
    if (card.effect === 'embers2') value += 1.5;
    if (card.effect === 'heal2onwin') value += 1;
    value -= card.cost * 0.4;
    value += random() * 1.5;
    return value;
  }

  /** The best (handIndex, lane) a side can play right now, or null when it should hold. */
  function bestPlay(side, foe, threshold) {
    let best = null;
    let bestValue = threshold;
    for (let handIndex = 0; handIndex < side.hand.length; handIndex += 1) {
      const card = side.hand[handIndex];
      if (card.cost > side.embers) continue;
      for (let lane = 0; lane < LANES; lane += 1) {
        if (side.lanes[lane]) continue;
        const value = evaluatePlay(side, foe, card, lane);
        if (value > bestValue) {
          bestValue = value;
          best = { handIndex, lane };
        }
      }
    }
    return best;
  }

  /** The Vizier plays its cards, one after another, until nothing is worth playing. */
  function aiPlay() {
    const played = [];
    for (;;) {
      const move = bestPlay(state.vizier, state.player, aiThreshold);
      if (!move) break;
      const result = playCard(state.vizier, state.player, move.handIndex, move.lane, 'The Vizier', 'you');
      if (!result.ok) break;
      played.push(result.messages[0]);
    }
    return played;
  }

  /** One lane fights. Returns the messages the fight produced. */
  function fightLane(lane) {
    const messages = [];
    const mine = state.player.lanes[lane];
    const theirs = state.vizier.lanes[lane];
    if (!mine && !theirs) return messages;
    if (mine && !theirs) {
      state.vizier.resolve -= mine.power;
      state.damageDealt += mine.power;
      state.score += mine.power * SCORE.damage;
      messages.push(`${cardLabel(mine)} strikes the Vizier for ${mine.power}.`);
      state.player.discard.push(mine);
      state.player.lanes[lane] = null;
      return messages;
    }
    if (theirs && !mine) {
      state.player.resolve -= theirs.power;
      messages.push(`${cardLabel(theirs)} strikes you for ${theirs.power}.`);
      state.vizier.discard.push(theirs);
      state.vizier.lanes[lane] = null;
      return messages;
    }
    const myPower = effectivePower(mine, theirs);
    const theirPower = effectivePower(theirs, mine);
    messages.push(`${cardLabel(mine)} meets ${cardLabel(theirs)} in lane ${lane + 1}.`);
    // The margin is what a card keeps: a card survives when its effective power
    // tops the enemy's, so the suit advantage decides close fights instead of
    // both cards shattering whenever their base powers match.
    mine.power = myPower - theirPower;
    theirs.power = theirPower - myPower;
    if (mine.power <= 0 && theirs.power <= 0) {
      messages.push('Both cards shatter.');
      state.player.discard.push(mine);
      state.vizier.discard.push(theirs);
      state.player.lanes[lane] = null;
      state.vizier.lanes[lane] = null;
      return messages;
    }
    if (mine.power <= 0) {
      messages.push(`${mine.name} is destroyed.`);
      state.player.discard.push(mine);
      state.player.lanes[lane] = null;
      state.cardsDestroyed += 1;
      state.score += SCORE.destroy;
      if (theirs.effect === 'heal2onwin') {
        const healed = Math.min(state.vizier.maxResolve - state.vizier.resolve, 2);
        state.vizier.resolve += healed;
        messages.push(`Tide Warden mends the Vizier for ${healed}.`);
      }
      return messages;
    }
    if (theirs.power <= 0) {
      messages.push(`${theirs.name} is destroyed.`);
      state.vizier.discard.push(theirs);
      state.vizier.lanes[lane] = null;
      state.cardsDestroyed += 1;
      state.score += SCORE.destroy + SCORE.laneWin;
      state.lanesWon += 1;
      if (mine.effect === 'heal2onwin') {
        const healed = Math.min(state.player.maxResolve - state.player.resolve, 2);
        state.player.resolve += healed;
        messages.push(`Tide Warden mends you for ${healed}.`);
      }
      return messages;
    }
    messages.push(`Both hold: ${mine.name} ${mine.power}, ${theirs.name} ${theirs.power}.`);
    return messages;
  }

  function checkEnd() {
    if (state.vizier.resolve <= 0 && state.player.resolve <= 0) {
      state.phase = PHASE_WON;
      say('Both fall — the court favours the challenger. You win!');
    } else if (state.vizier.resolve <= 0) {
      state.phase = PHASE_WON;
      say('The Vizier bows. The Ember Court is yours!');
    } else if (state.player.resolve <= 0) {
      state.phase = PHASE_LOST;
      say('Your Resolve breaks. The Vizier keeps the court.');
    }
  }

  /**
   * End the player's turn: the lanes fight, and the next turn begins — the Vizier
   * plays first, so the player answers its cards with the whole table in view,
   * then plays and ends the turn to fight again. Returns every message the turn
   * produced.
   */
  function endTurn() {
    if (state.phase !== PHASE_PLAY) return { ok: false, reason: 'It is not the play phase.', messages: [] };
    const messages = [];
    for (let lane = 0; lane < LANES; lane += 1) messages.push(...fightLane(lane));
    checkEnd();
    if (state.phase !== PHASE_PLAY) {
      state.events = messages;
      return { ok: true, messages };
    }
    state.turn += 1;
    beginTurn(state.player, 'You');
    beginTurn(state.vizier, 'The Vizier', vizierEmberBonus);
    checkEnd();
    if (state.phase === PHASE_PLAY) {
      messages.push(...aiPlay());
      say(`Turn ${state.turn} — ${state.player.embers} embers, draw a card.`);
    }
    state.events = messages;
    return { ok: true, messages };
  }

  return {
    state,
    reset,
    startGame,
    drawCard,
    canPlay,
    playCard,
    bestPlay,
    aiPlay,
    endTurn,
    checkEnd,
    fightLane,
  };
}
