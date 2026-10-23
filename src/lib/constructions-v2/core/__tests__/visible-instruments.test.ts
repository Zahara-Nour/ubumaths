/**
 * Instruments affichés par le canevas selon l'avancement de l'animation
 * (`visibleInstruments`, `render-helpers.ts`).
 */

import { describe, it, expect } from 'vitest';
import { visibleInstruments } from '../render-helpers';
import type { InstrumentMove, InstrumentState, InstrumentType } from '../../types';

function state(type: InstrumentType): InstrumentState {
	return { type, visible: true, x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
}

const MOVE: InstrumentMove = { fromX: 0, fromY: 0, fromRotation: 0, toX: 1, toY: 1, toRotation: 0 };

function types(list: InstrumentState[]): InstrumentType[] {
	return list.map((s) => s.type);
}

describe('visibleInstruments', () => {
	const states = [state('ruler'), state('pencil')];

	it('règle + crayon qui trace : crayon caché pendant le déplacement de la règle', () => {
		const animation = {
			drawProgress: 0,
			autoInstruments: new Set<InstrumentType>(['ruler', 'pencil']),
			instrumentMoves: new Map([['ruler' as InstrumentType, MOVE]])
		};
		expect(types(visibleInstruments(states, animation, 0))).toEqual(['ruler']);
	});

	it('crayon instrument principal qui se déplace : visible pendant le déplacement', () => {
		const animation = {
			drawProgress: 0,
			autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
			instrumentMoves: new Map([['pencil' as InstrumentType, MOVE]])
		};
		expect(types(visibleInstruments(states, animation, 0))).toEqual(['ruler', 'pencil']);
	});

	it('animation finie : instruments automatiques cachés', () => {
		const animation = {
			drawProgress: 1,
			autoInstruments: new Set<InstrumentType>(['pencil', 'ruler']),
			instrumentMoves: new Map([['pencil' as InstrumentType, MOVE]])
		};
		expect(visibleInstruments(states, animation, 1)).toEqual([]);
	});

	it('instrument non visible : jamais affiché', () => {
		expect(
			types(visibleInstruments([{ ...state('compass'), visible: false }], undefined, 0))
		).toEqual([]);
	});
});
