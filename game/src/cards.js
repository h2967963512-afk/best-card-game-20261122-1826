// Cards and decks: what a card is, the suit wheel, and building a shuffled deck
// from the card definitions in config.js. No drawing and no browser in here, so
// the deck logic runs in tests too.
import { ADVANTAGE_BONUS, CARD_DEFS, DECK_SIZE, SUITS } from './config.js';

let nextUid = 1;

/** Make one card from a definition. `power` is its current power; it falls as the card takes hits. */
export function createCard(def) {
  return {
    uid: nextUid,
    defId: def.id,
    name: def.name,
    suit: def.suit,
    cost: def.cost,
    power: def.power,
    basePower: def.power,
    effect: def.effect,
    text: def.text,
  };
}

/** +2 when the attacker's suit beats the defender's suit on the wheel, else 0. */
export function advantageBonus(attackerSuit, defenderSuit) {
  if (!defenderSuit) return 0;
  return SUITS[attackerSuit].beats === defenderSuit ? ADVANTAGE_BONUS : 0;
}

/** The power a card fights with against the card across from it. */
export function effectivePower(card, foeCard) {
  if (!card) return 0;
  return card.power + advantageBonus(card.suit, foeCard ? foeCard.suit : null);
}

/** Build a fresh 24-card deck and shuffle it with the seeded random. */
export function buildDeck(random) {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let index = 0; index < def.copies; index += 1) {
      deck.push(createCard(def));
      nextUid += 1;
    }
  }
  if (deck.length !== DECK_SIZE) throw new Error(`deck is ${deck.length} cards, expected ${DECK_SIZE}`);
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = deck[index];
    deck[index] = deck[other];
    deck[other] = held;
  }
  return deck;
}

/** A short label for a card, for the event log. */
export function cardLabel(card) {
  return `${card.name} (${SUITS[card.suit].name} ${card.power})`;
}
