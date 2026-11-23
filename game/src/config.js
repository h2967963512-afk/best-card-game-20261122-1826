// Every tuning number, colour and card in one place. The table is a fixed 1280x720
// logical area; the renderer scales it to the window, so no rule below depends on
// the screen size.
//
// THE EMBER COURT — an original duel card game. You, the Ember Duelist, face the
// Ashen Vizier across a table of three lanes. Each turn the Vizier plays first,
// then you gain embers, draw a card, and answer its cards from your hand. When
// you end your turn the lanes fight: a card strikes the card across from it,
// the stronger survives with its power reduced by what it took, and a card with
// no enemy across from it strikes the enemy's Resolve directly and is spent.
// Suits beat each other in a wheel — Ember burns Thorn, Thorn drinks Tide, Tide
// drowns Ember — and a card with the advantage fights at +2 power. First to
// bring the other's Resolve to 0 wins the court.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Resolve (life) each duelist starts with. */
export const START_RESOLVE = 30;

/** Resolve the Ashen Vizier starts with: the entrenched holder of the court holds more. */
export const VIZIER_RESOLVE = 36;

/** Embers (mana) gained at the start of a turn: the turn number, capped here. */
export const EMBER_PER_TURN_CAP = 8;

/** Embers a duelist can hold at most. */
export const EMBER_CAP = 10;

/** Cards a hand can hold; a draw past this is discarded. */
export const HAND_MAX = 7;

/** Cards in each duelist's deck. */
export const DECK_SIZE = 24;

/** Lanes across the table. */
export const LANES = 3;

/** Damage taken when drawing from an empty deck. */
export const FATIGUE_DAMAGE = 2;

/** How far the advantage swings a lane fight. */
export const ADVANTAGE_BONUS = 2;

/** The seed every fresh visit starts from; each "Play again" in a visit steps it on. */
export const BASE_SEED = 1826;

/** The three suits, their colours, and the wheel: each beats the next one. */
export const SUITS = {
  ember: { name: 'Ember', color: '#e5533d', light: '#ff8a5c', dark: '#8f1d12', beats: 'thorn' },
  tide: { name: 'Tide', color: '#3d8be5', light: '#6fb3ff', dark: '#123f7a', beats: 'ember' },
  thorn: { name: 'Thorn', color: '#4da34d', light: '#7cc47c', dark: '#1d5c22', beats: 'tide' },
};

/**
 * The deck's card types: [id, name, suit, cost, power, effect, copies, effect text].
 * Effects: '' (none), 'draw1' (draw a card when played), 'heal3' (restore 3 Resolve
 * when played), 'damage2' (deal 2 damage to the enemy's Resolve when played),
 * 'embers2' (gain 2 embers when played), 'heal2onwin' (restore 2 Resolve when this
 * card destroys an enemy card in a lane fight).
 */
export const CARD_DEFS = [
  { id: 'cinder_imp', name: 'Cinder Imp', suit: 'ember', cost: 1, power: 2, effect: '', copies: 3, text: '' },
  { id: 'ember_blade', name: 'Ember Blade', suit: 'ember', cost: 2, power: 4, effect: '', copies: 3, text: '' },
  { id: 'phoenix_pyre', name: 'Phoenix Pyre', suit: 'ember', cost: 5, power: 8, effect: 'draw1', copies: 2, text: 'Draw a card.' },
  { id: 'tide_warden', name: 'Tide Warden', suit: 'tide', cost: 2, power: 3, effect: 'heal2onwin', copies: 3, text: 'Heal 2 when it wins a lane.' },
  { id: 'tidecaller', name: 'Tidecaller', suit: 'tide', cost: 3, power: 3, effect: 'heal3', copies: 3, text: 'Restore 3 Resolve.' },
  { id: 'deep_current', name: 'Deep Current', suit: 'tide', cost: 4, power: 5, effect: 'draw1', copies: 2, text: 'Draw a card.' },
  { id: 'thorn_seedling', name: 'Thorn Seedling', suit: 'thorn', cost: 1, power: 1, effect: 'embers2', copies: 3, text: 'Gain 2 embers.' },
  { id: 'thornwhip', name: 'Thornwhip', suit: 'thorn', cost: 2, power: 3, effect: 'damage2', copies: 3, text: 'Deal 2 damage to the Vizier.' },
  { id: 'galehawk', name: 'Galehawk', suit: 'thorn', cost: 4, power: 6, effect: '', copies: 2, text: '' },
];

/** Score for dealing damage, destroying a card, and winning a lane. */
export const SCORE = { damage: 1, destroy: 5, laneWin: 2 };

export const PALETTE = {
  backdrop: '#171310',
  felt: '#1e4d2e',
  feltDark: '#173d24',
  feltLight: '#27603a',
  tableEdge: '#6b4a1f',
  tableTrim: '#c9a227',
  panel: '#241d18',
  panelEdge: '#4a3a28',
  text: '#f4ead6',
  muted: '#b8a98c',
  gold: '#e8b93c',
  ember: '#ff7a3c',
  player: '#e8b93c',
  vizier: '#9a7bd6',
  danger: '#e5533d',
  heal: '#7cc47c',
  button: '#7a5a1e',
  buttonEdge: '#c9a227',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const UI_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'ember-court.best';
