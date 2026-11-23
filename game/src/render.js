// Canvas drawing: the green baize table, the two hands, the three lanes, the
// cards with their suits, costs and power, the Resolve and ember totals, and the
// title / pause / win / loss screens. Cards ease toward their places, so a play
// slides across the table. All geometry lives here, so the main loop hit-tests
// with the same rectangles the renderer draws.
import { FIELD, FONT, LANES, PALETTE, SUITS, UI_FONT } from './config.js';
import { advantageBonus } from './cards.js';
import { PHASE_PLAY } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const LANE_CENTERS = [430, 640, 850];
const LANE_W = 124;
const LANE_H = 156;
const VIZIER_LANE_Y = 148;
const PLAYER_LANE_Y = 348;
const HAND_CARD_W = 104;
const HAND_CARD_H = 142;
const HAND_Y = 530;
const TABLE_CARD_W = 108;
const TABLE_CARD_H = 148;

export const END_TURN_RECT = { x: 1064, y: 596, w: 200, h: 64 };

/** The rectangle of the player's hand card at `index` of `count` cards. */
export function handRect(index, count) {
  const step = count <= 1 ? 0 : Math.min(112, 780 / count);
  const total = HAND_CARD_W + step * (count - 1);
  const x = (FIELD.width - total) / 2 + index * step;
  return { x, y: HAND_Y, w: HAND_CARD_W, h: HAND_CARD_H };
}

/** The rectangle of a lane slot on the player's side (true) or the Vizier's. */
export function laneRect(playerSide, lane) {
  return {
    x: LANE_CENTERS[lane] - LANE_W / 2,
    y: playerSide ? PLAYER_LANE_Y : VIZIER_LANE_Y,
    w: LANE_W,
    h: LANE_H,
  };
}

