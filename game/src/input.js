// Keyboard and pointer input. One-shot presses (confirm, cancel, end turn, pause,
// mute, move the cursor) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Number keys pick
// a card from the hand; clicks are queued with their canvas coordinates for the
// main loop to hit-test.
export const ACTION_CONFIRM = 1;
export const ACTION_CANCEL = 2;
export const ACTION_END = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;
export const ACTION_LEFT = 32;
export const ACTION_RIGHT = 64;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const END = new Set(['Space']);
const CANCEL = new Set(['Escape']);
const PAUSE = new Set(['KeyP']);
const MUTE = new Set(['KeyM']);
const DIGITS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);

export function createInput(target) {
  let actions = 0;
  const digits = [];
  const clicks = [];

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) actions |= ACTION_LEFT;
    else if (RIGHT.has(event.code)) actions |= ACTION_RIGHT;
    else if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (END.has(event.code)) actions |= ACTION_END;
    else if (CANCEL.has(event.code)) actions |= ACTION_CANCEL;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (DIGITS.has(event.code)) digits.push(Number(event.code.slice(5)) - 1);
    else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: there are no held
  // keys here, so nothing to let go of on blur.
  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    clicks.push({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Hand indexes picked with the number keys since the last call. */
    takeDigits() {
      return digits.splice(0, digits.length);
    },
    /** Canvas clicks since the last call, in CSS pixels. */
    takeClicks() {
      return clicks.splice(0, clicks.length);
    },
  };
}
