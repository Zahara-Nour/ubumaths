import { describe, it, expect } from 'vitest';
import { rulerPosition, compassPosition, applyPosition } from '../positioning';
import { createDefaultInstrumentState } from '../../types';

describe('positioning — rulerPosition', () => {
	it('horizontal segment: rotation=0', () => {
		const pos = rulerPosition({ x: 0, y: 0 }, { x: 10, y: 0 });
		expect(pos.x).toBe(0);
		expect(pos.y).toBe(0);
		expect(pos.rotation).toBeCloseTo(0);
		expect(pos.visible).toBe(true);
	});

	it('vertical segment: rotation=90', () => {
		const pos = rulerPosition({ x: 0, y: 0 }, { x: 0, y: 10 });
		expect(pos.rotation).toBeCloseTo(90);
	});

	it('diagonal segment: rotation=45', () => {
		const pos = rulerPosition({ x: 0, y: 0 }, { x: 10, y: 10 });
		expect(pos.rotation).toBeCloseTo(45);
	});

	it('places ruler at p1', () => {
		const pos = rulerPosition({ x: 5, y: 3 }, { x: 10, y: 8 });
		expect(pos.x).toBe(5);
		expect(pos.y).toBe(3);
	});
});

describe('positioning — compassPosition', () => {
	it('positions at center with radius', () => {
		const pos = compassPosition({ x: 5, y: 3 }, 42);
		expect(pos.x).toBe(5);
		expect(pos.y).toBe(3);
		expect(pos.compassRadius).toBe(42);
		expect(pos.visible).toBe(true);
	});
});

describe('positioning — applyPosition', () => {
	it('creates new state from partial when no current', () => {
		const result = applyPosition(undefined, { x: 10, y: 20, visible: true });
		expect(result.type).toBe('ruler');
		expect(result.x).toBe(10);
		expect(result.y).toBe(20);
		expect(result.visible).toBe(true);
	});

	it('merges partial into existing state', () => {
		const current = createDefaultInstrumentState('compass');
		const result = applyPosition(current, { x: 5, compassRadius: 50, visible: true });
		expect(result.type).toBe('compass');
		expect(result.x).toBe(5);
		expect(result.y).toBe(0); // unchanged
		expect(result.compassRadius).toBe(50);
		expect(result.visible).toBe(true);
	});

	it('preserves type from current state', () => {
		const current = createDefaultInstrumentState('protractor');
		const result = applyPosition(current, { x: 1 });
		expect(result.type).toBe('protractor');
	});
});