/** The rectangle of one of the Vizier's face-down hand cards. */
export function vizierHandRect(index, count) {
  const step = 48;
  const total = 56 + step * (count - 1);
  const x = (FIELD.width - total) / 2 + index * step;
  return { x, y: 56, w: 56, h: 78 };
}

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawFlame(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.bezierCurveTo(16, 7, 21, 10, 21, 16);
  ctx.bezierCurveTo(21, 21, 17, 23, 12, 23);
  ctx.bezierCurveTo(7, 23, 3, 21, 3, 16);
  ctx.bezierCurveTo(3, 12, 6, 10, 8, 7);
  ctx.bezierCurveTo(9, 9, 10, 10, 11, 9);
  ctx.bezierCurveTo(11, 6, 11, 3, 12, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDroplet(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.bezierCurveTo(19, 10, 21, 14, 21, 17);
  ctx.bezierCurveTo(21, 21, 17, 23, 12, 23);
  ctx.bezierCurveTo(7, 23, 3, 21, 3, 17);
  ctx.bezierCurveTo(3, 14, 5, 10, 12, 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLeaf(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(12, 2);
  ctx.bezierCurveTo(20, 6, 22, 14, 18, 20);
  ctx.bezierCurveTo(12, 23, 5, 19, 4, 11);
  ctx.bezierCurveTo(4, 6, 8, 3, 12, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(12, 4);
  ctx.quadraticCurveTo(12, 13, 11, 21);
  ctx.stroke();
  ctx.restore();
}

/** Draw a suit's glyph at (x, y), centred, at the given size. */
export function drawSuitGlyph(ctx, suit, x, y, size, color) {
  if (suit === 'ember') drawFlame(ctx, x - size / 2, y - size / 2, size, color);
  else if (suit === 'tide') drawDroplet(ctx, x - size / 2, y - size / 2, size, color);
  else drawLeaf(ctx, x - size / 2, y - size / 2, size, color);
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(10, 18);
  ctx.bezierCurveTo(2, 11, 0, 6, 3, 3);
  ctx.bezierCurveTo(6, 0, 9, 2, 10, 5);
  ctx.bezierCurveTo(11, 2, 14, 0, 17, 3);
  ctx.bezierCurveTo(20, 6, 18, 11, 10, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGem(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -size / 2);
  ctx.lineTo(size / 2, 0);
  ctx.lineTo(0, size / 2);
  ctx.lineTo(-size / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const positions = new Map();

  function cardTarget(card, rect) {
    const stored = positions.get(card.uid);
    if (!stored) {
      const fresh = { x: rect.x, y: rect.y + 260 };
      positions.set(card.uid, fresh);
      return fresh;
    }
    return stored;
  }

  function easeToward(card, rect, dt) {
    const pos = cardTarget(card, rect);
    const rate = Math.min(1, dt * 9);
    pos.x += (rect.x - pos.x) * rate;
    pos.y += (rect.y - pos.y) * rate;
    return pos;
  }

  function drawCardFace(card, x, y, w, h, options) {
    const suit = SUITS[card.suit];
    const selected = options && options.selected;
    const dim = options && options.dim;
    const advantage = options && options.advantage;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.55;
    roundRect(ctx, x, y, w, h, 9);
    ctx.fillStyle = '#f7ecd2';
    ctx.fill();
    ctx.lineWidth = selected ? 4 : 2.5;
    ctx.strokeStyle = selected ? PALETTE.gold : suit.color;
    ctx.stroke();
    // Suit band.
    ctx.save();
    roundRect(ctx, x + 3, y + 3, w - 6, 30, 6);
    ctx.fillStyle = suit.color;
    ctx.fill();
    ctx.restore();
    drawSuitGlyph(ctx, card.suit, x + 18, y + 18, 18, '#fff');
    ctx.fillStyle = '#fff';
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(suit.name.toUpperCase(), x + 30, y + 19);
    // Name, clear of the cost gem above it.
    ctx.fillStyle = '#241d18';
    ctx.font = `bold ${w > 90 ? 14 : 12}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(card.name, x + w / 2, y + 66, w - 10);
    // Large faint glyph.
    ctx.globalAlpha = dim ? 0.1 : 0.16;
    drawSuitGlyph(ctx, card.suit, x + w / 2, y + 90, 32, suit.color);
    ctx.globalAlpha = dim ? 0.55 : 1;
    // Effect text, in the middle band above the power badge.
    if (card.text) {
      ctx.fillStyle = '#4a3a28';
      ctx.font = `italic 10px ${UI_FONT}`;
      ctx.textAlign = 'center';
      wrapText(card.text, x + w / 2, y + 110, w - 18, 13);
    }
    // Cost gem, top-left.
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.arc(x + 14, y + 44, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(card.cost), x + 14, y + 45);
    // Power, bottom-right, clear of the effect text above it.
    ctx.fillStyle = '#c22f1e';
    ctx.beginPath();
    ctx.arc(x + w - 13, y + h - 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 14px ${UI_FONT}`;
    ctx.fillText(String(card.power), x + w - 13, y + h - 12);
    // Advantage badge.
    if (advantage) {
      ctx.fillStyle = PALETTE.gold;
      roundRect(ctx, x + w - 46, y - 12, 46, 20, 9);
      ctx.fill();
      ctx.fillStyle = '#241d18';
      ctx.font = `bold 12px ${UI_FONT}`;
      ctx.fillText('▲ +2', x + w - 23, y - 1);
    }
    ctx.restore();
  }

  function wrapText(text, cx, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (let index = 0; index < lines.length; index += 1) {
      ctx.fillText(lines[index], cx, y + index * lineHeight);
    }
  }

  function drawCardBack(x, y, w, h) {
    roundRect(ctx, x, y, w, h, 7);
    ctx.fillStyle = '#3a2a5e';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.gold;
    ctx.stroke();
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 5);
    ctx.strokeStyle = 'rgba(232,185,60,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawFlame(ctx, x + w / 2 - 10, y + h / 2 - 12, 20, PALETTE.gold);
  }

  function drawResolveBar(x, y, label, resolve, maxResolve, color) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${UI_FONT}`;
    ctx.fillText(label, x, y);
    drawHeart(ctx, x + 132, y - 8, 16, '#e5533d');
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${UI_FONT}`;
    ctx.fillText(`${Math.max(0, resolve)} / ${maxResolve}`, x + 152, y);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, x, y + 14, 170, 10, 5);
    ctx.fill();
    ctx.fillStyle = color;
    const fraction = Math.max(0, Math.min(1, resolve / maxResolve));
    roundRect(ctx, x, y + 14, 170 * fraction, 10, 5);
    ctx.fill();
  }

  function drawEmbers(x, y, embers) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 13px ${UI_FONT}`;
    ctx.fillText('EMBERS', x, y);
    for (let index = 0; index < 10; index += 1) {
      drawGem(ctx, x + 70 + index * 18, y, 13, index < embers ? '#ff7a3c' : 'rgba(255,255,255,0.14)');
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${UI_FONT}`;
    ctx.fillText(`${embers}`, x + 70 + 10 * 18 + 6, y);
  }

  function drawTable(state, screen, ui, dt) {
    // Felt and trim.
    ctx.fillStyle = PALETTE.felt;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.tableTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, FIELD.width - 20, FIELD.height - 20);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.ellipse(640, 330, 560, 250, 0, 0, Math.PI * 2);
    ctx.fill();

    // Vizier info and hand.
    drawResolveBar(24, 66, 'ASHEN VIZIER', state.vizier.resolve, state.vizier.maxResolve, PALETTE.vizier);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Deck ${state.vizier.deck.length} · Hand ${state.vizier.hand.length}`, 24, 100);
    for (let index = 0; index < state.vizier.hand.length; index += 1) {
      const rect = vizierHandRect(index, state.vizier.hand.length);
      drawCardBack(rect.x, rect.y, rect.w, rect.h);
    }

    // Lane slots and table cards.
    for (let lane = 0; lane < LANES; lane += 1) {
      for (const playerSide of [false, true]) {
        const slot = laneRect(playerSide, lane);
        ctx.save();
        roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 10);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,185,60,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      // Lane numbers just left of each slot, clear of the log line.
      ctx.fillStyle = 'rgba(244,234,214,0.5)';
      ctx.font = `bold 13px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(lane + 1), LANE_CENTERS[lane] - LANE_W / 2 - 16, VIZIER_LANE_Y + LANE_H / 2);
      ctx.fillText(String(lane + 1), LANE_CENTERS[lane] - LANE_W / 2 - 16, PLAYER_LANE_Y + LANE_H / 2);
    }
    for (let lane = 0; lane < LANES; lane += 1) {
      const vizierCard = state.vizier.lanes[lane];
      const playerCard = state.player.lanes[lane];
      if (vizierCard) {
        const slot = laneRect(false, lane);
        const rect = { x: slot.x + 8, y: slot.y + 4, w: TABLE_CARD_W, h: TABLE_CARD_H };
        const pos = easeToward(vizierCard, rect, dt);
        drawCardFace(vizierCard, pos.x, pos.y, rect.w, rect.h, {
          advantage: playerCard ? advantageBonus(vizierCard.suit, playerCard.suit) > 0 : false,
        });
      }
      if (playerCard) {
        const slot = laneRect(true, lane);
        const rect = { x: slot.x + 8, y: slot.y + 4, w: TABLE_CARD_W, h: TABLE_CARD_H };
        const pos = easeToward(playerCard, rect, dt);
        drawCardFace(playerCard, pos.x, pos.y, rect.w, rect.h, {
          advantage: vizierCard ? advantageBonus(playerCard.suit, vizierCard.suit) > 0 : false,
        });
      }
    }

    // Event log, on the play screen only: the overlays cover this band elsewhere.
    if (screen === SCREEN_PLAY) {
      const last = state.log[state.log.length - 1] || '';
      ctx.fillStyle = PALETTE.text;
      ctx.font = `italic 14px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(last, FIELD.width / 2, 330);
    }

    // Player info, embers, and hand.
    drawResolveBar(24, 566, 'YOU', state.player.resolve, state.player.maxResolve, PALETTE.player);
    drawEmbers(24, 606, state.player.embers);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`Deck ${state.player.deck.length} · Discard ${state.player.discard.length}`, 24, 636);
    const count = state.player.hand.length;
    for (let index = 0; index < count; index += 1) {
      const card = state.player.hand[index];
      const rect = handRect(index, count);
      const raised = ui.selectedHand === index;
      const target = raised ? { ...rect, y: rect.y - 26 } : rect;
      const pos = easeToward(card, target, dt);
      const affordable = card.cost <= state.player.embers && state.phase === PHASE_PLAY;
      drawCardFace(card, pos.x, pos.y, rect.w, rect.h, {
        selected: raised,
        dim: !affordable,
      });
      if (ui.hoveredHand === index) {
        ctx.save();
        roundRect(ctx, pos.x, pos.y, rect.w, rect.h, 9);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Lane cursor when a card is picked.
    if (ui.selectedHand >= 0 && state.phase === PHASE_PLAY) {
      const slot = laneRect(true, ui.laneCursor);
      ctx.save();
      roundRect(ctx, slot.x - 4, slot.y - 4, slot.w + 8, slot.h + 8, 12);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.stroke();
      ctx.restore();
    }

    // End Turn button.
    ctx.save();
    roundRect(ctx, END_TURN_RECT.x, END_TURN_RECT.y, END_TURN_RECT.w, END_TURN_RECT.h, 10);
    ctx.fillStyle = state.phase === PHASE_PLAY ? PALETTE.button : 'rgba(122,90,30,0.4)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.buttonEdge;
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 18px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.phase === PHASE_PLAY ? 'END TURN' : '—', END_TURN_RECT.x + END_TURN_RECT.w / 2, END_TURN_RECT.y + END_TURN_RECT.h / 2 + 1);
    ctx.restore();

    // Turn and score, top centre.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`TURN ${Math.max(1, state.turn)}`, FIELD.width / 2, 26);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 15px ${UI_FONT}`;
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, 46);

    // Help line.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('1–7 pick a card · ← → choose a lane · Enter play · Space end turn · P pause · M mute', FIELD.width / 2, 700);
  }

  function drawOverlay(title, lines, accent) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(ctx, 340, 150, 600, 420, 16);
    ctx.fillStyle = PALETTE.panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.tableTrim;
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = `bold 52px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 640, 210);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${UI_FONT}`;
    let y = 280;
    for (const line of lines) {
      ctx.fillText(line, 640, y);
      y += 30;
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${UI_FONT}`;
    ctx.fillText('Press Enter or click to play again', 640, 520);
    ctx.restore();
  }

  function drawTitle(state, best) {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 64px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THE EMBER COURT', 640, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText('A duel of cards across three lanes', 640, 200);
    // Suit wheel.
    const suits = ['ember', 'tide', 'thorn'];
    for (let index = 0; index < 3; index += 1) {
      const x = 490 + index * 150;
      drawSuitGlyph(ctx, suits[index], x, 268, 40, SUITS[suits[index]].color);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `bold 15px ${UI_FONT}`;
      ctx.fillText(SUITS[suits[index]].name, x, 306);
    }
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${UI_FONT}`;
    ctx.fillText('Ember burns Thorn · Thorn drinks Tide · Tide drowns Ember · advantage fights at +2', 640, 340);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${UI_FONT}`;
    ctx.fillText('The Vizier plays first each turn — answer its cards, then end your turn and the lanes fight.', 640, 386);
    ctx.fillText('A card with no enemy across from it strikes the Vizier directly. First to 0 Resolve wins.', 640, 414);
    if (best > 0) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 16px ${UI_FONT}`;
      ctx.fillText(`Best score: ${best}`, 640, 462);
    }
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${UI_FONT}`;
    ctx.fillText('Press Enter or click to begin', 640, 520);
    ctx.restore();
  }

  function draw(state, screen, best, ui, dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    drawTable(state, screen, ui, dt);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['The court waits.', 'Press P or click to continue.'], PALETTE.text);
    } else if (screen === SCREEN_WON) {
      drawOverlay('VICTORY', [
        'The Ashen Vizier bows. The Ember Court is yours!',
        `Turns: ${state.turn} · Damage dealt: ${state.damageDealt} · Cards played: ${state.cardsPlayed}`,
        `Score: ${state.score}${state.score > best ? ' — a new best!' : ` · Best: ${best}`}`,
      ], PALETTE.gold);
    } else if (screen === SCREEN_LOST) {
      drawOverlay('DEFEAT', [
        'Your Resolve breaks. The Vizier keeps the court.',
        `Turns: ${state.turn} · Damage dealt: ${state.damageDealt} · Cards played: ${state.cardsPlayed}`,
        `Score: ${state.score} · Best: ${best}`,
      ], PALETTE.danger);
    }
    ctx.restore();
  }

  return { draw, canvas };
}
